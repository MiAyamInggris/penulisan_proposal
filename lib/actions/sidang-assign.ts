"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function requireKetuaOrAdmin() {
  const session = await auth();
  if (!session) throw new Error("Tidak terautentikasi");
  const { role, isKetua } = session.user;
  const isAdmin = role === "ADMIN";
  const isKetuaUser = role === "DOSEN" && !!isKetua;
  if (!isAdmin && !isKetuaUser) throw new Error("Tidak terautentikasi");
  return { session, auditRole: isAdmin ? "ADMIN" : ("KETUA_KK" as const) };
}

export type AssignPengujiResult =
  | { success: true; warning?: string }
  | { success: false; error: string };

export async function assignPengujiSidang(
  sidangRecordId: string,
  penguji1Id: string,
  penguji2Id: string | null
): Promise<AssignPengujiResult> {
  const { session, auditRole } = await requireKetuaOrAdmin();

  if (!penguji1Id) return { success: false, error: "Penguji 1 wajib dipilih" };
  if (penguji2Id && penguji1Id === penguji2Id) {
    return { success: false, error: "Penguji 1 dan Penguji 2 tidak boleh sama" };
  }

  const [penguji1, penguji2] = await Promise.all([
    prisma.user.findUnique({ where: { id: penguji1Id }, select: { id: true, name: true, isActive: true } }),
    penguji2Id
      ? prisma.user.findUnique({ where: { id: penguji2Id }, select: { id: true, name: true, isActive: true } })
      : Promise.resolve(null),
  ]);

  if (!penguji1 || !penguji1.isActive) return { success: false, error: "Penguji 1 tidak valid atau tidak aktif" };
  if (penguji2Id && (!penguji2 || !penguji2.isActive)) {
    return { success: false, error: "Penguji 2 tidak valid atau tidak aktif" };
  }

  const record = await prisma.sidangRecord.findUnique({
    where: { id: sidangRecordId },
    select: {
      id: true,
      nim: true,
      nama: true,
      penguji1Id: true,
      penguji2Id: true,
      pembimbing1Id: true,
      pembimbing2Id: true,
    },
  });
  if (!record) return { success: false, error: "Data sidang tidak ditemukan" };

  const isReassign = !!record.penguji1Id;
  const pembimbingIds = new Set([record.pembimbing1Id, record.pembimbing2Id].filter(Boolean));

  const warnings: string[] = [];
  if (pembimbingIds.has(penguji1Id)) warnings.push(`Penguji 1 (${penguji1.name}) juga merupakan pembimbing mahasiswa ini`);
  if (penguji2Id && pembimbingIds.has(penguji2Id)) warnings.push(`Penguji 2 (${penguji2?.name}) juga merupakan pembimbing mahasiswa ini`);

  await prisma.sidangRecord.update({
    where: { id: sidangRecordId },
    data: { penguji1Id, penguji2Id: penguji2Id ?? null },
  });

  await logAudit(
    session.user.id,
    auditRole,
    isReassign ? "REASSIGN_PENGUJI_SIDANG" : "ASSIGN_PENGUJI_SIDANG",
    {
      sidangRecordId,
      nim: record.nim,
      nama: record.nama,
      penguji1Id,
      penguji1Name: penguji1.name,
      penguji2Id: penguji2Id ?? null,
      penguji2Name: penguji2?.name ?? null,
      isReassign,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    "SIDANG_RECORD",
    sidangRecordId
  );

  revalidatePath("/ketua-kk/plotting-sidang");
  revalidatePath("/ketua-kk/dashboard");

  return {
    success: true,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}
