"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignSupervisors(
  proposalId: string,
  supervisor1Id: string,
  supervisor2Id: string | null
) {
  const current = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });

  const shouldAdvanceStatus =
    current?.status === "ENROLLED" || current?.status === "PROPOSAL_UPLOADED";

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      supervisor1AssignedId: supervisor1Id || null,
      supervisor2AssignedId: supervisor2Id || null,
      ...(shouldAdvanceStatus && { status: "ASSIGNED" }),
    },
  });

  revalidatePath("/dosen-kelas/supervisor");
  revalidatePath("/mahasiswa/dashboard");
  revalidatePath("/dosen/pembimbing");
  return { success: true };
}
