import { prisma } from "@/lib/prisma";
import { KKManager } from "./kk-manager";

export default async function KelompokKeahlianPage() {
  const [kkList, allDosen] = await Promise.all([
    prisma.kelompokKeahlian.findMany({
      include: {
        ketua: { select: { id: true, name: true, identifier: true } },
        dosen: {
          select: { id: true, name: true, identifier: true, isKetua: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { nama: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: {
        id: true,
        name: true,
        identifier: true,
        isKetua: true,
        kelompokKeahlianId: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalDosen = allDosen.length;
  const assignedDosen = allDosen.filter((d) => d.kelompokKeahlianId).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kelompok Keahlian</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola struktur Kelompok Keahlian, anggota dosen, dan penugasan Ketua KK
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total KK" value={kkList.length} color="blue" />
        <SummaryCard label="Dosen Terassign" value={assignedDosen} color="green" />
        <SummaryCard label="Dosen Belum KK" value={totalDosen - assignedDosen} color="yellow" />
        <SummaryCard
          label="KK dengan Ketua"
          value={kkList.filter((k) => k.ketuaId).length}
          color="purple"
        />
      </div>

      <KKManager kkList={kkList} allDosen={allDosen} />
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
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const textColor = {
    blue: "text-blue-700",
    green: "text-green-700",
    yellow: "text-yellow-700",
    purple: "text-purple-700",
  }[color];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
