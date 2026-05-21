import { prisma } from "@/lib/prisma";
import { getGlobalQuota } from "@/lib/settings";
import { QuotaTable } from "./quota-table";

export default async function KetuaKKKuotaPage() {
  const [dosenList, globalQuota] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: {
        id: true,
        name: true,
        identifier: true,
        isKetua: true,
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

  const rows = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    identifier: d.identifier,
    isKetua: d.isKetua,
    bimbinganCount: d.supervisedAsFirst.length + d.supervisedAsSecond.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informasi Kuota Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pantau kapasitas dan beban bimbingan setiap dosen. Pengubahan kuota hanya dapat dilakukan
          oleh Admin.
        </p>
      </div>
      <QuotaTable dosenList={rows} globalQuota={globalQuota} />
    </div>
  );
}
