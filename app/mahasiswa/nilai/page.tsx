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
      proposal: {
        include: {
          nilaiBimbingan: { include: { pembimbing: { select: { name: true } } } },
          deskEvaluation: true,
          nilaiLiteratureReview: { include: { pembimbing: { select: { name: true } } } },
          seminar: {
            include: {
              nilaiPresentasi: { include: { pembimbing: { select: { name: true } } } },
            },
          },
          finalGrade: true,
        },
      },
      class: { include: { program: true } },
    },
  });

  const proposal = enrollment?.proposal;

  const calcTotal = (scores: number[]) =>
    scores.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Saya</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lihat perkembangan nilai Anda di setiap komponen penilaian
        </p>
      </div>

      {!proposal ? (
        <p className="text-gray-500">Belum ada data nilai.</p>
      ) : (
        <div className="space-y-4">
          {/* Bimbingan */}
          {proposal.nilaiBimbingan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nilai Bimbingan (TA1-01B)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proposal.nilaiBimbingan.map((n) => {
                    const total = calcTotal([n.pemilihanTema, n.researchQuestion, n.studiLiteratur1, n.studiLiteratur2, n.rencanaImplementasi, n.kemandirian, n.prosesBimbingan]);
                    return (
                      <div key={n.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{n.pembimbing.name}</p>
                          {n.notes && <p className="text-xs text-gray-500 mt-1">{n.notes}</p>}
                        </div>
                        <span className="text-xl font-bold text-gray-900">{total.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Literature Review */}
          {proposal.nilaiLiteratureReview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nilai Literature Review (TA1-05)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proposal.nilaiLiteratureReview.map((n) => {
                    const total = calcTotal([n.kualitasPustaka, n.kontenRumusan, n.analisisTujuan, n.kelengkapanKajian, n.kelebihanKekurangan, n.relasiTeori]);
                    return (
                      <div key={n.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{n.pembimbing.name}</p>
                          {n.catatan && <p className="text-xs text-gray-500 mt-1">{n.catatan}</p>}
                        </div>
                        <span className="text-xl font-bold text-gray-900">{total.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desk Evaluation */}
          {proposal.deskEvaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nilai Desk Evaluation (TA1-02)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Latar Belakang: {proposal.deskEvaluation.latarBelakang}/25</p>
                      <p>Formulasi Masalah: {proposal.deskEvaluation.formulasiMasalah}/30</p>
                      <p>Teori Pendukung: {proposal.deskEvaluation.teoriPendukung}/30</p>
                      <p>Ide & Metode: {proposal.deskEvaluation.ideMetode}/15</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900">
                        {(
                          proposal.deskEvaluation.latarBelakang +
                          proposal.deskEvaluation.formulasiMasalah +
                          proposal.deskEvaluation.teoriPendukung +
                          proposal.deskEvaluation.ideMetode
                        ).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  {proposal.deskEvaluation.catatanReviewer && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Catatan Reviewer</p>
                      <p className="text-sm text-gray-700">{proposal.deskEvaluation.catatanReviewer}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Presentasi */}
          {proposal.seminar?.nilaiPresentasi && proposal.seminar.nilaiPresentasi.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nilai Presentasi Seminar (TA1-03)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proposal.seminar.nilaiPresentasi.map((n) => {
                    const total = calcTotal([n.latarBelakangScore, n.teoriPendukungScore, n.toolsPemodelanScore, n.pemaparanScore, n.komunikasiScore]);
                    return (
                      <div key={n.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{n.pembimbing.name}</p>
                        <span className="text-xl font-bold text-gray-900">{total.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Grade */}
          {proposal.finalGrade?.weightedTotal !== null && proposal.finalGrade?.weightedTotal !== undefined && (
            <Card className="border-2 border-[#C8102E]">
              <CardHeader>
                <CardTitle className="text-base text-[#C8102E]">Nilai Akhir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Program: {enrollment?.class.program.code}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {proposal.finalGrade.weightedTotal.toFixed(2)}
                    </p>
                    <p className={`text-sm font-semibold ${proposal.finalGrade.passed ? "text-green-600" : "text-red-600"}`}>
                      {proposal.finalGrade.passed ? "LULUS" : "TIDAK LULUS"}
                    </p>
                  </div>
                  <div className="text-6xl font-bold text-[#C8102E]">
                    {proposal.finalGrade.gradeIndex}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
