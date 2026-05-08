"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignSupervisors(
  proposalId: string,
  supervisor1Id: string,
  supervisor2Id: string | null
) {
  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      supervisor1AssignedId: supervisor1Id || null,
      supervisor2AssignedId: supervisor2Id || null,
    },
  });
  revalidatePath("/dosen-kelas/supervisor");
  return { success: true };
}
