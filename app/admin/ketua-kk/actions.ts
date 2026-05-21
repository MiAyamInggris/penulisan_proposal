"use server";

import { auth } from "@/lib/auth";
import { setGlobalQuota } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export async function setGlobalQuotaAdmin(quota: number) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Hanya Admin yang dapat mengubah kuota" };
  if (quota < 0 || quota > 100) return { error: "Kuota harus antara 0 dan 100" };

  await setGlobalQuota(quota);

  revalidatePath("/admin/ketua-kk");
  revalidatePath("/ketua-kk/kuota");
  revalidatePath("/ketua-kk/dashboard");
  revalidatePath("/ketua-kk/alokasi-pembimbing");
  return { success: true };
}
