"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeFinalGrade } from "@/lib/grade-engine";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function submitDeskEvaluation(data: {
  proposalId: string;
  latarBelakang: number;
  formulasiMasalah: number;
  teoriPendukung: number;
  ideMetode: number;
  catatanReviewer?: string;
}) {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN") {
    throw new Error("Unauthorized");
  }

  const [proposal, existing] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id: data.proposalId },
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
      where: { proposalId: data.proposalId },
      select: {
        latarBelakang: true, formulasiMasalah: true, teoriPendukung: true, ideMetode: true,
      },
    }),
  ]);

  if (!proposal) throw new Error("Proposal not found");
  if (proposal.deskEvaluatorId !== session.user.id) {
    throw new Error("You are not assigned as the desk evaluator for this proposal");
  }

  const isLate = proposal.enrollment.class.deDeadline
    ? new Date() > proposal.enrollment.class.deDeadline
    : false;

  const scoreFields = {
    latarBelakang: data.latarBelakang,
    formulasiMasalah: data.formulasiMasalah,
    teoriPendukung: data.teoriPendukung,
    ideMetode: data.ideMetode,
  };

  await prisma.deskEvaluation.upsert({
    where: { proposalId: data.proposalId },
    update: { ...scoreFields, catatanReviewer: data.catatanReviewer, isLate, evaluatorId: session.user.id },
    create: { proposalId: data.proposalId, evaluatorId: session.user.id, ...scoreFields, catatanReviewer: data.catatanReviewer, isLate },
  });

  if (proposal.status === "DE_READY" || proposal.status === "ASSIGNED") {
    await prisma.proposal.update({
      where: { id: data.proposalId },
      data: { status: "DE_COMPLETED" },
    });
  }

  await computeFinalGrade(data.proposalId, { id: session.user.id, role: "DOSEN" });

  revalidatePath("/dosen/desk-evaluation-assessment");
  revalidatePath(`/dosen/desk-evaluation-assessment/${data.proposalId}`);
  revalidatePath("/dosen-kelas/desk-evaluation");
  revalidatePath("/dosen-kelas/nilai");

  const newTotal = scoreFields.latarBelakang + scoreFields.formulasiMasalah +
    scoreFields.teoriPendukung + scoreFields.ideMetode;
  const previousTotal = existing
    ? existing.latarBelakang + existing.formulasiMasalah + existing.teoriPendukung + existing.ideMetode
    : null;
  void logAudit(session.user.id, "DOSEN", existing ? "SCORE_UPDATE" : "SCORE_CREATE", {
    assessmentType: "DESK_EVALUATION",
    proposalId: data.proposalId,
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
  }, "PROPOSAL", data.proposalId);

  return { success: true };
}
