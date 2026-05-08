"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { revalidatePath } from "next/cache";

export async function saveNilaiBimbingan(proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const data = {
    pemilihanTema: parseFloat(formData.get("pemilihanTema") as string),
    researchQuestion: parseFloat(formData.get("researchQuestion") as string),
    studiLiteratur1: parseFloat(formData.get("studiLiteratur1") as string),
    studiLiteratur2: parseFloat(formData.get("studiLiteratur2") as string),
    rencanaImplementasi: parseFloat(formData.get("rencanaImplementasi") as string),
    kemandirian: parseFloat(formData.get("kemandirian") as string),
    prosesBimbingan: parseFloat(formData.get("prosesBimbingan") as string),
    notes: (formData.get("notes") as string) || null,
  };

  await prisma.nilaiBimbingan.upsert({
    where: { proposalId_pembimbingId: { proposalId, pembimbingId: session.user.id } },
    update: { ...data },
    create: { proposalId, pembimbingId: session.user.id, ...data },
  });

  await computeFinalGrade(proposalId);
  revalidatePath("/pembimbing/bimbingan");
  return { success: true };
}
