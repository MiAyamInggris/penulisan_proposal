import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGlobalQuota } from "@/lib/settings";
import { getMyKK } from "@/lib/kk";
import { AllocateList } from "./allocate-list";
import { AlertCircle } from "lucide-react";

export default async function KetuaKKAlokasiPage() {
  const session = await auth();
  const myKK = await getMyKK(session!.user.id);

  if (!myKK) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Alokasi Pembimbing</h1>
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

  const [enrollments, dosenList, globalQuota] = await Promise.all([
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
    // Only dosen in this KK can be assigned as supervisors
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true, kelompokKeahlianId: myKK.id },
      select: {
        id: true,
        name: true,
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
    getGlobalQuota(),
  ]);

  const pembimbingList = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    bimbinganCount: d.supervisedAsFirst.length + d.supervisedAsSecond.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alokasi Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{myKK.nama}</span> · tugaskan pembimbing
          dari KK ini (maks: {globalQuota} per dosen)
        </p>
      </div>
      {pembimbingList.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada dosen dalam Kelompok Keahlian ini. Hubungi Admin untuk menambahkan anggota.
        </div>
      ) : (
        <AllocateList
          enrollments={enrollments}
          pembimbingList={pembimbingList}
          globalQuota={globalQuota}
        />
      )}
    </div>
  );
}
