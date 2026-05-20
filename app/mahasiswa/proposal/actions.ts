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

  const titleId = (formData.get("titleId") as string)?.trim();
  const abstract = (formData.get("abstract") as string)?.trim();

  if (!titleId) return { error: "Judul TA wajib diisi" };
  if (!abstract) return { error: "Abstrak wajib diisi" };
  if (abstract.length < 50)
    return { error: "Abstrak terlalu singkat (minimal 50 karakter)" };
  if (abstract.length > 2000)
    return { error: "Abstrak terlalu panjang (maksimal 2000 karakter)" };

  await prisma.proposal.create({
    data: {
      enrollmentId: enrollment.id,
      titleId,
      titleEn: (formData.get("titleEn") as string)?.trim() || null,
      topicArea: (formData.get("topicArea") as string)?.trim() || null,
      abstract,
      supervisor1RequestedId: (formData.get("supervisor1RequestedId") as string) || null,
      supervisor2RequestedId: (formData.get("supervisor2RequestedId") as string) || null,
      status: "PROPOSAL_UPLOADED",
    },
  });

  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function saveProposalLink(proposalUrl: string) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };
  if (!proposalUrl) return { error: "Link proposal wajib diisi" };
  if (!isValidUrl(proposalUrl))
    return { error: "Format link tidak valid. Gunakan URL yang dimulai dengan https://" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: { proposal: { select: { id: true, status: true } } },
  });

  if (!enrollment?.proposal) return { error: "Proposal belum terdaftar" };

  const allowed = ["PROPOSAL_UPLOADED", "ASSIGNED", "BIMBINGAN"];
  if (!allowed.includes(enrollment.proposal.status))
    return { error: "Status proposal tidak mengizinkan perubahan link" };

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
