import { prisma } from "@/lib/prisma";
import { QuotaTable } from "./quota-table";

export default async function KetuaKKKuotaPage() {
  const dosenList = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true },
    select: {
      id: true,
      name: true,
      identifier: true,
      isKetua: true,
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
  });

  const rows = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    identifier: d.identifier,
    isKetua: d.isKetua,
    maxBimbinganQuota: d.maxBimbinganQuota,
    bimbinganCount: d.supervisedAsFirst.length + d.supervisedAsSecond.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kuota Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Atur jumlah maksimal mahasiswa bimbingan per dosen
        </p>
      </div>
      <QuotaTable dosenList={rows} />
    </div>
  );
}
