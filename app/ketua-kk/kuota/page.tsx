import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGlobalQuota } from "@/lib/settings";
import { getMyKK } from "@/lib/kk";
import { countUniqueStudents } from "@/lib/quota";
import { QuotaTable } from "./quota-table";
import { AlertCircle } from "lucide-react";

export default async function KetuaKKKuotaPage() {
  const session = await auth();
  const myKK = await getMyKK(session!.user.id);

  if (!myKK) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Informasi Kuota Pembimbing</h1>
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

  const [dosenList, globalQuota] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true, kelompokKeahlianId: myKK.id },
      select: {
        id: true,
        name: true,
        identifier: true,
        isKetua: true,
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
    getGlobalQuota(),
  ]);

  const rows = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    identifier: d.identifier,
    isKetua: d.isKetua,
    bimbinganCount: countUniqueStudents(d.supervisedAsFirst, d.supervisedAsSecond),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informasi Kuota Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{myKK.nama}</span> · pantau kapasitas
          bimbingan dosen. Pengubahan kuota hanya dapat dilakukan oleh Admin.
        </p>
      </div>
      <QuotaTable dosenList={rows} globalQuota={globalQuota} />
    </div>
  );
}
