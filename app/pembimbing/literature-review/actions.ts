"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFinalGrade } from "@/lib/grade-engine";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function saveNilaiLR(proposalId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const scoreFields = {
    kualitasPustaka: parseFloat(formData.get("kualitasPustaka") as string),
    kontenRumusan: parseFloat(formData.get("kontenRumusan") as string),
    analisisTujuan: parseFloat(formData.get("analisisTujuan") as string),
    kelengkapanKajian: parseFloat(formData.get("kelengkapanKajian") as string),
    kelebihanKekurangan: parseFloat(formData.get("kelebihanKekurangan") as string),
    relasiTeori: parseFloat(formData.get("relasiTeori") as string),
  };
  const data = { ...scoreFields, catatan: (formData.get("catatan") as string) || null };

  const [existing, ctx] = await Promise.all([
    prisma.nilaiLiteratureReview.findUnique({
      where: { proposalId_pembimbingId: { proposalId, pembimbingId: session.user.id } },
      select: {
        kualitasPustaka: true, kontenRumusan: true, analisisTujuan: true,
        kelengkapanKajian: true, kelebihanKekurangan: true, relasiTeori: true,
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

  await prisma.nilaiLiteratureReview.upsert({
    where: { proposalId_pembimbingId: { proposalId, pembimbingId: session.user.id } },
    update: data,
    create: { proposalId, pembimbingId: session.user.id, ...data },
  });

  await computeFinalGrade(proposalId, { id: session.user.id, role: "DOSEN" });
  revalidatePath("/pembimbing/literature-review");

  if (ctx) {
    const dosenRole =
      session.user.id === ctx.supervisor1AssignedId ? "PEMBIMBING_1"
      : session.user.id === ctx.supervisor2AssignedId ? "PEMBIMBING_2"
      : "PEMBIMBING";
    const newTotal = Object.values(scoreFields).reduce((a, b) => a + b, 0);
    const previousTotal = existing
      ? existing.kualitasPustaka + existing.kontenRumusan + existing.analisisTujuan +
        existing.kelengkapanKajian + existing.kelebihanKekurangan + existing.relasiTeori
      : null;
    void logAudit(session.user.id, "DOSEN", existing ? "SCORE_UPDATE" : "SCORE_CREATE", {
      assessmentType: "NILAI_LR",
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
