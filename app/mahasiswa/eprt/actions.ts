"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveEprtRecord(eprtDate: string, screenshotUrl: string) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  if (!eprtDate) return { error: "Tanggal EpRT wajib diisi" };
  if (!screenshotUrl) return { error: "File screenshot wajib diunggah" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
  });
  if (!enrollment) return { error: "Tidak terdaftar di kelas manapun" };

  const existing = await prisma.eprtRecord.findUnique({
    where: { enrollmentId: enrollment.id },
  });
  if (existing) return { error: "EpRT sudah diupload sebelumnya" };

  await prisma.eprtRecord.create({
    data: {
      enrollmentId: enrollment.id,
      eprtDate: new Date(eprtDate),
      screenshotUrl,
    },
  });

  revalidatePath("/mahasiswa/eprt");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
