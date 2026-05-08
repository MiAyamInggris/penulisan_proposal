"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addBimbinganSession(formData: FormData) {
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
  if (!["ASSIGNED", "BIMBINGAN", "DE_READY"].includes(enrollment.proposal.status)) {
    return { error: "Tidak dapat menambah sesi bimbingan pada status ini" };
  }

  const count = enrollment.proposal.bimbinganSessions.length;

  await prisma.bimbinganSession.create({
    data: {
      proposalId: enrollment.proposal.id,
      sessionNumber: count + 1,
      date: new Date(formData.get("date") as string),
      topicsDiscussed: formData.get("topicsDiscussed") as string,
      nextPlan: formData.get("nextPlan") as string,
      notes: (formData.get("notes") as string) || null,
    },
  });

  // If first session and status = ASSIGNED, move to BIMBINGAN
  const newCount = count + 1;
  if (enrollment.proposal.status === "ASSIGNED" && newCount === 1) {
    await prisma.proposal.update({
      where: { id: enrollment.proposal.id },
      data: { status: "BIMBINGAN" },
    });
  }

  // If 3+ sessions and EpRT verified, move to DE_READY
  if (
    newCount >= 3 &&
    enrollment.eprt?.status === "VERIFIED" &&
    enrollment.proposal.status === "BIMBINGAN"
  ) {
    await prisma.proposal.update({
      where: { id: enrollment.proposal.id },
      data: { status: "DE_READY" },
    });
  }

  revalidatePath("/mahasiswa/bimbingan");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function checkAndUpdateDeReady(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      bimbinganSessions: { select: { id: true } },
      enrollment: { include: { eprt: true } },
    },
  });

  if (!proposal) return;
  if (proposal.status !== "BIMBINGAN") return;

  const hasEnoughSessions = proposal.bimbinganSessions.length >= 3;
  const eprtVerified = proposal.enrollment.eprt?.status === "VERIFIED";

  if (hasEnoughSessions && eprtVerified) {
    await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "DE_READY" },
    });
    revalidatePath("/mahasiswa/dashboard");
    revalidatePath("/mahasiswa/bimbingan");
  }
}

export async function uploadEprt(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: { proposal: { include: { bimbinganSessions: { select: { id: true } } } } },
  });
  if (!enrollment) return { error: "Tidak terdaftar di kelas manapun" };

  const existing = await prisma.eprtRecord.findUnique({
    where: { enrollmentId: enrollment.id },
  });
  if (existing) return { error: "EpRT sudah diupload sebelumnya" };

  const screenshotUrl = formData.get("screenshotUrl") as string;
  if (!screenshotUrl) return { error: "URL screenshot wajib diisi" };

  await prisma.eprtRecord.create({
    data: {
      enrollmentId: enrollment.id,
      eprtDate: new Date(formData.get("eprtDate") as string),
      screenshotUrl,
    },
  });

  revalidatePath("/mahasiswa/bimbingan");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
