import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BebanDosenSidangClient } from "@/components/beban-dosen-sidang-client";

export type BebanDosenRow = {
  id: string;
  name: string;
  kodeDosen: string | null;
  kelompokKeahlian: string | null;
  jumlahPembimbing: number;
  jumlahPenguji: number;
  totalBeban: number;
};

export default async function BebanDosenPage() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.isKetua) {
    redirect("/ketua-kk/dashboard");
  }

  // Aggregate beban from SidangRecord
  const records = await prisma.sidangRecord.findMany({
    select: {
      pembimbing1Id: true,
      pembimbing2Id: true,
      penguji1Id: true,
      penguji2Id: true,
    },
  });

  // Collect all unique dosen IDs that appear in any SidangRecord
  const dosenIdSet = new Set<string>();
  for (const r of records) {
    if (r.pembimbing1Id) dosenIdSet.add(r.pembimbing1Id);
    if (r.pembimbing2Id) dosenIdSet.add(r.pembimbing2Id);
    if (r.penguji1Id) dosenIdSet.add(r.penguji1Id);
    if (r.penguji2Id) dosenIdSet.add(r.penguji2Id);
  }

  if (dosenIdSet.size === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beban Dosen Penguji</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan beban sidang setiap dosen berdasarkan data Plotting Penguji.
          </p>
        </div>
        <p className="text-sm text-gray-400 py-8 text-center">
          Belum ada data sidang. Import data terlebih dahulu melalui menu Plotting Penguji.
        </p>
      </div>
    );
  }

  const dosenList = await prisma.user.findMany({
    where: { id: { in: [...dosenIdSet] } },
    select: {
      id: true,
      name: true,
      kodeDosen: true,
      kelompokKeahlian: { select: { nama: true } },
    },
    orderBy: { name: "asc" },
  });

  // Compute counts per dosen
  const pembimbingCount = new Map<string, number>();
  const pengujiCount = new Map<string, number>();

  for (const r of records) {
    if (r.pembimbing1Id) pembimbingCount.set(r.pembimbing1Id, (pembimbingCount.get(r.pembimbing1Id) ?? 0) + 1);
    if (r.pembimbing2Id) pembimbingCount.set(r.pembimbing2Id, (pembimbingCount.get(r.pembimbing2Id) ?? 0) + 1);
    if (r.penguji1Id) pengujiCount.set(r.penguji1Id, (pengujiCount.get(r.penguji1Id) ?? 0) + 1);
    if (r.penguji2Id) pengujiCount.set(r.penguji2Id, (pengujiCount.get(r.penguji2Id) ?? 0) + 1);
  }

  const rows: BebanDosenRow[] = dosenList.map((d) => {
    const jumlahPembimbing = pembimbingCount.get(d.id) ?? 0;
    const jumlahPenguji = pengujiCount.get(d.id) ?? 0;
    return {
      id: d.id,
      name: d.name,
      kodeDosen: d.kodeDosen,
      kelompokKeahlian: d.kelompokKeahlian?.nama ?? null,
      jumlahPembimbing,
      jumlahPenguji,
      totalBeban: jumlahPembimbing + jumlahPenguji,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Beban Dosen Penguji</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ringkasan beban sidang (pembimbing + penguji) per dosen — independen dari kuota bimbingan.
        </p>
      </div>
      <BebanDosenSidangClient rows={rows} />
    </div>
  );
}
