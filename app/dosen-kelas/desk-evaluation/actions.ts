"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignDeskEvaluator(
  proposalId: string,
  evaluatorId: string
) {
  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      deskEvaluatorId: evaluatorId || null,
    },
  });

  revalidatePath("/dosen-kelas/desk-evaluation");
  revalidatePath("/dosen/desk-evaluation-assessment"); // This will be the new menu
  return { success: true };
}
