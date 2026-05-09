"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addBimbinganSession(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: { proposal: { include: { bimbinganSessions: true } } },
  });

  if (!enrollment?.proposal) return { error: "Proposal belum terdaftar" };

  if (!enrollment.proposal.supervisor1AssignedId)
    return { error: "Pembimbing belum ditugaskan. Tunggu penugasan dari Dosen Kelas." };

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

  revalidatePath("/mahasiswa/bimbingan");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
