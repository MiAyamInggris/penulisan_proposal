"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

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

  const sup1Id = (formData.get("supervisor1RequestedId") as string) || null;
  const sup2Id = (formData.get("supervisor2RequestedId") as string) || null;

  if (sup1Id && sup1Id === sup2Id) {
    return { error: "Pembimbing 1 dan 2 tidak boleh sama" };
  }

  await prisma.proposal.create({
    data: {
      enrollmentId: enrollment.id,
      titleId: formData.get("titleId") as string,
      titleEn: (formData.get("titleEn") as string) || null,
      topicArea: (formData.get("topicArea") as string) || null,
      supervisor1RequestedId: sup1Id,
      supervisor2RequestedId: sup2Id,
      status: "ENROLLED",
    },
  });

  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function uploadProposalPdf(proposalId: string, proposalUrl: string) {
  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      proposalUrl,
      proposalUploadedAt: new Date(),
      status: "PROPOSAL_UPLOADED",
    },
  });
  revalidatePath("/mahasiswa/proposal");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function uploadRevision(
  proposalId: string,
  revisionUrl: string,
  presentationUrl: string
) {
  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      revisionUrl,
      presentationUrl,
      revisionUploadedAt: new Date(),
      status: "REVISION_UPLOADED",
    },
  });
  revalidatePath("/mahasiswa/revisi");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function registerForSeminar(proposalId: string) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true } },
          proposal: { include: { bimbinganSessions: true } },
          eprt: true,
        },
      },
    },
  });

  if (!proposal) return { error: "Proposal tidak ditemukan" };
  if (proposal.status !== "REVISION_UPLOADED")
    return { error: "Status proposal belum memenuhi syarat pendaftaran seminar" };

  const bimbinganCount = proposal.enrollment.proposal?.bimbinganSessions.length ?? 0;
  if (bimbinganCount < 3)
    return { error: "Minimal 3 sesi bimbingan diperlukan" };

  const eprt = proposal.enrollment.eprt;
  if (!eprt || eprt.status !== "VERIFIED")
    return { error: "EpRT harus terverifikasi terlebih dahulu" };

  if (!proposal.revisionUrl || !proposal.presentationUrl)
    return { error: "Revisi dan file presentasi harus diunggah terlebih dahulu" };

  await prisma.$transaction([
    prisma.seminar.create({
      data: { proposalId, status: "REGISTERED", registeredAt: new Date() },
    }),
    prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "SEMINAR_REGISTERED" },
    }),
  ]);

  const studentName = proposal.enrollment.student.name;
  const notifTitle = "Mahasiswa Siap Seminar Proposal";
  const notifMsg = `${studentName} telah mendaftarkan diri untuk Seminar Proposal. Silakan jadwalkan seminar.`;

  if (proposal.supervisor1AssignedId) {
    await createNotification(
      proposal.supervisor1AssignedId,
      "SEMINAR_REGISTRATION",
      notifTitle,
      notifMsg,
      proposalId
    );
  }
  if (proposal.supervisor2AssignedId) {
    await createNotification(
      proposal.supervisor2AssignedId,
      "SEMINAR_REGISTRATION",
      notifTitle,
      notifMsg,
      proposalId
    );
  }

  revalidatePath("/mahasiswa/seminar");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
