"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function saveNilaiBimbingan(proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const scoreFields = {
    pemilihanTema: parseFloat(formData.get("pemilihanTema") as string),
    researchQuestion: parseFloat(formData.get("researchQuestion") as string),
    studiLiteratur1: parseFloat(formData.get("studiLiteratur1") as string),
    studiLiteratur2: parseFloat(formData.get("studiLiteratur2") as string),
    rencanaImplementasi: parseFloat(formData.get("rencanaImplementasi") as string),
    kemandirian: parseFloat(formData.get("kemandirian") as string),
    prosesBimbingan: parseFloat(formData.get("prosesBimbingan") as string),
  };
  const data = { ...scoreFields, notes: (formData.get("notes") as string) || null };

  const [existing, ctx] = await Promise.all([
    prisma.nilaiBimbingan.findUnique({
      where: { proposalId_pembimbingId: { proposalId, pembimbingId: session.user.id } },
      select: {
        pemilihanTema: true, researchQuestion: true, studiLiteratur1: true,
        studiLiteratur2: true, rencanaImplementasi: true, kemandirian: true, prosesBimbingan: true,
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

  await prisma.nilaiBimbingan.upsert({
    where: { proposalId_pembimbingId: { proposalId, pembimbingId: session.user.id } },
    update: { ...data },
    create: { proposalId, pembimbingId: session.user.id, ...data },
  });

  await computeFinalGrade(proposalId);
  revalidatePath("/pembimbing/bimbingan");

  if (ctx) {
    const dosenRole =
      session.user.id === ctx.supervisor1AssignedId ? "PEMBIMBING_1"
      : session.user.id === ctx.supervisor2AssignedId ? "PEMBIMBING_2"
      : "PEMBIMBING";
    const newTotal = Object.values(scoreFields).reduce((a, b) => a + b, 0);
    const previousTotal = existing
      ? existing.pemilihanTema + existing.researchQuestion + existing.studiLiteratur1 +
        existing.studiLiteratur2 + existing.rencanaImplementasi + existing.kemandirian + existing.prosesBimbingan
      : null;
    void logAudit(session.user.id, "DOSEN", existing ? "SCORE_UPDATE" : "SCORE_CREATE", {
      assessmentType: "NILAI_BIMBINGAN",
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
