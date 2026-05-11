"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

async function uploadPdf(file: File, path: string): Promise<string> {
  if (file.type !== "application/pdf")
    throw new Error("Hanya file PDF yang diperbolehkan");
  if (file.size > MAX_PDF_BYTES)
    throw new Error("Ukuran file maksimal 5 MB");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return `/local-uploads/${path}`;
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(path, file, { access: "public" });
  return blob.url;
}

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

  const file = formData.get("proposalFile") as File | null;
  let proposalUrl: string | null = null;

  if (file && file.size > 0) {
    try {
      proposalUrl = await uploadPdf(
        file,
        `proposals/${enrollment.id}-${Date.now()}.pdf`
      );
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Gagal mengupload file" };
    }
  }

  await prisma.proposal.create({
    data: {
      enrollmentId: enrollment.id,
      titleId: formData.get("titleId") as string,
      titleEn: (formData.get("titleEn") as string) || null,
      topicArea: (formData.get("topicArea") as string) || null,
      supervisor1RequestedId: (formData.get("supervisor1RequestedId") as string) || null,
      supervisor2RequestedId: (formData.get("supervisor2RequestedId") as string) || null,
      proposalUrl,
      proposalUploadedAt: proposalUrl ? new Date() : null,
      status: "PROPOSAL_UPLOADED",
    },
  });

  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function uploadProposalFile(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: { proposal: { select: { id: true, status: true } } },
  });

  if (!enrollment?.proposal) return { error: "Proposal belum terdaftar" };

  const file = formData.get("proposalFile") as File | null;
  if (!file || file.size === 0) return { error: "Pilih file PDF terlebih dahulu" };

  let proposalUrl: string;
  try {
    proposalUrl = await uploadPdf(
      file,
      `proposals/${enrollment.id}-${Date.now()}.pdf`
    );
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Gagal mengupload file" };
  }

  await prisma.proposal.update({
    where: { id: enrollment.proposal.id },
    data: { proposalUrl, proposalUploadedAt: new Date() },
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
    data: { status: "DE_READY" },
  });

  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function uploadRevision(proposalId: string, revisionUrl: string, presentationUrl: string) {
  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      revisionUrl,
      presentationUrl,
      revisionUploadedAt: new Date(),
      status: "REVISION_UPLOADED",
    },
  });
  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
