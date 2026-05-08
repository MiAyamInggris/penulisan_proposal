"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export async function uploadEprt(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
  });
  if (!enrollment) return { error: "Tidak terdaftar di kelas manapun" };

  const existing = await prisma.eprtRecord.findUnique({
    where: { enrollmentId: enrollment.id },
  });
  if (existing) return { error: "EpRT sudah diupload sebelumnya" };

  const file = formData.get("screenshot") as File;
  if (!file || file.size === 0) return { error: "File screenshot wajib diupload" };

  const blob = await put(`eprt/${enrollment.id}-${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  await prisma.eprtRecord.create({
    data: {
      enrollmentId: enrollment.id,
      eprtDate: new Date(formData.get("eprtDate") as string),
      screenshotUrl: blob.url,
    },
  });

  revalidatePath("/mahasiswa/eprt");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
