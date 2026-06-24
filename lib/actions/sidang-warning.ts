"use server";

import { prisma } from "@/lib/prisma";
import { requireKetuaOrAdminForSidang } from "@/lib/sidang-auth";
import { logAudit, type AssignmentChange } from "@/lib/audit";
import { createNotification } from "@/lib/actions/notifications";
import { assignPengujiSidang, type AssignPengujiResult } from "@/lib/actions/sidang-assign";
import { revalidatePath } from "next/cache";
import type { ProdiCode } from "@prisma/client";

async function loadPendingWarning(warningId: string, isAdmin: boolean, myKKId: string | null) {
  const warning = await prisma.sidangImportWarning.findUnique({ where: { id: warningId } });
  if (!warning) throw new Error("Data warning tidak ditemukan");
  if (warning.status !== "PENDING") throw new Error("Data warning ini sudah diselesaikan sebelumnya");
  if (!isAdmin && warning.kelompokKeahlianId !== myKKId) {
    throw new Error("Anda hanya dapat menyelesaikan warning untuk mahasiswa di Kelompok Keahlian Anda sendiri");
  }
  return warning;
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

// ─── Change Penguji ──────────────────────────────────────────────────────────

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

// ─── Force Insert ────────────────────────────────────────────────────────────

export type ForceInsertResult = { success: true } | { success: false; error: string };

export async function forceInsertWarning(warningId: string): Promise<ForceInsertResult> {
  const { session, auditRole, isAdmin, myKKId } = await requireKetuaOrAdminForSidang();

  try {
    const warning = await loadPendingWarning(warningId, isAdmin, myKKId);

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
      where: { id: warningId },
      data: { status: "RESOLVED_FORCED", resolvedAt: new Date(), resolvedById: session.user.id, existingSidangRecordId: sidangRecordId },
    });

    revalidateWarningPaths();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memproses Force Insert" };
  }
}

// ─── Ignore ──────────────────────────────────────────────────────────────────

export type IgnoreResult = { success: true } | { success: false; error: string };

export async function ignoreWarning(warningId: string): Promise<IgnoreResult> {
  const { session, auditRole, isAdmin, myKKId } = await requireKetuaOrAdminForSidang();

  try {
    const warning = await loadPendingWarning(warningId, isAdmin, myKKId);

    await prisma.sidangImportWarning.update({
      where: { id: warningId },
      data: { status: "IGNORED", resolvedAt: new Date(), resolvedById: session.user.id },
    });

    await logAudit(
      session.user.id,
      auditRole,
      "IGNORE_SIDANG_WARNING",
      {
        nim: warning.nim,
        nama: warning.nama,
        warningType: warning.warningType,
        message: `Warning untuk ${warning.nim} (${warning.nama}) diabaikan tanpa perubahan data.`,
      },
      "SIDANG_IMPORT_WARNING",
      warningId
    );

    revalidateWarningPaths();
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memproses" };
  }
}
