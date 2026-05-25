"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getGlobalQuota } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function assignSupervisorsKK(
  proposalId: string,
  supervisor1Id: string,
  supervisor2Id: string | null
) {
  const s1 = supervisor1Id || null;
  const s2 = supervisor2Id || null;

  if (!s1) return { error: "Pembimbing 1 wajib dipilih" };

  const globalQuota = await getGlobalQuota();

  // Quota check for supervisor 1
  const s1User = await prisma.user.findUnique({ where: { id: s1 }, select: { name: true } });
  if (s1User) {
    const currentCount = await prisma.proposal.count({
      where: {
        OR: [{ supervisor1AssignedId: s1 }, { supervisor2AssignedId: s1 }],
        id: { not: proposalId },
      },
    });
    if (currentCount >= globalQuota) {
      return { error: `Kuota ${s1User.name} sudah penuh (${currentCount}/${globalQuota})` };
    }
  }

  // Quota check for supervisor 2
  if (s2) {
    const s2User = await prisma.user.findUnique({ where: { id: s2 }, select: { name: true } });
    if (s2User) {
      const currentCount = await prisma.proposal.count({
        where: {
          OR: [{ supervisor1AssignedId: s2 }, { supervisor2AssignedId: s2 }],
          id: { not: proposalId },
        },
      });
      if (currentCount >= globalQuota) {
        return { error: `Kuota ${s2User.name} sudah penuh (${currentCount}/${globalQuota})` };
      }
    }
  }

  const current = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });

  const shouldAdvanceStatus =
    current?.status === "ENROLLED" || current?.status === "PROPOSAL_UPLOADED";

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      supervisor1AssignedId: s1,
      supervisor2AssignedId: s2,
      ...(shouldAdvanceStatus && { status: "ASSIGNED" }),
    },
  });

  revalidatePath("/ketua-kk/alokasi-pembimbing");
  revalidatePath("/dosen-kelas/supervisor");
  revalidatePath("/mahasiswa/dashboard");
  revalidatePath("/dosen/pembimbing");
  revalidatePath("/admin/audit-log");

  const session = await auth();
  if (session?.user?.id) {
    const sv1Name = s1User?.name;
    const sv2User = s2 ? await prisma.user.findUnique({ where: { id: s2 }, select: { name: true } }) : null;
    await logAudit(session.user.id, "KETUA_KK", "ASSIGN_PEMBIMBING_KK", {
      proposalId,
      supervisor1Id: s1,
      supervisor1Name: sv1Name,
      supervisor2Id: s2,
      supervisor2Name: sv2User?.name ?? null,
    }, "PROPOSAL", proposalId);
  }

  return { success: true };
}
