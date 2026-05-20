import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NilaiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      proposal: { include: { finalGrade: true } },
      class: { include: { program: true } },
    },
  });

  const finalGrade = enrollment?.proposal?.finalGrade;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Saya</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hasil akhir penilaian proposal Anda
        </p>
      </div>

      {!enrollment?.proposal ? (
        <p className="text-gray-500">Belum ada data nilai.</p>
      ) : finalGrade?.weightedTotal !== null && finalGrade?.weightedTotal !== undefined ? (
        <Card className="border-2 border-[#C8102E]">
          <CardHeader>
            <CardTitle className="text-base text-[#C8102E]">Nilai Akhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Program: {enrollment.class.program.code}</p>
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
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">
              Nilai akhir belum tersedia. Menunggu semua penilaian selesai.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
