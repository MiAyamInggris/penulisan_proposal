"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProgram(id: string, formData: FormData) {
  await prisma.program.update({
    where: { id },
    data: {
      literatureReviewPct: parseFloat(formData.get("literatureReviewPct") as string),
      bimbinganPct: parseFloat(formData.get("bimbinganPct") as string),
      deskEvaluationPct: parseFloat(formData.get("deskEvaluationPct") as string),
      presentasiPct: parseFloat(formData.get("presentasiPct") as string),
    },
  });
  revalidatePath("/admin/programs");
  return { success: true };
}
