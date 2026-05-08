import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

const STAGES = [
  "ENROLLED",
  "BIMBINGAN",
  "DE_SUBMITTED",
  "DE_SCORED",
  "DE_REVISED",
  "SEMINAR_SCHEDULED",
  "SEMINAR_COMPLETED",
  "COMPLETED",
] as const;

const STAGE_LABELS: Record<string, string> = {
  ENROLLED: "Terdaftar",
  BIMBINGAN: "Bimbingan",
  DE_SUBMITTED: "Dikumpul ke DE",
  DE_SCORED: "DE Dinilai",
  DE_REVISED: "Revisi DE",
  SEMINAR_SCHEDULED: "Seminar Dijadwalkan",
  SEMINAR_COMPLETED: "Seminar Selesai",
  COMPLETED: "Selesai",
};

const NEXT_ACTION: Record<string, string> = {
  ENROLLED: "Daftarkan proposal Anda dan mulai sesi bimbingan",
  BIMBINGAN: "Lakukan minimal 3 sesi bimbingan dan upload EpRT",
  DE_SUBMITTED: "Menunggu penilaian Desk Evaluation dari Dosen Kelas",
  DE_SCORED: "Lakukan revisi sesuai catatan reviewer",
  DE_REVISED: "Menunggu jadwal seminar proposal",
  SEMINAR_SCHEDULED: "Persiapkan presentasi seminar proposal Anda",
  SEMINAR_COMPLETED: "Unggah dokumen proposal final",
  COMPLETED: "Selamat! Semua tahapan selesai",
};

export default async function MahasiswaDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      class: { include: { program: true } },
      proposal: {
        include: {
          bimbinganSessions: true,
          finalGrade: true,
        },
      },
      eprt: true,
    },
  });

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Mahasiswa</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600">Anda belum terdaftar di kelas manapun.</p>
              <p className="text-sm text-gray-400 mt-1">Hubungi admin untuk pendaftaran.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const proposal = enrollment.proposal;
  const status = proposal?.status ?? "ENROLLED";
  const bimbinganCount = proposal?.bimbinganSessions.length ?? 0;
  const currentStageIndex = STAGES.indexOf(status as (typeof STAGES)[number]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Selamat datang, {session.user.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {enrollment.class.code} – {enrollment.class.name} | {enrollment.class.program.code}
        </p>
      </div>

      {/* Status card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Status Saat Ini</p>
            <div className="mt-2">
              <StatusBadge status={status} type="proposal" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Sesi Bimbingan</p>
            <p className={`text-2xl font-bold mt-1 ${bimbinganCount >= 3 ? "text-green-600" : "text-gray-900"}`}>
              {bimbinganCount} / 3
              {bimbinganCount >= 3 && " ✓"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Status EpRT</p>
            <div className="mt-2">
              {enrollment.eprt ? (
                <StatusBadge status={enrollment.eprt.status} type="eprt" />
              ) : (
                <span className="text-sm text-gray-400">Belum diupload</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next action */}
      <Card className="border-l-4 border-l-[#C8102E]">
        <CardContent className="pt-6">
          <p className="text-sm font-semibold text-gray-700">Langkah Selanjutnya</p>
          <p className="text-gray-600 mt-1">{NEXT_ACTION[status] ?? ""}</p>
        </CardContent>
      </Card>

      {/* Progress stepper */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Tahapan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STAGES.map((stage, idx) => {
              const isDone = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stage} className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : isCurrent ? (
                    <Circle className="h-5 w-5 text-[#C8102E] shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      isDone ? "text-gray-400 line-through" : isCurrent ? "font-semibold text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                  {isCurrent && (
                    <span className="text-xs bg-[#C8102E] text-white px-2 py-0.5 rounded-full">
                      Saat ini
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Final grade if available */}
      {proposal?.finalGrade?.weightedTotal !== null && proposal?.finalGrade?.weightedTotal !== undefined && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800">Nilai Akhir</p>
                <p className="text-3xl font-bold text-green-700 mt-1">
                  {proposal.finalGrade.weightedTotal.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-green-700">{proposal.finalGrade.gradeIndex}</p>
                <p className="text-xs text-green-600 mt-1">
                  {proposal.finalGrade.passed ? "LULUS" : "TIDAK LULUS"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
