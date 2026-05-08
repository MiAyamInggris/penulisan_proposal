"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { revalidatePath } from "next/cache";

export async function scoreDeskEvaluation(proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      enrollment: {
        include: { class: { select: { deDeadline: true } } },
      },
    },
  });

  if (!proposal) return { error: "Proposal tidak ditemukan" };

  if (proposal.deskEvaluatorId !== session.user.id) {
    return { error: "Anda bukan desk evaluator untuk proposal ini" };
  }

  const isLate =
    proposal.enrollment.class.deDeadline
      ? new Date() > proposal.enrollment.class.deDeadline
      : false;

  const latarBelakang = parseFloat(formData.get("latarBelakang") as string);
  const formulasiMasalah = parseFloat(formData.get("formulasiMasalah") as string);
  const teoriPendukung = parseFloat(formData.get("teoriPendukung") as string);
  const ideMetode = parseFloat(formData.get("ideMetode") as string);
  const catatanReviewer = formData.get("catatanReviewer") as string;

  await prisma.$transaction([
    prisma.deskEvaluation.upsert({
      where: { proposalId },
      update: { latarBelakang, formulasiMasalah, teoriPendukung, ideMetode, catatanReviewer, isLate, evaluatorId: session.user.id },
      create: { proposalId, latarBelakang, formulasiMasalah, teoriPendukung, ideMetode, catatanReviewer, isLate, evaluatorId: session.user.id },
    }),
    prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "DE_COMPLETED" },
    }),
  ]);

  await computeFinalGrade(proposalId);

  revalidatePath("/pembimbing/desk-evaluation");
  revalidatePath("/dosen-kelas/desk-evaluation");
  return { success: true };
}
