import { prisma } from "@/lib/prisma";
import { GraduateUpdateClient, type GraduateBatchRow } from "@/components/graduate-update-import-client";

type GraduateImportDetail = {
  total?: number;
  graduated?: number;
  updated?: number;
  skippedNoChange?: number;
  skipped?: number;
  failed?: number;
  importBatchId?: string;
  message?: string;
};

export default async function UpdateLulusPage() {
  const logs = await prisma.auditLog.findMany({
    where: { action: "GRADUATE_UPDATE_IMPORT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      detail: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  const batches: GraduateBatchRow[] = logs.map((l) => {
    const detail = (l.detail ?? {}) as GraduateImportDetail;
    return {
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      importedBy: l.user.name,
      total: detail.total ?? 0,
      graduated: detail.graduated ?? 0,
      updated: detail.updated ?? 0,
      skippedNoChange: detail.skippedNoChange ?? 0,
      skipped: detail.skipped ?? 0,
      failed: detail.failed ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Update Mahasiswa Lulus</h1>
        <p className="text-sm text-gray-500 mt-1">
          Perbarui status mahasiswa yang sudah resmi lulus/yudisium agar kuota
          bimbingan dosen otomatis disesuaikan.
        </p>
      </div>
      <GraduateUpdateClient batches={batches} />
    </div>
  );
}
