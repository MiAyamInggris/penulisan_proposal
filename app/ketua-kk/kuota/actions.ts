"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateQuota(dosenId: string, quota: number) {
  if (quota < 0 || quota > 50) return { error: "Kuota harus antara 0 dan 50" };

  const user = await prisma.user.findUnique({ where: { id: dosenId }, select: { role: true } });
  if (!user || user.role !== "DOSEN") return { error: "User bukan dosen" };

  await prisma.user.update({ where: { id: dosenId }, data: { maxBimbinganQuota: quota } });
  revalidatePath("/ketua-kk/kuota");
  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  return { success: true };
}
