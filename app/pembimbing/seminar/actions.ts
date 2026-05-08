"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function scheduleSeminar(proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { supervisor1AssignedId: true, status: true },
  });

  if (!proposal) return { error: "Proposal tidak ditemukan" };
  if (proposal.supervisor1AssignedId !== session.user.id)
    return { error: "Hanya Pembimbing 1 yang dapat menjadwalkan seminar" };

  const scheduledDate = new Date(formData.get("scheduledDate") as string);
  const location = (formData.get("location") as string) || null;

  await prisma.$transaction([
    prisma.seminar.upsert({
      where: { proposalId },
      update: { scheduledDate, location, status: "SCHEDULED" },
      create: { proposalId, scheduledDate, location },
    }),
    prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "SEMINAR_REGISTERED" },
    }),
  ]);

  revalidatePath("/pembimbing/seminar");
  return { success: true };
}
