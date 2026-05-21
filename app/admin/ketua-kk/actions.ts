"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateQuotaAdmin(dosenId: string, quota: number) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Hanya Admin yang dapat mengubah kuota" };
  if (quota < 0 || quota > 50) return { error: "Kuota harus antara 0 dan 50" };

  const user = await prisma.user.findUnique({ where: { id: dosenId }, select: { role: true } });
  if (!user || user.role !== "DOSEN") return { error: "User bukan dosen" };

  await prisma.user.update({ where: { id: dosenId }, data: { maxBimbinganQuota: quota } });

  // Revalidate all pages that display quota information
  revalidatePath("/admin/ketua-kk");
  revalidatePath("/ketua-kk/kuota");
  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  return { success: true };
}
