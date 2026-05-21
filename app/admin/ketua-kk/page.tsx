import { prisma } from "@/lib/prisma";
import { KetuaKKManager } from "./ketua-kk-manager";

export default async function AdminKetuaKKPage() {
  const [dosenList, globalStats] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: {
        id: true,
        name: true,
        identifier: true,
        isKetua: true,
        maxBimbinganQuota: true,
        supervisedAsFirst: {
          select: { id: true, status: true },
        },
        supervisedAsSecond: {
          select: { id: true, status: true },
        },
      },
      orderBy: [{ isKetua: "desc" }, { name: "asc" }],
    }),
    Promise.all([
      prisma.proposal.count({ where: { supervisor1AssignedId: { not: null } } }),
      prisma.proposal.count({ where: { supervisor1AssignedId: { not: null }, supervisor2AssignedId: { not: null } } }),
      prisma.classEnrollment.count({ where: { isActive: true } }),
    ]),
  ]);

  const [totalAssigned, totalBothAssigned, totalEnrolled] = globalStats;

  const rows = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    identifier: d.identifier,
    isKetua: d.isKetua,
    maxBimbinganQuota: d.maxBimbinganQuota,
    bimbinganCount: d.supervisedAsFirst.length + d.supervisedAsSecond.length,
    activeBimbingan: d.supervisedAsFirst.filter((p) =>
      ["ASSIGNED", "BIMBINGAN", "DE_READY", "DE_COMPLETED", "REVISION_UPLOADED"].includes(p.status)
    ).length + d.supervisedAsSecond.filter((p) =>
      ["ASSIGNED", "BIMBINGAN", "DE_READY", "DE_COMPLETED", "REVISION_UPLOADED"].includes(p.status)
    ).length,
  }));

  const ketuaCount = rows.filter((d) => d.isKetua).length;
  const totalDosenWithBimbingan = rows.filter((d) => d.bimbinganCount > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Ketua KK</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola penugasan Ketua Kelompok Keahlian dan pantau alokasi pembimbing
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Ketua KK Aktif" value={ketuaCount} color="yellow" />
        <SummaryCard label="Dosen Pembimbing Aktif" value={totalDosenWithBimbingan} color="blue" />
        <SummaryCard label="Mahasiswa Dialokasikan" value={totalAssigned} color="green" />
        <SummaryCard label="Pembimbing Lengkap (1+2)" value={totalBothAssigned} color="purple" />
      </div>

      <KetuaKKManager rows={rows} totalEnrolled={totalEnrolled} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "yellow" | "blue" | "green" | "purple";
}) {
  const colors = {
    yellow: "bg-yellow-50 text-yellow-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color].split(" ")[1]}`}>{value}</p>
    </div>
  );
}
