"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function scoreDeskEvaluation(proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const [proposal, existing] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        enrollment: {
          include: {
            class: { select: { deDeadline: true, code: true } },
            student: { select: { name: true, identifier: true } },
          },
        },
      },
    }),
    prisma.deskEvaluation.findUnique({
      where: { proposalId },
      select: {
        latarBelakang: true, formulasiMasalah: true, teoriPendukung: true, ideMetode: true,
      },
    }),
  ]);

  if (!proposal) return { error: "Proposal tidak ditemukan" };

  if (proposal.deskEvaluatorId !== session.user.id) {
    return { error: "Anda bukan desk evaluator untuk proposal ini" };
  }

  const isLate =
    proposal.enrollment.class.deDeadline
      ? new Date() > proposal.enrollment.class.deDeadline
      : false;

  const scoreFields = {
    latarBelakang: parseFloat(formData.get("latarBelakang") as string),
    formulasiMasalah: parseFloat(formData.get("formulasiMasalah") as string),
    teoriPendukung: parseFloat(formData.get("teoriPendukung") as string),
    ideMetode: parseFloat(formData.get("ideMetode") as string),
  };
  const catatanReviewer = formData.get("catatanReviewer") as string;

  await prisma.$transaction([
    prisma.deskEvaluation.upsert({
      where: { proposalId },
      update: { ...scoreFields, catatanReviewer, isLate, evaluatorId: session.user.id },
      create: { proposalId, ...scoreFields, catatanReviewer, isLate, evaluatorId: session.user.id },
    }),
    prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "DE_COMPLETED" },
    }),
  ]);

  await computeFinalGrade(proposalId);

  revalidatePath("/pembimbing/desk-evaluation");
  revalidatePath("/dosen-kelas/desk-evaluation");

  const newTotal = scoreFields.latarBelakang + scoreFields.formulasiMasalah +
    scoreFields.teoriPendukung + scoreFields.ideMetode;
  const previousTotal = existing
    ? existing.latarBelakang + existing.formulasiMasalah + existing.teoriPendukung + existing.ideMetode
    : null;
  void logAudit(session.user.id, "DOSEN", existing ? "SCORE_UPDATE" : "SCORE_CREATE", {
    assessmentType: "DESK_EVALUATION",
    proposalId,
    mahasiswaName: proposal.enrollment.student.name,
    mahasiswaNim: proposal.enrollment.student.identifier,
    classCode: proposal.enrollment.class.code,
    dosenRole: "DESK_EVALUATOR",
    isUpdate: !!existing,
    previousTotal,
    newTotal,
    previousFields: existing ? { ...existing } : null,
    newFields: { ...scoreFields, isLate },
    source: "MANUAL",
  }, "PROPOSAL", proposalId);

  return { success: true };
}
