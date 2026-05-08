"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClass(formData: FormData) {
  await prisma.class.create({
    data: {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      semester: formData.get("semester") as string,
      academicYear: formData.get("academicYear") as string,
      programId: formData.get("programId") as string,
      dosenKelasId: formData.get("dosenKelasId") as string,
    },
  });
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function updateClass(id: string, formData: FormData) {
  await prisma.class.update({
    where: { id },
    data: {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      semester: formData.get("semester") as string,
      academicYear: formData.get("academicYear") as string,
      programId: formData.get("programId") as string,
      dosenKelasId: formData.get("dosenKelasId") as string,
    },
  });
  revalidatePath("/admin/classes");
  return { success: true };
}

export async function updateClassDeadline(classId: string, deadline: string) {
  await prisma.class.update({
    where: { id: classId },
    data: { deDeadline: deadline ? new Date(deadline) : null },
  });
  revalidatePath("/admin/classes");
  return { success: true };
}
