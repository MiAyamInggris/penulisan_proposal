"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";
import { checkAndUpdateDeReady } from "./bimbingan";

export async function assignSupervisors(
  proposalId: string,
  supervisor1Id: string,
  supervisor2Id: string | null
) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  if (supervisor1Id && supervisor2Id && supervisor1Id === supervisor2Id) {
    return { error: "Pembimbing 1 dan 2 tidak boleh sama" };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      enrollment: { include: { student: { select: { name: true } } } },
    },
  });
  if (!proposal) return { error: "Proposal tidak ditemukan" };

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      supervisor1AssignedId: supervisor1Id || null,
      supervisor2AssignedId: supervisor2Id || null,
      status: "ASSIGNED",
    },
  });

  const studentName = proposal.enrollment.student.name;
  const notifMsg = `Anda ditugaskan sebagai pembimbing untuk mahasiswa ${studentName}.`;

  if (supervisor1Id) {
    await createNotification(
      supervisor1Id,
      "ASSIGNMENT_MADE",
      "Penugasan Pembimbing",
      notifMsg,
      proposalId
    );
  }
  if (supervisor2Id) {
    await createNotification(
      supervisor2Id,
      "ASSIGNMENT_MADE",
      "Penugasan Pembimbing",
      notifMsg,
      proposalId
    );
  }

  revalidatePath("/dosen-kelas/supervisor");
  revalidatePath("/dosen/kelas");
  return { success: true };
}

export async function verifyEprt(eprtId: string) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const eprt = await prisma.eprtRecord.update({
    where: { id: eprtId },
    data: {
      status: "VERIFIED",
      verifiedById: session.user.id,
      verifiedAt: new Date(),
    },
    include: {
      enrollment: { include: { proposal: { select: { id: true } } } },
    },
  });

  if (eprt.enrollment.proposal?.id) {
    await checkAndUpdateDeReady(eprt.enrollment.proposal.id);
  }

  revalidatePath("/dosen-kelas/eprt");
  revalidatePath("/dosen/kelas");
  return { success: true };
}

export async function rejectEprt(eprtId: string) {
  await prisma.eprtRecord.delete({ where: { id: eprtId } });
  revalidatePath("/dosen-kelas/eprt");
  revalidatePath("/dosen/kelas");
  return { success: true };
}

export async function setDeDeadline(classId: string, deadline: string) {
  await prisma.class.update({
    where: { id: classId },
    data: { deDeadline: new Date(deadline) },
  });
  revalidatePath("/dosen/kelas");
  revalidatePath("/dosen-kelas/kelas");
  return { success: true };
}
