"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function saveNilaiPresentasi(seminarId: string, proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const scoreFields = {
    latarBelakangScore: parseFloat(formData.get("latarBelakangScore") as string),
    teoriPendukungScore: parseFloat(formData.get("teoriPendukungScore") as string),
    toolsPemodelanScore: parseFloat(formData.get("toolsPemodelanScore") as string),
    pemaparanScore: parseFloat(formData.get("pemaparanScore") as string),
    komunikasiScore: parseFloat(formData.get("komunikasiScore") as string),
  };

  const [existing, ctx] = await Promise.all([
    prisma.nilaiPresentasi.findUnique({
      where: { seminarId_pembimbingId: { seminarId, pembimbingId: session.user.id } },
      select: {
        latarBelakangScore: true, teoriPendukungScore: true, toolsPemodelanScore: true,
        pemaparanScore: true, komunikasiScore: true,
      },
    }),
    prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        supervisor1AssignedId: true,
        supervisor2AssignedId: true,
        enrollment: {
          select: {
            student: { select: { name: true, identifier: true } },
            class: { select: { code: true } },
          },
        },
      },
    }),
  ]);

  await prisma.nilaiPresentasi.upsert({
    where: { seminarId_pembimbingId: { seminarId, pembimbingId: session.user.id } },
    update: scoreFields,
    create: { seminarId, pembimbingId: session.user.id, ...scoreFields },
  });

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "SEMINAR_COMPLETED" },
  });

  await computeFinalGrade(proposalId, { id: session.user.id, role: "DOSEN" });
  revalidatePath("/pembimbing/presentasi");

  if (ctx) {
    const dosenRole =
      session.user.id === ctx.supervisor1AssignedId ? "PEMBIMBING_1"
      : session.user.id === ctx.supervisor2AssignedId ? "PEMBIMBING_2"
      : "PEMBIMBING";
    const newTotal = Object.values(scoreFields).reduce((a, b) => a + b, 0);
    const previousTotal = existing
      ? existing.latarBelakangScore + existing.teoriPendukungScore + existing.toolsPemodelanScore +
        existing.pemaparanScore + existing.komunikasiScore
      : null;
    void logAudit(session.user.id, "DOSEN", existing ? "SCORE_UPDATE" : "SCORE_CREATE", {
      assessmentType: "NILAI_PRESENTASI",
      proposalId,
      mahasiswaName: ctx.enrollment.student.name,
      mahasiswaNim: ctx.enrollment.student.identifier,
      classCode: ctx.enrollment.class.code,
      dosenRole,
      isUpdate: !!existing,
      previousTotal,
      newTotal,
      previousFields: existing ? { ...existing } : null,
      newFields: scoreFields,
      source: "MANUAL",
    }, "PROPOSAL", proposalId);
  }

  return { success: true };
}
