import { prisma } from "./prisma";

export function getGradeIndex(score: number): string {
  if (score > 85) return "A";
  if (score > 75) return "AB";
  if (score > 65) return "B";
  if (score > 60) return "BC";
  if (score > 50) return "C";
  if (score > 40) return "D";
  return "E";
}

export async function computeFinalGrade(proposalId: string): Promise<void> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      enrollment: { include: { class: { include: { program: true } } } },
      nilaiBimbingan: true,
      deskEvaluation: true,
      seminar: { include: { nilaiPresentasi: true } },
      nilaiLiteratureReview: true,
    },
  });

  if (!proposal) return;

  const program = proposal.enrollment.class.program;

  // Compute individual scores (average if 2 pembimbing)
  let bimbinganScore: number | null = null;
  if (proposal.nilaiBimbingan.length > 0) {
    const totals = proposal.nilaiBimbingan.map(
      (n) =>
        n.pemilihanTema +
        n.researchQuestion +
        n.studiLiteratur1 +
        n.studiLiteratur2 +
        n.rencanaImplementasi +
        n.kemandirian +
        n.prosesBimbingan
    );
    bimbinganScore = totals.reduce((a, b) => a + b, 0) / totals.length;
  }

  let lrScore: number | null = null;
  if (proposal.nilaiLiteratureReview.length > 0) {
    const totals = proposal.nilaiLiteratureReview.map(
      (n) =>
        n.kualitasPustaka +
        n.kontenRumusan +
        n.analisisTujuan +
        n.kelengkapanKajian +
        n.kelebihanKekurangan +
        n.relasiTeori
    );
    lrScore = totals.reduce((a, b) => a + b, 0) / totals.length;
  }

  let deScore: number | null = null;
  if (proposal.deskEvaluation) {
    const de = proposal.deskEvaluation;
    const rawTotal =
      de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode;
    deScore = de.isLate ? Math.min(rawTotal, 51) : rawTotal;
  }

  let presentasiScore: number | null = null;
  if (proposal.seminar && proposal.seminar.nilaiPresentasi.length > 0) {
    const totals = proposal.seminar.nilaiPresentasi.map(
      (n) =>
        n.latarBelakangScore +
        n.teoriPendukungScore +
        n.toolsPemodelanScore +
        n.pemaparanScore +
        n.komunikasiScore
    );
    presentasiScore = totals.reduce((a, b) => a + b, 0) / totals.length;
  }

  // Only compute final grade if all required scores exist
  let weightedTotal: number | null = null;
  let gradeIndex: string | null = null;
  let passed: boolean | null = null;

  if (
    lrScore !== null &&
    bimbinganScore !== null &&
    deScore !== null &&
    presentasiScore !== null
  ) {
    weightedTotal =
      (lrScore * program.literatureReviewPct) / 100 +
      (bimbinganScore * program.bimbinganPct) / 100 +
      (deScore * program.deskEvaluationPct) / 100 +
      (presentasiScore * program.presentasiPct) / 100;
    gradeIndex = getGradeIndex(weightedTotal);
    passed = weightedTotal > 50;
  }

  await prisma.finalGrade.upsert({
    where: { proposalId },
    update: {
      lrScore,
      bimbinganScore,
      deScore,
      presentasiScore,
      weightedTotal,
      gradeIndex,
      passed,
      computedAt: weightedTotal !== null ? new Date() : null,
    },
    create: {
      proposalId,
      lrScore,
      bimbinganScore,
      deScore,
      presentasiScore,
      weightedTotal,
      gradeIndex,
      passed,
      computedAt: weightedTotal !== null ? new Date() : null,
    },
  });
}
