"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function uploadToBlob(path: string, file: File): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Local dev fallback: store filename as placeholder URL
    return `/local-uploads/${path}`;
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(path, file, { access: "public" });
  return blob.url;
}

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

  const screenshotUrl = await uploadToBlob(
    `eprt/${enrollment.id}-${Date.now()}-${file.name}`,
    file
  );

  await prisma.eprtRecord.create({
    data: {
      enrollmentId: enrollment.id,
      eprtDate: new Date(formData.get("eprtDate") as string),
      screenshotUrl,
    },
  });

  revalidatePath("/mahasiswa/eprt");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
