"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function registerProposal(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
  });
  if (!enrollment) return { error: "Anda tidak terdaftar di kelas manapun" };

  const existing = await prisma.proposal.findUnique({
    where: { enrollmentId: enrollment.id },
  });
  if (existing) return { error: "Proposal sudah terdaftar" };

  await prisma.proposal.create({
    data: {
      enrollmentId: enrollment.id,
      titleId: formData.get("titleId") as string,
      titleEn: (formData.get("titleEn") as string) || null,
      topicArea: (formData.get("topicArea") as string) || null,
      supervisor1RequestedId: (formData.get("supervisor1RequestedId") as string) || null,
      supervisor2RequestedId: (formData.get("supervisor2RequestedId") as string) || null,
      status: "BIMBINGAN",
    },
  });

  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function submitForDE() {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      proposal: { include: { bimbinganSessions: true } },
      eprt: true,
    },
  });

  if (!enrollment?.proposal) return { error: "Proposal belum terdaftar" };
  if (enrollment.proposal.bimbinganSessions.length < 3)
    return { error: "Minimal 3 sesi bimbingan diperlukan" };
  if (!enrollment.eprt || enrollment.eprt.status !== "VERIFIED")
    return { error: "EpRT harus terverifikasi terlebih dahulu" };

  await prisma.proposal.update({
    where: { id: enrollment.proposal.id },
    data: { status: "DE_SUBMITTED" },
  });

  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function uploadProposalPdf(proposalId: string, pdfUrl: string) {
  await prisma.proposal.update({
    where: { id: proposalId },
    data: { pdfUrl, pdfUploadedAt: new Date(), status: "COMPLETED" },
  });
  revalidatePath("/mahasiswa/proposal");
  return { success: true };
}
