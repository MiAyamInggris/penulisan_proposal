"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignDeskEvaluator(
  proposalId: string,
  deskEvaluatorId: string | null
) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  // Guard: evaluator must not be one of the assigned supervisors
  if (deskEvaluatorId) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { supervisor1AssignedId: true, supervisor2AssignedId: true },
    });

    if (!proposal) return { error: "Proposal tidak ditemukan" };

    if (
      deskEvaluatorId === proposal.supervisor1AssignedId ||
      deskEvaluatorId === proposal.supervisor2AssignedId
    ) {
      return {
        error:
          "Desk evaluator tidak boleh sama dengan pembimbing yang sudah ditugaskan",
      };
    }
  }

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { deskEvaluatorId: deskEvaluatorId || null },
  });

  revalidatePath("/dosen-kelas/desk-evaluator");
  revalidatePath("/dosen/desk-evaluation-assessment");
  revalidatePath("/dosen-kelas", "layout");
  revalidatePath("/pembimbing", "layout");
  revalidatePath("/dosen", "layout");
  return { success: true };
}
