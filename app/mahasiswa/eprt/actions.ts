"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveEprtRecord(eprtDate: string, screenshotUrl: string) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  if (!eprtDate) return { error: "Tanggal EpRT wajib diisi" };
  if (!screenshotUrl) return { error: "Link EpRT wajib diisi" };
  if (!isValidUrl(screenshotUrl))
    return { error: "Format link tidak valid. Gunakan URL yang dimulai dengan https://" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
  });
  if (!enrollment) return { error: "Tidak terdaftar di kelas manapun" };

  const existing = await prisma.eprtRecord.findUnique({
    where: { enrollmentId: enrollment.id },
  });
  if (existing) return { error: "EpRT sudah disubmit sebelumnya" };

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
