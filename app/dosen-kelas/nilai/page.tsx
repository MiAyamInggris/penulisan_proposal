import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RekapTable } from "./rekap-table";

export default async function NilaiRekapPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const myClasses = await prisma.class.findMany({
    where: { dosenKelasId: session.user.id },
    select: {
      id: true,
      program: {
        select: {
          literatureReviewPct: true,
          bimbinganPct: true,
          deskEvaluationPct: true,
          presentasiPct: true,
        },
      },
    },
  });
  const myClassIds = myClasses.map((c) => c.id);
  const programByClassId = Object.fromEntries(myClasses.map((c) => [c.id, c.program]));

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: { in: myClassIds }, isActive: true },
    include: {
      student: { select: { name: true, identifier: true } },
      class: { select: { id: true, code: true, program: { select: { code: true } } } },
      proposal: {
        include: {
          finalGrade: true,
          deskEvaluation: { include: { evaluator: { select: { name: true } } } },
          nilaiBimbingan: { include: { pembimbing: { select: { name: true } } } },
          nilaiLiteratureReview: { include: { pembimbing: { select: { name: true } } } },
          seminar: { include: { nilaiPresentasi: { include: { pembimbing: { select: { name: true } } } } } },
        },
      },
    },
    orderBy: [{ class: { code: "asc" } }, { student: { name: "asc" } }],
  });

  function avg(values: number[]): number | null {
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  const rows = enrollments.map((e) => {
    const p = e.proposal;
    const program = programByClassId[e.class.id];

    const bimbinganScore = p?.nilaiBimbingan.length
      ? avg(p.nilaiBimbingan.map((n) => n.pemilihanTema + n.researchQuestion + n.studiLiteratur1 + n.studiLiteratur2 + n.rencanaImplementasi + n.kemandirian + n.prosesBimbingan))
      : (p?.finalGrade?.bimbinganScore ?? null);

    const lrScore = p?.nilaiLiteratureReview.length
      ? avg(p.nilaiLiteratureReview.map((n) => n.kualitasPustaka + n.kontenRumusan + n.analisisTujuan + n.kelengkapanKajian + n.kelebihanKekurangan + n.relasiTeori))
      : (p?.finalGrade?.lrScore ?? null);

    const de = p?.deskEvaluation ?? null;
    const deRaw = de ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode : null;
    const deScore = de ? (de.isLate ? Math.min(deRaw!, 51) : deRaw) : (p?.finalGrade?.deScore ?? null);

    const presentasiScore = p?.seminar?.nilaiPresentasi.length
      ? avg(p.seminar.nilaiPresentasi.map((n) => n.latarBelakangScore + n.teoriPendukungScore + n.toolsPemodelanScore + n.pemaparanScore + n.komunikasiScore))
      : (p?.finalGrade?.presentasiScore ?? null);

    // Compute weighted total if all components available and we have program weights
    let weightedTotal = p?.finalGrade?.weightedTotal ?? null;
    let gradeIndex = p?.finalGrade?.gradeIndex ?? null;
    let passed = p?.finalGrade?.passed ?? null;

    if (
      weightedTotal === null &&
      lrScore !== null &&
      bimbinganScore !== null &&
      deScore !== null &&
      presentasiScore !== null &&
      program
    ) {
      weightedTotal =
        (lrScore * program.literatureReviewPct) / 100 +
        (bimbinganScore * program.bimbinganPct) / 100 +
        (deScore * program.deskEvaluationPct) / 100 +
        (presentasiScore * program.presentasiPct) / 100;
      if (weightedTotal > 85) gradeIndex = "A";
      else if (weightedTotal > 75) gradeIndex = "AB";
      else if (weightedTotal > 65) gradeIndex = "B";
      else if (weightedTotal > 60) gradeIndex = "BC";
      else if (weightedTotal > 50) gradeIndex = "C";
      else if (weightedTotal > 40) gradeIndex = "D";
      else gradeIndex = "E";
      passed = weightedTotal > 50;
    }

    return {
      id: e.id,
      nim: e.student.identifier,
      name: e.student.name,
      kelas: e.class.code,
      prodi: e.class.program.code,
      status: p?.status ?? "ENROLLED",
      lrScore,
      bimbinganScore,
      deScore,
      presentasiScore,
      weightedTotal,
      gradeIndex,
      passed,
      isLate: de?.isLate ?? false,
      weights: program
        ? {
            bimbinganPct: program.bimbinganPct,
            lrPct: program.literatureReviewPct,
            dePct: program.deskEvaluationPct,
            presentasiPct: program.presentasiPct,
          }
        : null,
      detail: {
        nilaiBimbingan: (p?.nilaiBimbingan ?? []).map((n) => ({
          pembimbingName: n.pembimbing.name,
          pemilihanTema: n.pemilihanTema,
          researchQuestion: n.researchQuestion,
          studiLiteratur1: n.studiLiteratur1,
          studiLiteratur2: n.studiLiteratur2,
          rencanaImplementasi: n.rencanaImplementasi,
          kemandirian: n.kemandirian,
          prosesBimbingan: n.prosesBimbingan,
          notes: n.notes ?? null,
        })),
        nilaiLiteratureReview: (p?.nilaiLiteratureReview ?? []).map((n) => ({
          pembimbingName: n.pembimbing.name,
          kualitasPustaka: n.kualitasPustaka,
          kontenRumusan: n.kontenRumusan,
          analisisTujuan: n.analisisTujuan,
          kelengkapanKajian: n.kelengkapanKajian,
          kelebihanKekurangan: n.kelebihanKekurangan,
          relasiTeori: n.relasiTeori,
          catatan: n.catatan ?? null,
        })),
        deskEvaluation: de
          ? {
              evaluatorName: de.evaluator.name,
              latarBelakang: de.latarBelakang,
              formulasiMasalah: de.formulasiMasalah,
              teoriPendukung: de.teoriPendukung,
              ideMetode: de.ideMetode,
              catatanReviewer: de.catatanReviewer ?? null,
              isLate: de.isLate,
            }
          : null,
        nilaiPresentasi: (p?.seminar?.nilaiPresentasi ?? []).map((n) => ({
          pembimbingName: n.pembimbing.name,
          latarBelakangScore: n.latarBelakangScore,
          teoriPendukungScore: n.teoriPendukungScore,
          toolsPemodelanScore: n.toolsPemodelanScore,
          pemaparanScore: n.pemaparanScore,
          komunikasiScore: n.komunikasiScore,
        })),
      },
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rekap Nilai</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nilai seluruh mahasiswa di kelas Anda
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tabel Rekap Nilai</CardTitle>
        </CardHeader>
        <CardContent>
          <RekapTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
