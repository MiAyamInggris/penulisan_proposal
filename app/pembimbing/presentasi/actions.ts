"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { revalidatePath } from "next/cache";

export async function saveNilaiPresentasi(seminarId: string, proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const data = {
    latarBelakangScore: parseFloat(formData.get("latarBelakangScore") as string),
    teoriPendukungScore: parseFloat(formData.get("teoriPendukungScore") as string),
    toolsPemodelanScore: parseFloat(formData.get("toolsPemodelanScore") as string),
    pemaparanScore: parseFloat(formData.get("pemaparanScore") as string),
    komunikasiScore: parseFloat(formData.get("komunikasiScore") as string),
  };

  await prisma.nilaiPresentasi.upsert({
    where: { seminarId_pembimbingId: { seminarId, pembimbingId: session.user.id } },
    update: data,
    create: { seminarId, pembimbingId: session.user.id, ...data },
  });

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "SEMINAR_COMPLETED" },
  });

  await computeFinalGrade(proposalId);
  revalidatePath("/pembimbing/presentasi");
  return { success: true };
}
