import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BebanDosenSidangClient } from "@/components/beban-dosen-sidang-client";

export type KKStudentItem = {
  nim: string;
  nama: string;
  judul: string | null;
  prodi: string;
};

export type KKBreakdownItem = {
  kkId: string;
  kkNama: string;
  count: number;
  students: KKStudentItem[];
};

export type BebanDosenRow = {
  id: string;
  name: string;
  kodeDosen: string | null;
  kelompokKeahlian: string | null;
  jumlahPembimbing: number;
  jumlahPenguji: number;
  totalBeban: number;
  pembimbingByKK: KKBreakdownItem[];
  pengujiByKK: KKBreakdownItem[];
};

export default async function BebanDosenPage() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.isKetua) {
    redirect("/ketua-kk/dashboard");
  }

  // Aggregate beban from SidangRecord, grouped by originating Kelompok Keahlian
  const records = await prisma.sidangRecord.findMany({
    select: {
      nim: true,
      nama: true,
      judul: true,
      prodi: true,
      pembimbing1Id: true,
      pembimbing2Id: true,
      penguji1Id: true,
      penguji2Id: true,
      kelompokKeahlianId: true,
      kelompokKeahlian: { select: { nama: true } },
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

  // Per-dosen, per-KK breakdown maps
  type KKAccum = Map<string, { kkNama: string; students: KKStudentItem[] }>;
  const pembimbingByDosen = new Map<string, KKAccum>();
  const pengujiByDosen = new Map<string, KKAccum>();

  const addToBreakdown = (map: Map<string, KKAccum>, dosenId: string, kkId: string, kkNama: string, student: KKStudentItem) => {
    if (!map.has(dosenId)) map.set(dosenId, new Map());
    const kkMap = map.get(dosenId)!;
    if (!kkMap.has(kkId)) kkMap.set(kkId, { kkNama, students: [] });
    kkMap.get(kkId)!.students.push(student);
  };

  for (const r of records) {
    const student: KKStudentItem = { nim: r.nim, nama: r.nama, judul: r.judul, prodi: r.prodi };
    const kkId = r.kelompokKeahlianId;
    const kkNama = r.kelompokKeahlian.nama;

    if (r.pembimbing1Id) addToBreakdown(pembimbingByDosen, r.pembimbing1Id, kkId, kkNama, student);
    if (r.pembimbing2Id) addToBreakdown(pembimbingByDosen, r.pembimbing2Id, kkId, kkNama, student);
    if (r.penguji1Id) addToBreakdown(pengujiByDosen, r.penguji1Id, kkId, kkNama, student);
    if (r.penguji2Id) addToBreakdown(pengujiByDosen, r.penguji2Id, kkId, kkNama, student);
  }

  const toBreakdownArray = (kkMap: KKAccum | undefined): KKBreakdownItem[] => {
    if (!kkMap) return [];
    return [...kkMap.entries()]
      .map(([kkId, v]) => ({ kkId, kkNama: v.kkNama, count: v.students.length, students: v.students }))
      .sort((a, b) => b.count - a.count);
  };

  const rows: BebanDosenRow[] = dosenList.map((d) => {
    const pembimbingByKK = toBreakdownArray(pembimbingByDosen.get(d.id));
    const pengujiByKK = toBreakdownArray(pengujiByDosen.get(d.id));
    const jumlahPembimbing = pembimbingByKK.reduce((a, k) => a + k.count, 0);
    const jumlahPenguji = pengujiByKK.reduce((a, k) => a + k.count, 0);
    return {
      id: d.id,
      name: d.name,
      kodeDosen: d.kodeDosen,
      kelompokKeahlian: d.kelompokKeahlian?.nama ?? null,
      jumlahPembimbing,
      jumlahPenguji,
      totalBeban: jumlahPembimbing + jumlahPenguji,
      pembimbingByKK,
      pengujiByKK,
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
