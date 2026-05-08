"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function enrollStudent(classId: string, studentId: string) {
  const existing = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });

  if (existing) return { error: "Mahasiswa sudah terdaftar di kelas ini" };

  await prisma.classEnrollment.create({ data: { classId, studentId } });
  revalidatePath("/admin/enrollments");
  return { success: true };
}

export async function removeEnrollment(enrollmentId: string) {
  await prisma.classEnrollment.update({
    where: { id: enrollmentId },
    data: { isActive: false },
  });
  revalidatePath("/admin/enrollments");
  return { success: true };
}
