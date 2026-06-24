import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlottingPengujiClient } from "@/components/plotting-penguji-client";

export default async function PlottingPengujiPage() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.isKetua) {
    redirect("/ketua-kk/dashboard");
  }

  const [records, dosenList, kkList] = await Promise.all([
    prisma.sidangRecord.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        pembimbing1: { select: { id: true, name: true, kodeDosen: true } },
        pembimbing2: { select: { id: true, name: true, kodeDosen: true } },
        penguji1: { select: { id: true, name: true, kodeDosen: true } },
        penguji2: { select: { id: true, name: true, kodeDosen: true } },
        kelompokKeahlian: { select: { id: true, nama: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kodeDosen: true },
    }),
    prisma.kelompokKeahlian.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const serializedRecords = records.map((r) => ({
    id: r.id,
    nim: r.nim,
    nama: r.nama,
    prodi: r.prodi,
    judul: r.judul,
    kelompokKeahlian: { id: r.kelompokKeahlian.id, nama: r.kelompokKeahlian.nama },
    semester: r.semester,
    pembimbing1: r.pembimbing1 ? { id: r.pembimbing1.id, name: r.pembimbing1.name, kodeDosen: r.pembimbing1.kodeDosen } : null,
    pembimbing2: r.pembimbing2 ? { id: r.pembimbing2.id, name: r.pembimbing2.name, kodeDosen: r.pembimbing2.kodeDosen } : null,
    penguji1: r.penguji1 ? { id: r.penguji1.id, name: r.penguji1.name, kodeDosen: r.penguji1.kodeDosen } : null,
    penguji2: r.penguji2 ? { id: r.penguji2.id, name: r.penguji2.name, kodeDosen: r.penguji2.kodeDosen } : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plotting Penguji</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola penugasan pembimbing dan penguji untuk sidang akhir mahasiswa.
        </p>
      </div>
      <PlottingPengujiClient records={serializedRecords} dosenList={dosenList} kkList={kkList} />
    </div>
  );
}
