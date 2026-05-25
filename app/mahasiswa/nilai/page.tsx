import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock } from "lucide-react";

export default async function NilaiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      class: { include: { program: true } },
      proposal: {
        include: {
          finalGrade: true,
          nilaiBimbingan: { select: { id: true } },
          nilaiLiteratureReview: { select: { id: true } },
          deskEvaluation: { select: { id: true } },
          seminar: { include: { nilaiPresentasi: { select: { id: true } } } },
        },
      },
    },
  });

  const proposal = enrollment?.proposal ?? null;
  const finalGrade = proposal?.finalGrade ?? null;

  if (!proposal) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nilai Saya</h1>
          <p className="text-sm text-gray-500 mt-1">Hasil akhir penilaian proposal Anda</p>
        </div>
        <p className="text-gray-500">Belum ada data nilai.</p>
      </div>
    );
  }

  // Show final grade when all stakeholders have finished
  if (finalGrade?.weightedTotal !== null && finalGrade?.weightedTotal !== undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nilai Saya</h1>
          <p className="text-sm text-gray-500 mt-1">Hasil akhir penilaian proposal Anda</p>
        </div>
        <Card className="border-2 border-[#C8102E]">
          <CardHeader>
            <CardTitle className="text-base text-[#C8102E]">Nilai Akhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Program: {enrollment!.class.program.code}</p>
                <p className="text-3xl font-bold text-gray-900">
                  {finalGrade.weightedTotal.toFixed(2)}
                </p>
                <p className={`text-sm font-semibold ${finalGrade.passed ? "text-green-600" : "text-red-600"}`}>
                  {finalGrade.passed ? "LULUS" : "TIDAK LULUS"}
                </p>
              </div>
              <div className="text-6xl font-bold text-[#C8102E]">
                {finalGrade.gradeIndex}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine how many pembimbing are assigned
  const expectedPembimbingCount =
    (proposal.supervisor1AssignedId ? 1 : 0) +
    (proposal.supervisor2AssignedId ? 1 : 0);

  // Completion checks — same gates as grade-engine, but only boolean (no scores exposed)
  const bimbinganDone =
    expectedPembimbingCount > 0 &&
    proposal.nilaiBimbingan.length >= expectedPembimbingCount;

  const lrDone =
    expectedPembimbingCount > 0 &&
    proposal.nilaiLiteratureReview.length >= expectedPembimbingCount;

  const deDone = proposal.deskEvaluation !== null;

  const presentasiDone =
    proposal.seminar !== null &&
    expectedPembimbingCount > 0 &&
    (proposal.seminar.nilaiPresentasi?.length ?? 0) >= expectedPembimbingCount;

  const assessments: { label: string; done: boolean }[] = [
    { label: "Nilai Bimbingan", done: bimbinganDone },
    { label: "Nilai Literature Review", done: lrDone },
    { label: "Desk Evaluation", done: deDone },
    { label: "Nilai Presentasi", done: presentasiDone },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Hasil akhir penilaian proposal Anda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-gray-700">
            Menunggu seluruh penilaian selesai
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Nilai akhir akan ditampilkan setelah semua penilai menyelesaikan penilaian mereka.
          </p>
          <div className="space-y-2 pt-1">
            {assessments.map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                )}
                <span className={`text-sm ${done ? "text-gray-500 line-through" : "text-gray-700"}`}>
                  {label}
                </span>
                <span className={`text-xs ml-auto ${done ? "text-green-600" : "text-amber-600"}`}>
                  {done ? "Selesai" : "Menunggu"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
