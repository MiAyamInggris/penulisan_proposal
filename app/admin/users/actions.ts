"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role),
  identifier: z.string().min(1),
});

export async function createUser(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as Role,
    identifier: formData.get("identifier") as string,
  };

  const parsed = userSchema.safeParse(data);
  if (!parsed.success) return { error: "Data tidak valid" };

  const hashed = await bcrypt.hash(data.password!, 10);

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
      identifier: data.identifier,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    role: formData.get("role") as Role,
    identifier: formData.get("identifier") as string,
  };

  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    role: data.role,
    identifier: data.identifier,
  };

  const newPassword = formData.get("password") as string;
  if (newPassword && newPassword.length >= 6) {
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({ where: { id }, data: updateData });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/users");
  return { success: true };
}
