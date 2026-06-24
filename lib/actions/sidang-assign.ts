"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, type AssignmentChange } from "@/lib/audit";
import { createNotification } from "@/lib/actions/notifications";
import { revalidatePath } from "next/cache";

async function requireKetuaOrAdmin() {
  const session = await auth();
  if (!session) throw new Error("Tidak terautentikasi");
  const { role, isKetua } = session.user;
  const isAdmin = role === "ADMIN";
  const isKetuaUser = role === "DOSEN" && !!isKetua;
  if (!isAdmin && !isKetuaUser) throw new Error("Tidak terautentikasi");

  let myKKId: string | null = null;
  if (!isAdmin) {
    const myKK = await prisma.kelompokKeahlian.findUnique({
      where: { ketuaId: session.user.id },
      select: { id: true },
    });
    myKKId = myKK?.id ?? null;
  }

  const auditRole: "ADMIN" | "KETUA_KK" = isAdmin ? "ADMIN" : "KETUA_KK";
  return { session, auditRole, isAdmin, myKKId };
}

type DosenWithKK = {
  id: string;
  name: string;
  isActive: boolean;
  kelompokKeahlianId: string | null;
  kelompokKeahlian: { nama: string; ketuaId: string | null } | null;
} | null;

const DOSEN_KK_SELECT = {
  id: true,
  name: true,
  isActive: true,
  kelompokKeahlianId: true,
  kelompokKeahlian: { select: { nama: true, ketuaId: true } },
} as const;

function describeDosen(d: DosenWithKK): string {
  if (!d) return "—";
  return d.kelompokKeahlian ? `${d.name} (${d.kelompokKeahlian.nama})` : d.name;
}

/**
 * A penguji home-KK that differs from the mahasiswa's KK affects that KK's
 * Ketua workload without their direct involvement — both removal and new
 * assignment must be surfaced to them (spec 984-994).
 */
async function notifyCrossKK(
  oldDosen: DosenWithKK,
  newDosen: DosenWithKK,
  mahasiswaKKId: string,
  mahasiswaKKNama: string,
  mahasiswa: { nim: string; nama: string; prodi: string; judul: string | null },
  slotLabel: string,
  assignedByName: string
) {
  const oldIsCross = !!oldDosen && oldDosen.kelompokKeahlianId !== mahasiswaKKId;
  const newIsCross = !!newDosen && newDosen.kelompokKeahlianId !== mahasiswaKKId;
  const judulLine = mahasiswa.judul ?? "—";

  if (oldIsCross && oldDosen!.kelompokKeahlian?.ketuaId) {
    if (newDosen) {
      await createNotification(
        oldDosen!.kelompokKeahlian!.ketuaId,
        "PENGUJI_CROSS_KK_CHANGED",
        "Penguji Diganti",
        `Dosen Anda ${oldDosen!.name} digantikan oleh ${newDosen.name} sebagai ${slotLabel} untuk mahasiswa ${mahasiswa.nama} (${mahasiswa.nim}, ${mahasiswa.prodi}) dari KK ${mahasiswaKKNama}. Judul: ${judulLine}. Ditugaskan oleh: ${assignedByName}.`
      );
    } else {
      await createNotification(
        oldDosen!.kelompokKeahlian!.ketuaId,
        "PENGUJI_CROSS_KK_REMOVED",
        "Penguji Dihapus",
        `Dosen Anda ${oldDosen!.name} dihapus sebagai ${slotLabel} untuk mahasiswa ${mahasiswa.nama} (${mahasiswa.nim}, ${mahasiswa.prodi}) dari KK ${mahasiswaKKNama}. Ditugaskan oleh: ${assignedByName}.`
      );
    }
  }

  if (newIsCross && newDosen!.kelompokKeahlian?.ketuaId) {
    await createNotification(
      newDosen!.kelompokKeahlian!.ketuaId,
      "PENGUJI_CROSS_KK_NEW",
      "Penguji Baru",
      `Dosen Anda ${newDosen!.name} ditugaskan sebagai ${slotLabel} lintas KK untuk mahasiswa ${mahasiswa.nama} (${mahasiswa.nim}, ${mahasiswa.prodi}) dari KK ${mahasiswaKKNama}. Judul: ${judulLine}. Ditugaskan oleh: ${assignedByName}.`
    );
  }
}

type ApplyResult =
  | { success: true; nim: string; warning?: string }
  | { success: false; nim?: string; error: string };

type AssignCtx = {
  session: { user: { id: string; name: string } };
  auditRole: "ADMIN" | "KETUA_KK";
  isAdmin: boolean;
  myKKId: string | null;
};

async function applyPengujiAssignment(
  sidangRecordId: string,
  penguji1Id: string,
  penguji2Id: string | null,
  ctx: AssignCtx
): Promise<ApplyResult> {
  const { session, auditRole, isAdmin, myKKId } = ctx;

  const record = await prisma.sidangRecord.findUnique({
    where: { id: sidangRecordId },
    select: {
      id: true,
      nim: true,
      nama: true,
      judul: true,
      prodi: true,
      kelompokKeahlianId: true,
      kelompokKeahlian: { select: { nama: true } },
      pembimbing1Id: true,
      pembimbing2Id: true,
      penguji1Id: true,
      penguji2Id: true,
      penguji1: { select: DOSEN_KK_SELECT },
      penguji2: { select: DOSEN_KK_SELECT },
    },
  });
  if (!record) return { success: false, error: "Data sidang tidak ditemukan" };

  if (!isAdmin && record.kelompokKeahlianId !== myKKId) {
    return { success: false, nim: record.nim, error: "Anda hanya dapat mengubah penguji untuk mahasiswa di Kelompok Keahlian Anda sendiri" };
  }

  if (!penguji1Id) return { success: false, nim: record.nim, error: "Penguji 1 wajib dipilih" };
  if (penguji2Id && penguji1Id === penguji2Id) {
    return { success: false, nim: record.nim, error: "Penguji 1 dan Penguji 2 tidak boleh sama" };
  }

  const [newPenguji1, newPenguji2] = await Promise.all([
    prisma.user.findUnique({ where: { id: penguji1Id }, select: DOSEN_KK_SELECT }),
    penguji2Id ? prisma.user.findUnique({ where: { id: penguji2Id }, select: DOSEN_KK_SELECT }) : Promise.resolve(null),
  ]);

  if (!newPenguji1 || !newPenguji1.isActive) return { success: false, nim: record.nim, error: "Penguji 1 tidak valid atau tidak aktif" };
  if (penguji2Id && (!newPenguji2 || !newPenguji2.isActive)) {
    return { success: false, nim: record.nim, error: "Penguji 2 tidak valid atau tidak aktif" };
  }

  const isReassign = !!record.penguji1Id;
  const pembimbingIds = new Set([record.pembimbing1Id, record.pembimbing2Id].filter(Boolean));

  const warnings: string[] = [];
  if (pembimbingIds.has(penguji1Id)) warnings.push(`Penguji 1 (${newPenguji1.name}) juga merupakan pembimbing mahasiswa ini`);
  if (penguji2Id && pembimbingIds.has(penguji2Id)) warnings.push(`Penguji 2 (${newPenguji2?.name}) juga merupakan pembimbing mahasiswa ini`);

  const penguji1Changed = record.penguji1Id !== penguji1Id;
  const penguji2Changed = (record.penguji2Id ?? null) !== (penguji2Id ?? null);

  if (!penguji1Changed && !penguji2Changed) {
    return { success: true, nim: record.nim, warning: warnings.length > 0 ? warnings.join("; ") : undefined };
  }

  await prisma.sidangRecord.update({
    where: { id: sidangRecordId },
    data: { penguji1Id, penguji2Id: penguji2Id ?? null },
  });

  // Build per-slot diff + detect cross-KK involvement for audit categorization
  const changes: AssignmentChange[] = [];
  let anyCrossKK = false;
  const mahasiswaKKId = record.kelompokKeahlianId;
  const mahasiswaKKNama = record.kelompokKeahlian.nama;

  if (penguji1Changed) {
    changes.push({ field: "Penguji 1 (PGJ I)", previous: describeDosen(record.penguji1), new: describeDosen(newPenguji1) });
    if (newPenguji1.kelompokKeahlianId !== mahasiswaKKId || (record.penguji1 && record.penguji1.kelompokKeahlianId !== mahasiswaKKId)) anyCrossKK = true;
  }
  if (penguji2Changed) {
    changes.push({ field: "Penguji 2 (PGJ II)", previous: describeDosen(record.penguji2), new: describeDosen(newPenguji2) });
    if ((newPenguji2 && newPenguji2.kelompokKeahlianId !== mahasiswaKKId) || (record.penguji2 && record.penguji2.kelompokKeahlianId !== mahasiswaKKId)) anyCrossKK = true;
  }

  const mahasiswaInfo = { nim: record.nim, nama: record.nama, prodi: record.prodi, judul: record.judul };
  const assignedByName = session.user.name;

  if (penguji1Changed) await notifyCrossKK(record.penguji1, newPenguji1, mahasiswaKKId, mahasiswaKKNama, mahasiswaInfo, "Penguji 1", assignedByName);
  if (penguji2Changed) await notifyCrossKK(record.penguji2, newPenguji2, mahasiswaKKId, mahasiswaKKNama, mahasiswaInfo, "Penguji 2", assignedByName);

  await logAudit(
    session.user.id,
    auditRole,
    anyCrossKK ? "CROSS_KK_EXAMINER_ASSIGNMENT" : isReassign ? "REASSIGN_PENGUJI_SIDANG" : "ASSIGN_PENGUJI_SIDANG",
    {
      sidangRecordId,
      nim: record.nim,
      nama: record.nama,
      kelompokKeahlian: mahasiswaKKNama,
      changes,
      isReassign,
      isCrossKK: anyCrossKK,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: changes.map((c) => `${c.field}: ${c.previous} → ${c.new}`).join("; "),
    },
    "SIDANG_RECORD",
    sidangRecordId
  );

  return {
    success: true,
    nim: record.nim,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}

export type AssignPengujiResult = ApplyResult;

export async function assignPengujiSidang(
  sidangRecordId: string,
  penguji1Id: string,
  penguji2Id: string | null
): Promise<AssignPengujiResult> {
  const ctx = await requireKetuaOrAdmin();
  const result = await applyPengujiAssignment(sidangRecordId, penguji1Id, penguji2Id, ctx);

  revalidatePath("/ketua-kk/plotting-penguji");
  revalidatePath("/ketua-kk/plotting-penguji/beban-dosen");
  revalidatePath("/admin/audit-log");

  return result;
}

export type BulkAssignResult = {
  total: number;
  success: number;
  failed: number;
  rows: { id: string; nim: string; status: "Success" | "Failed"; reason?: string }[];
};

export async function bulkAssignPengujiSidang(
  ids: string[],
  penguji1Id: string,
  penguji2Id: string | null
): Promise<BulkAssignResult> {
  const ctx = await requireKetuaOrAdmin();

  const result: BulkAssignResult = { total: ids.length, success: 0, failed: 0, rows: [] };

  for (const id of ids) {
    try {
      const res = await applyPengujiAssignment(id, penguji1Id, penguji2Id, ctx);
      if (res.success) {
        result.success++;
        result.rows.push({ id, nim: res.nim, status: "Success" });
      } else {
        result.failed++;
        result.rows.push({ id, nim: res.nim ?? "-", status: "Failed", reason: res.error });
      }
    } catch (err: unknown) {
      result.failed++;
      const msg = err instanceof Error ? err.message : "Gagal memproses";
      result.rows.push({ id, nim: "-", status: "Failed", reason: msg });
    }
  }

  revalidatePath("/ketua-kk/plotting-penguji");
  revalidatePath("/ketua-kk/plotting-penguji/beban-dosen");
  revalidatePath("/admin/audit-log");

  return result;
}
