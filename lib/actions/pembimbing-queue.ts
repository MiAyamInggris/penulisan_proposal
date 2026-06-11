"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getGlobalQuota } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function assignPembimbingToHistoricalImport(
  proposalId: string,
  supervisor1Id: string,
  supervisor2Id: string | null
) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const { role, isKetua } = session.user;
  const isAdmin = role === "ADMIN";
  const isKetuaUser = role === "DOSEN" && !!isKetua;
  if (!isAdmin && !isKetuaUser) return { error: "Tidak terautentikasi" };

  const s1 = supervisor1Id || null;
  const s2 = supervisor2Id || null;
  if (!s1) return { error: "Pembimbing 1 wajib dipilih" };

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      historicalImportSource: true,
      enrollment: { select: { student: { select: { name: true, identifier: true } } } },
    },
  });
  if (!proposal || proposal.historicalImportSource !== "KETUA_KK_TA_PAST") {
    return { error: "Data Tugas Akhir - Past tidak ditemukan" };
  }

  const globalQuota = await getGlobalQuota();

  const s1User = await prisma.user.findUnique({ where: { id: s1 }, select: { name: true, kodeDosen: true } });
  if (s1User) {
    const currentCount = await prisma.proposal.count({
      where: { OR: [{ supervisor1AssignedId: s1 }, { supervisor2AssignedId: s1 }], id: { not: proposalId } },
    });
    if (currentCount >= globalQuota) {
      return { error: `Kuota ${s1User.name} sudah penuh (${currentCount}/${globalQuota})` };
    }
  }

  let s2User: { name: string; kodeDosen: string | null } | null = null;
  if (s2) {
    s2User = await prisma.user.findUnique({ where: { id: s2 }, select: { name: true, kodeDosen: true } });
    if (s2User) {
      const currentCount = await prisma.proposal.count({
        where: { OR: [{ supervisor1AssignedId: s2 }, { supervisor2AssignedId: s2 }], id: { not: proposalId } },
      });
      if (currentCount >= globalQuota) {
        return { error: `Kuota ${s2User.name} sudah penuh (${currentCount}/${globalQuota})` };
      }
    }
  }

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { supervisor1AssignedId: s1, supervisor2AssignedId: s2 },
  });

  revalidatePath("/ketua-kk/mahasiswa-belum-pembimbing");
  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  revalidatePath("/admin/audit-log");

  const nim = proposal.enrollment.student.identifier;
  let message = `${isAdmin ? "Admin" : "Ketua KK"} assigned Pembimbing 1 = ${s1User?.kodeDosen ?? s1User?.name} to mahasiswa ${nim}.`;
  if (s2User) {
    message += ` Pembimbing 2 = ${s2User.kodeDosen ?? s2User.name}.`;
  }

  await logAudit(session.user.id, isAdmin ? "ADMIN" : "KETUA_KK", "ASSIGN_PEMBIMBING_KK", {
    proposalId,
    supervisor1Id: s1,
    supervisor1Name: s1User?.name,
    supervisor2Id: s2,
    supervisor2Name: s2User?.name ?? null,
    message,
  }, "PROPOSAL", proposalId);

  return { success: true };
}
