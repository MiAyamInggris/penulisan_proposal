"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeFinalGrade } from "@/lib/grade-engine";
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

  const proposal = await prisma.proposal.findUnique({
    where: { id: data.proposalId },
    include: {
      enrollment: { include: { class: { select: { deDeadline: true } } } },
    },
  });

  if (!proposal) throw new Error("Proposal not found");
  if (proposal.deskEvaluatorId !== session.user.id) {
    throw new Error("You are not assigned as the desk evaluator for this proposal");
  }

  const isLate = proposal.enrollment.class.deDeadline
    ? new Date() > proposal.enrollment.class.deDeadline
    : false;

  await prisma.deskEvaluation.upsert({
    where: { proposalId: data.proposalId },
    update: {
      latarBelakang: data.latarBelakang,
      formulasiMasalah: data.formulasiMasalah,
      teoriPendukung: data.teoriPendukung,
      ideMetode: data.ideMetode,
      catatanReviewer: data.catatanReviewer,
      isLate,
      evaluatorId: session.user.id,
    },
    create: {
      proposalId: data.proposalId,
      evaluatorId: session.user.id,
      latarBelakang: data.latarBelakang,
      formulasiMasalah: data.formulasiMasalah,
      teoriPendukung: data.teoriPendukung,
      ideMetode: data.ideMetode,
      catatanReviewer: data.catatanReviewer,
      isLate,
    },
  });

  if (proposal.status === "DE_READY" || proposal.status === "ASSIGNED") {
    await prisma.proposal.update({
      where: { id: data.proposalId },
      data: { status: "DE_COMPLETED" },
    });
  }

  await computeFinalGrade(data.proposalId);

  revalidatePath("/dosen/desk-evaluation-assessment");
  revalidatePath(`/dosen/desk-evaluation-assessment/${data.proposalId}`);
  revalidatePath("/dosen-kelas/desk-evaluation");
  revalidatePath("/dosen-kelas/nilai");

  return { success: true };
}
