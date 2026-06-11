import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyKK } from "@/lib/kk";
import { countUniqueStudents } from "@/lib/quota";
import { MissingPembimbingTabs } from "@/components/missing-pembimbing-tabs";
import { AlertCircle } from "lucide-react";

export default async function MahasiswaBelumPembimbingPage() {
  const session = await auth();
  const myKK = await getMyKK(session!.user.id);

  if (!myKK) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Mahasiswa Belum Memiliki Pembimbing</h1>
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Anda belum ditugaskan ke Kelompok Keahlian</p>
            <p className="text-sm mt-1">Hubungi Admin untuk mendapatkan penugasan KK.</p>
          </div>
        </div>
      </div>
    );
  }

  const [activeClassProposals, importedTAProposals, dosenList, globalQuota] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        supervisor1AssignedId: null,
        historicalImportSource: null,
        enrollment: { isActive: true, class: { isSystemClass: false } },
      },
      select: {
        id: true,
        status: true,
        enrollment: {
          select: {
            student: { select: { name: true, identifier: true } },
            class: {
              select: { code: true, semester: true, program: { select: { code: true } } },
            },
          },
        },
      },
      orderBy: [{ enrollment: { class: { program: { code: "asc" } } } }, { enrollment: { student: { name: "asc" } } }],
    }),
    prisma.proposal.findMany({
      where: {
        supervisor1AssignedId: null,
        historicalImportSource: "KETUA_KK_TA_PAST",
      },
      select: {
        id: true,
        createdAt: true,
        importBatchId: true,
        enrollment: {
          select: {
            student: { select: { name: true, identifier: true } },
            class: { select: { program: { select: { code: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true, kelompokKeahlianId: myKK.id },
      select: {
        id: true,
        name: true,
        supervisedAsFirst: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: { enrollment: { select: { studentId: true } } },
        },
        supervisedAsSecond: {
          where: { status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
          select: { enrollment: { select: { studentId: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    import("@/lib/settings").then((m) => m.getGlobalQuota()),
  ]);

  const pembimbingList = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    bimbinganCount: countUniqueStudents(d.supervisedAsFirst, d.supervisedAsSecond),
  }));

  const activeClassRows = activeClassProposals.map((p) => ({
    id: p.id,
    status: p.status,
    nim: p.enrollment.student.identifier,
    nama: p.enrollment.student.name,
    prodi: p.enrollment.class.program.code,
    kelas: p.enrollment.class.code,
    semester: p.enrollment.class.semester,
  }));

  const importedTARows = importedTAProposals.map((p) => ({
    id: p.id,
    nim: p.enrollment.student.identifier,
    nama: p.enrollment.student.name,
    prodi: p.enrollment.class.program.code,
    importDate: p.createdAt.toISOString(),
    importBatchId: p.importBatchId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mahasiswa Belum Memiliki Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{myKK.nama}</span> · tugaskan pembimbing
          untuk mahasiswa yang belum memiliki Pembimbing 1 (maks: {globalQuota} per dosen)
        </p>
      </div>
      {pembimbingList.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada dosen dalam Kelompok Keahlian ini. Hubungi Admin untuk menambahkan anggota.
        </div>
      ) : (
        <MissingPembimbingTabs
          activeClassRows={activeClassRows}
          importedTARows={importedTARows}
          pembimbingList={pembimbingList}
          globalQuota={globalQuota}
        />
      )}
    </div>
  );
}
