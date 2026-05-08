"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { revalidatePath } from "next/cache";

export async function saveNilaiLR(proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const data = {
    kualitasPustaka: parseFloat(formData.get("kualitasPustaka") as string),
    kontenRumusan: parseFloat(formData.get("kontenRumusan") as string),
    analisisTujuan: parseFloat(formData.get("analisisTujuan") as string),
    kelengkapanKajian: parseFloat(formData.get("kelengkapanKajian") as string),
    kelebihanKekurangan: parseFloat(formData.get("kelebihanKekurangan") as string),
    relasiTeori: parseFloat(formData.get("relasiTeori") as string),
    catatan: (formData.get("catatan") as string) || null,
  };

  await prisma.nilaiLiteratureReview.upsert({
    where: { proposalId_pembimbingId: { proposalId, pembimbingId: session.user.id } },
    update: data,
    create: { proposalId, pembimbingId: session.user.id, ...data },
  });

  await computeFinalGrade(proposalId);
  revalidatePath("/pembimbing/literature-review");
  return { success: true };
}
