import { prisma } from "@/lib/prisma";
import { getGlobalQuota } from "@/lib/settings";
import { AdminKKTabs } from "./admin-kk-tabs";

export default async function AdminKetuaKKPage() {
  const [dosenList, globalStats, globalQuota] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: {
        id: true,
        name: true,
        identifier: true,
        isKetua: true,
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
      prisma.proposal.count({
        where: {
          supervisor1AssignedId: { not: null },
          supervisor2AssignedId: { not: null },
        },
      }),
      prisma.classEnrollment.count({ where: { isActive: true } }),
    ]),
    getGlobalQuota(),
  ]);

  const [totalAssigned, totalBothAssigned, totalEnrolled] = globalStats;

  const activeStatuses = [
    "ASSIGNED", "BIMBINGAN", "DE_READY", "DE_COMPLETED",
    "REVISION_UPLOADED", "SEMINAR_REGISTERED", "SEMINAR_COMPLETED",
  ];

  const kkRows = dosenList.map((d) => ({
    id: d.id,
    name: d.name,
    identifier: d.identifier,
    isKetua: d.isKetua,
    bimbinganCount: d.supervisedAsFirst.length + d.supervisedAsSecond.length,
    activeBimbingan:
      d.supervisedAsFirst.filter((p) => activeStatuses.includes(p.status)).length +
      d.supervisedAsSecond.filter((p) => activeStatuses.includes(p.status)).length,
  }));

  const quotaRows = kkRows.map(({ activeBimbingan: _a, ...rest }) => rest);

  const ketuaCount = kkRows.filter((d) => d.isKetua).length;
  const totalDosenWithBimbingan = kkRows.filter((d) => d.bimbinganCount > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Ketua KK</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola penugasan Ketua KK dan pengaturan kuota pembimbing
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Ketua KK Aktif" value={ketuaCount} color="yellow" />
        <SummaryCard label="Dosen Pembimbing Aktif" value={totalDosenWithBimbingan} color="blue" />
        <SummaryCard label="Mahasiswa Dialokasikan" value={totalAssigned} color="green" />
        <SummaryCard label="Pembimbing Lengkap (1+2)" value={totalBothAssigned} color="purple" />
      </div>

      <AdminKKTabs
        kkRows={kkRows}
        quotaRows={quotaRows}
        totalEnrolled={totalEnrolled}
        globalQuota={globalQuota}
      />
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
  const textColor = {
    yellow: "text-yellow-700",
    blue: "text-blue-700",
    green: "text-green-700",
    purple: "text-purple-700",
  }[color];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
