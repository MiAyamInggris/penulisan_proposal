import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getMyProdi } from "@/lib/kaprodi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RekapTable } from "@/app/dosen-kelas/nilai/rekap-table";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function KaprodiRekapClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const session = await auth();
  if (!session || !session.user.isKaprodi) redirect("/login");

  const prodi = await getMyProdi(session.user.id);
  if (!prodi) redirect("/dosen-select-role");

  const { classId } = await params;

  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      code: true,
      name: true,
      semester: true,
      academicYear: true,
      programId: true,
      program: {
        select: {
          id: true,
          code: true,
          literatureReviewPct: true,
          bimbinganPct: true,
          deskEvaluationPct: true,
          presentasiPct: true,
        },
      },
    },
  });

  if (!targetClass) notFound();
  if (targetClass.programId !== prodi.id) redirect("/kaprodi/rekap");

  const program = targetClass.program;

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId, isActive: true },
    include: {
      student: { select: { id: true, name: true, identifier: true } },
      class: { select: { id: true, code: true, program: { select: { code: true } } } },
      proposal: {
        include: {
          finalGrade: true,
          deskEvaluation: { include: { evaluator: { select: { name: true } } } },
          nilaiBimbingan: { include: { pembimbing: { select: { name: true } } } },
          nilaiLiteratureReview: { include: { pembimbing: { select: { name: true } } } },
          seminar: {
            include: {
              nilaiPresentasi: { include: { pembimbing: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  // "Mengulang": student has a FAILED final grade in any OTHER class
  const studentIds = enrollments.map((e) => e.student.id);
  const failedElsewhere = await prisma.classEnrollment.findMany({
    where: {
      studentId: { in: studentIds },
      classId: { not: classId },
      proposal: { finalGrade: { passed: false } },
    },
    select: { studentId: true },
  });
  const retakeStudentIds = new Set(failedElsewhere.map((e) => e.studentId));

  function avg(values: number[]): number | null {
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  const rows = enrollments.map((e) => {
    const p = e.proposal;
    const expectedPembimbingCount =
      (p?.supervisor1AssignedId ? 1 : 0) + (p?.supervisor2AssignedId ? 1 : 0);

    const bimbinganScore =
      expectedPembimbingCount > 0 &&
      (p?.nilaiBimbingan.length ?? 0) >= expectedPembimbingCount
        ? avg(
            p!.nilaiBimbingan.map(
              (n) =>
                n.pemilihanTema +
                n.researchQuestion +
                n.studiLiteratur1 +
                n.studiLiteratur2 +
                n.rencanaImplementasi +
                n.kemandirian +
                n.prosesBimbingan
            )
          )
        : (p?.finalGrade?.bimbinganScore ?? null);

    const lrScore =
      expectedPembimbingCount > 0 &&
      (p?.nilaiLiteratureReview.length ?? 0) >= expectedPembimbingCount
        ? avg(
            p!.nilaiLiteratureReview.map(
              (n) =>
                n.kualitasPustaka +
                n.kontenRumusan +
                n.analisisTujuan +
                n.kelengkapanKajian +
                n.kelebihanKekurangan +
                n.relasiTeori
            )
          )
        : (p?.finalGrade?.lrScore ?? null);

    const de = p?.deskEvaluation ?? null;
    const deRaw = de
      ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode
      : null;
    const deScore = de
      ? de.isLate
        ? Math.min(deRaw!, 51)
        : deRaw
      : (p?.finalGrade?.deScore ?? null);

    const presentasiScore =
      expectedPembimbingCount > 0 &&
      (p?.seminar?.nilaiPresentasi.length ?? 0) >= expectedPembimbingCount
        ? avg(
            p!.seminar!.nilaiPresentasi.map(
              (n) =>
                n.latarBelakangScore +
                n.teoriPendukungScore +
                n.toolsPemodelanScore +
                n.pemaparanScore +
                n.komunikasiScore
            )
          )
        : (p?.finalGrade?.presentasiScore ?? null);

    let weightedTotal = p?.finalGrade?.weightedTotal ?? null;
    let gradeIndex = p?.finalGrade?.gradeIndex ?? null;
    let passed = p?.finalGrade?.passed ?? null;

    if (
      weightedTotal === null &&
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
      proposalId: p?.id ?? null,
      lrScore,
      bimbinganScore,
      deScore,
      presentasiScore,
      weightedTotal,
      gradeIndex,
      passed,
      isLate: de?.isLate ?? false,
      isRetake: retakeStudentIds.has(e.student.id),
      weights: {
        bimbinganPct: program.bimbinganPct,
        lrPct: program.literatureReviewPct,
        dePct: program.deskEvaluationPct,
        presentasiPct: program.presentasiPct,
      },
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
        <Link
          href="/kaprodi/rekap"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Daftar Kelas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{targetClass.code}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {targetClass.semester} / {targetClass.academicYear} ·{" "}
          <span className="font-medium text-gray-700">
            {prodi.name} ({prodi.code})
          </span>
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Rekap Nilai</CardTitle>
        </CardHeader>
        <CardContent>
          <RekapTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
