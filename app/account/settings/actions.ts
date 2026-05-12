"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword)
    return { error: "Semua field wajib diisi" };

  if (newPassword.length < 6)
    return { error: "Password baru minimal 6 karakter" };

  if (newPassword !== confirmPassword)
    return { error: "Konfirmasi password tidak cocok" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Pengguna tidak ditemukan" };

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return { error: "Password saat ini tidak benar" };

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { success: true };
}

export async function changeEmail(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const newEmail = (formData.get("newEmail") as string)?.trim().toLowerCase();
  const currentPassword = formData.get("currentPassword") as string;

  if (!newEmail || !currentPassword)
    return { error: "Semua field wajib diisi" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail))
    return { error: "Format email tidak valid" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Pengguna tidak ditemukan" };

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return { error: "Password tidak benar" };

  if (newEmail === user.email)
    return { error: "Email baru sama dengan email saat ini" };

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) return { error: "Email sudah digunakan oleh akun lain" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email: newEmail },
  });

  revalidatePath("/account/settings");
  return { success: true };
}
