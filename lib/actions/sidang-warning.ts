"use server";

import { prisma } from "@/lib/prisma";
import { requireKetuaOrAdminForSidang } from "@/lib/sidang-auth";
import { logAudit, type AssignmentChange } from "@/lib/audit";
import { createNotification } from "@/lib/actions/notifications";
import { assignPengujiSidang, type AssignPengujiResult } from "@/lib/actions/sidang-assign";
import { revalidatePath } from "next/cache";
import type { ProdiCode, SidangImportWarning } from "@prisma/client";

type SidangCtx = Awaited<ReturnType<typeof requireKetuaOrAdminForSidang>>;

type LoadResult =
  | { ok: true; warning: SidangImportWarning }
  | { ok: false; reason: string; rejected: boolean };

async function loadPendingWarningSafe(warningId: string, isAdmin: boolean, myKKId: string | null): Promise<LoadResult> {
  const warning = await prisma.sidangImportWarning.findUnique({ where: { id: warningId } });
  if (!warning) return { ok: false, reason: "Data warning tidak ditemukan", rejected: false };
  if (warning.status !== "PENDING") return { ok: false, reason: "Data warning ini sudah diselesaikan sebelumnya", rejected: false };
  if (!isAdmin && warning.kelompokKeahlianId !== myKKId) {
    return { ok: false, reason: "Mahasiswa belongs to another KK (Mahasiswa berasal dari KK lain)", rejected: true };
  }
  return { ok: true, warning };
}

async function loadPendingWarning(warningId: string, isAdmin: boolean, myKKId: string | null): Promise<SidangImportWarning> {
  const res = await loadPendingWarningSafe(warningId, isAdmin, myKKId);
  if (!res.ok) throw new Error(res.reason);
  return res.warning;
}

function revalidateWarningPaths() {
  revalidatePath("/ketua-kk/plotting-penguji/data-warning");
  revalidatePath("/ketua-kk/plotting-penguji");
  revalidatePath("/ketua-kk/plotting-penguji/beban-dosen");
  revalidatePath("/admin/audit-log");
  revalidatePath("/admin/plotting-penguji-warnings");
}

async function ensureSidangRecord(warning: { existingSidangRecordId: string | null; nim: string; nama: string; prodi: ProdiCode; judul: string | null; semester: string | null; kelompokKeahlianId: string; pembimbing1Id: string | null; pembimbing2Id: string | null; importBatchId: string; importedById: string }): Promise<string> {
  if (warning.existingSidangRecordId) return warning.existingSidangRecordId;

  const created = await prisma.sidangRecord.create({
    data: {
      nim: warning.nim,
      nama: warning.nama,
      prodi: warning.prodi,
      judul: warning.judul,
      semester: warning.semester,
      kelompokKeahlianId: warning.kelompokKeahlianId,
      pembimbing1Id: warning.pembimbing1Id,
      pembimbing2Id: warning.pembimbing2Id,
      importBatchId: warning.importBatchId,
      importedById: warning.importedById,
    },
    select: { id: true },
  });
  return created.id;
}

// ─── Change Penguji (single record — opens normal assignment workflow) ───────

export async function resolveWarningChangePenguji(
  warningId: string,
  penguji1Id: string,
  penguji2Id: string | null
): Promise<AssignPengujiResult> {
  const { session, isAdmin, myKKId } = await requireKetuaOrAdminForSidang();
  const warning = await loadPendingWarning(warningId, isAdmin, myKKId);

  const sidangRecordId = await ensureSidangRecord(warning);

  const assignResult = await assignPengujiSidang(sidangRecordId, penguji1Id, penguji2Id);
  if (!assignResult.success) return assignResult;

  await prisma.sidangImportWarning.update({
    where: { id: warningId },
    data: {
      status: "RESOLVED_CHANGED",
      resolvedAt: new Date(),
      resolvedById: session.user.id,
      existingSidangRecordId: sidangRecordId,
    },
  });

  revalidateWarningPaths();
  return assignResult;
}

// ─── Force Insert / Accept Changes (core, reused by single + bulk) ──────────

type ApplyForceInsertResult =
  | { success: true; nim: string }
  | { success: false; nim?: string; error: string; rejected?: boolean };

async function applyForceInsert(
  warning: SidangImportWarning,
  ctx: SidangCtx
): Promise<ApplyForceInsertResult> {
  const { session, auditRole } = ctx;

  try {
    const [kk, newPenguji1, newPenguji2, existing] = await Promise.all([
      prisma.kelompokKeahlian.findUnique({ where: { id: warning.kelompokKeahlianId }, select: { nama: true } }),
      warning.importedPenguji1Id
        ? prisma.user.findUnique({ where: { id: warning.importedPenguji1Id }, select: { id: true, name: true, kelompokKeahlian: { select: { nama: true, ketuaId: true } } } })
        : Promise.resolve(null),
      warning.importedPenguji2Id
        ? prisma.user.findUnique({ where: { id: warning.importedPenguji2Id }, select: { id: true, name: true, kelompokKeahlian: { select: { nama: true, ketuaId: true } } } })
        : Promise.resolve(null),
      warning.existingSidangRecordId
        ? prisma.sidangRecord.findUnique({
            where: { id: warning.existingSidangRecordId },
            select: {
              id: true, penguji1Id: true, penguji2Id: true,
              penguji1: { select: { name: true, kelompokKeahlian: { select: { nama: true, ketuaId: true } } } },
              penguji2: { select: { name: true, kelompokKeahlian: { select: { nama: true, ketuaId: true } } } },
            },
          })
        : Promise.resolve(null),
    ]);

    const sidangRecordId = await ensureSidangRecord(warning);

    await prisma.sidangRecord.update({
      where: { id: sidangRecordId },
      data: {
        nama: warning.nama,
        prodi: warning.prodi,
        judul: warning.judul,
        semester: warning.semester,
        kelompokKeahlianId: warning.kelompokKeahlianId,
        pembimbing1Id: warning.pembimbing1Id,
        pembimbing2Id: warning.pembimbing2Id,
        penguji1Id: warning.importedPenguji1Id,
        penguji2Id: warning.importedPenguji2Id,
        importBatchId: warning.importBatchId,
        importedById: warning.importedById,
      },
    });

    const describe = (name: string | null | undefined, kkNama: string | null | undefined) =>
      name ? `${name}${kkNama ? ` (${kkNama})` : ""}` : "—";

    const changes: AssignmentChange[] = [
      {
        field: "Penguji 1 (PGJ I)",
        previous: describe(existing?.penguji1?.name, existing?.penguji1?.kelompokKeahlian?.nama),
        new: describe(newPenguji1?.name, newPenguji1?.kelompokKeahlian?.nama),
      },
      {
        field: "Penguji 2 (PGJ II)",
        previous: describe(existing?.penguji2?.name, existing?.penguji2?.kelompokKeahlian?.nama),
        new: describe(newPenguji2?.name, newPenguji2?.kelompokKeahlian?.nama),
      },
    ];

    await logAudit(
      session.user.id,
      auditRole,
      "FORCE_INSERT_PENGUJI",
      {
        sidangRecordId,
        nim: warning.nim,
        nama: warning.nama,
        kelompokKeahlian: kk?.nama,
        warningType: warning.warningType,
        changes,
        message: changes.map((c) => `${c.field}: ${c.previous} → ${c.new}`).join("; "),
      },
      "SIDANG_RECORD",
      sidangRecordId
    );

    // Notify affected home-KK Ketua for cross-KK examiners, same as normal assignment.
    const mahasiswaInfo = { nim: warning.nim, nama: warning.nama, prodi: warning.prodi, judul: warning.judul };
    const notifyIfCross = async (
      oldP: { name: string; kelompokKeahlian: { nama: string; ketuaId: string | null } | null } | null | undefined,
      newP: { name: string; kelompokKeahlian: { nama: string; ketuaId: string | null } | null } | null | undefined,
      slotLabel: string
    ) => {
      const oldCross = !!oldP?.kelompokKeahlian && oldP.kelompokKeahlian.nama !== kk?.nama;
      const newCross = !!newP?.kelompokKeahlian && newP.kelompokKeahlian.nama !== kk?.nama;
      if (oldCross && oldP?.kelompokKeahlian?.ketuaId) {
        await createNotification(
          oldP.kelompokKeahlian.ketuaId,
          newP ? "PENGUJI_CROSS_KK_CHANGED" : "PENGUJI_CROSS_KK_REMOVED",
          newP ? "Penguji Diganti" : "Penguji Dihapus",
          `(Force Insert) Dosen Anda ${oldP.name} ${newP ? `digantikan oleh ${newP.name}` : "dihapus"} sebagai ${slotLabel} untuk mahasiswa ${mahasiswaInfo.nama} (${mahasiswaInfo.nim}, ${mahasiswaInfo.prodi}) dari KK ${kk?.nama}. Ditugaskan oleh: ${session.user.name}.`
        );
      }
      if (newCross && newP?.kelompokKeahlian?.ketuaId) {
        await createNotification(
          newP.kelompokKeahlian.ketuaId,
          "PENGUJI_CROSS_KK_NEW",
          "Penguji Baru",
          `(Force Insert) Dosen Anda ${newP.name} ditugaskan sebagai ${slotLabel} lintas KK untuk mahasiswa ${mahasiswaInfo.nama} (${mahasiswaInfo.nim}, ${mahasiswaInfo.prodi}) dari KK ${kk?.nama}. Ditugaskan oleh: ${session.user.name}.`
        );
      }
    };

    await notifyIfCross(existing?.penguji1, newPenguji1, "Penguji 1");
    await notifyIfCross(existing?.penguji2, newPenguji2, "Penguji 2");

    await prisma.sidangImportWarning.update({
      where: { id: warning.id },
      data: { status: "RESOLVED_FORCED", resolvedAt: new Date(), resolvedById: session.user.id, existingSidangRecordId: sidangRecordId },
    });

    return { success: true, nim: warning.nim };
  } catch (err: unknown) {
    return { success: false, nim: warning.nim, error: err instanceof Error ? err.message : "Gagal memproses Force Insert" };
  }
}

export type ForceInsertResult = { success: true } | { success: false; error: string };

export async function forceInsertWarning(warningId: string): Promise<ForceInsertResult> {
  const ctx = await requireKetuaOrAdminForSidang();
  const warning = await loadPendingWarningSafe(warningId, ctx.isAdmin, ctx.myKKId);
  if (!warning.ok) return { success: false, error: warning.reason };

  const result = await applyForceInsert(warning.warning, ctx);
  revalidateWarningPaths();
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

// ─── Ignore (core, reused by single + bulk) ──────────────────────────────────

type ApplyIgnoreResult = { success: true; nim: string } | { success: false; nim?: string; error: string };

async function applyIgnore(warning: SidangImportWarning, ctx: SidangCtx, note?: string): Promise<ApplyIgnoreResult> {
  const { session, auditRole } = ctx;
  try {
    await prisma.sidangImportWarning.update({
      where: { id: warning.id },
      data: { status: "IGNORED", resolvedAt: new Date(), resolvedById: session.user.id, resolutionNote: note || null },
    });

    await logAudit(
      session.user.id,
      auditRole,
      "IGNORE_SIDANG_WARNING",
      {
        nim: warning.nim,
        nama: warning.nama,
        warningType: warning.warningType,
        note: note || undefined,
        message: `Warning untuk ${warning.nim} (${warning.nama}) diabaikan tanpa perubahan data.${note ? ` Alasan: ${note}` : ""}`,
      },
      "SIDANG_IMPORT_WARNING",
      warning.id
    );

    return { success: true, nim: warning.nim };
  } catch (err: unknown) {
    return { success: false, nim: warning.nim, error: err instanceof Error ? err.message : "Gagal memproses" };
  }
}

export type IgnoreResult = { success: true } | { success: false; error: string };

export async function ignoreWarning(warningId: string, note?: string): Promise<IgnoreResult> {
  const ctx = await requireKetuaOrAdminForSidang();
  const warning = await loadPendingWarningSafe(warningId, ctx.isAdmin, ctx.myKKId);
  if (!warning.ok) return { success: false, error: warning.reason };

  const result = await applyIgnore(warning.warning, ctx, note);
  revalidateWarningPaths();
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

// ─── Bulk actions ─────────────────────────────────────────────────────────────

export type BulkWarningResult = {
  total: number;
  success: number;
  rejected: number;
  failed: number;
  rows: { id: string; nim: string; status: "Success" | "Rejected" | "Failed"; reason?: string }[];
};

export async function bulkAcceptWarnings(warningIds: string[]): Promise<BulkWarningResult> {
  const ctx = await requireKetuaOrAdminForSidang();
  const { session, auditRole, isAdmin, myKKId } = ctx;

  const result: BulkWarningResult = { total: warningIds.length, success: 0, rejected: 0, failed: 0, rows: [] };

  for (const id of warningIds) {
    const loaded = await loadPendingWarningSafe(id, isAdmin, myKKId);
    if (!loaded.ok) {
      if (loaded.rejected) result.rejected++;
      else result.failed++;
      result.rows.push({ id, nim: "?", status: loaded.rejected ? "Rejected" : "Failed", reason: loaded.reason });
      continue;
    }

    const applied = await applyForceInsert(loaded.warning, ctx);
    if (applied.success) {
      result.success++;
      result.rows.push({ id, nim: applied.nim, status: "Success" });
    } else {
      result.failed++;
      result.rows.push({ id, nim: applied.nim ?? "?", status: "Failed", reason: applied.error });
    }
  }

  await logAudit(
    session.user.id,
    auditRole,
    "BULK_ACCEPT_SIDANG_WARNING",
    {
      batchAction: "Accept Changes",
      totalRecords: result.total,
      accepted: result.success,
      rejected: result.rejected,
      failed: result.failed,
      message: `Bulk Accept Changes: ${result.success} diterima, ${result.rejected} ditolak (KK lain), ${result.failed} gagal dari total ${result.total} data.`,
    },
    "SIDANG_IMPORT_WARNING"
  );

  revalidateWarningPaths();
  return result;
}

export async function bulkIgnoreWarnings(warningIds: string[], note?: string): Promise<BulkWarningResult> {
  const ctx = await requireKetuaOrAdminForSidang();
  const { session, auditRole, isAdmin, myKKId } = ctx;

  const result: BulkWarningResult = { total: warningIds.length, success: 0, rejected: 0, failed: 0, rows: [] };

  for (const id of warningIds) {
    const loaded = await loadPendingWarningSafe(id, isAdmin, myKKId);
    if (!loaded.ok) {
      if (loaded.rejected) result.rejected++;
      else result.failed++;
      result.rows.push({ id, nim: "?", status: loaded.rejected ? "Rejected" : "Failed", reason: loaded.reason });
      continue;
    }

    const applied = await applyIgnore(loaded.warning, ctx, note);
    if (applied.success) {
      result.success++;
      result.rows.push({ id, nim: applied.nim, status: "Success" });
    } else {
      result.failed++;
      result.rows.push({ id, nim: applied.nim ?? "?", status: "Failed", reason: applied.error });
    }
  }

  await logAudit(
    session.user.id,
    auditRole,
    "BULK_IGNORE_SIDANG_WARNING",
    {
      batchAction: "Ignore",
      totalRecords: result.total,
      ignored: result.success,
      rejected: result.rejected,
      failed: result.failed,
      note: note || undefined,
      message: `Bulk Ignore: ${result.success} diabaikan, ${result.rejected} ditolak (KK lain), ${result.failed} gagal dari total ${result.total} data.`,
    },
    "SIDANG_IMPORT_WARNING"
  );

  revalidateWarningPaths();
  return result;
}
