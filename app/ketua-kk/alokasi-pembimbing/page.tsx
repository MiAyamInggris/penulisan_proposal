import { prisma } from "@/lib/prisma";
import { AllocateList } from "./allocate-list";

export default async function KetuaKKAlokasiPage() {
  const [enrollments, dosenList] = await Promise.all([
    prisma.classEnrollment.findMany({
      where: { isActive: true },
      include: {
        student: { select: { name: true, identifier: true } },
        class: {
          select: {
            code: true,
            program: { select: { code: true } },
          },
        },
        proposal: {
          select: {
            id: true,
            titleId: true,
            abstract: true,
            proposalUrl: true,
            supervisor1Requested: { select: { id: true, name: true } },
            supervisor2Requested: { select: { id: true, name: true } },
            supervisor1Assigned: { select: { id: true, name: true } },
            supervisor2Assigned: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ class: { program: { code: "asc" } } }, { student: { name: "asc" } }],
    }),
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: {
        id: true,
        name: true,
        maxBimbinganQuota: true,
        supervisedAsFirst: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: { id: true },
        },
        supervisedAsSecond: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const pembimbingList = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    maxBimbinganQuota: d.maxBimbinganQuota,
    bimbinganCount: d.supervisedAsFirst.length + d.supervisedAsSecond.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alokasi Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tugaskan pembimbing untuk seluruh mahasiswa — kuota ditampilkan di tiap pilihan
        </p>
      </div>
      <AllocateList enrollments={enrollments} pembimbingList={pembimbingList} />
    </div>
  );
}
