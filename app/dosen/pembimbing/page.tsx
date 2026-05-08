import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";
import { AlertCircle, Bell, ChevronRight, Users } from "lucide-react";

export default async function DosenPembimbingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { supervisor1AssignedId: session.user.id },
        { supervisor2AssignedId: session.user.id },
      ],
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true, program: { select: { code: true } } } },
        },
      },
      bimbinganSessions: { select: { id: true } },
      nilaiBimbingan: {
        where: { pembimbingId: session.user.id },
        select: { id: true },
      },
      nilaiLiteratureReview: {
        where: { pembimbingId: session.user.id },
        select: { id: true },
      },
      seminar: {
        include: {
          nilaiPresentasi: {
            where: { pembimbingId: session.user.id },
            select: { id: true },
          },
        },
      },
      finalGrade: { select: { weightedTotal: true, gradeIndex: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const pendingSeminar = proposals.filter(
    (p) =>
      p.status === "SEMINAR_REGISTERED" && !p.seminar?.scheduledDate
  );

  const pendingScores = proposals.filter((p) => {
    const scoringStatus = [
      "BIMBINGAN",
      "DE_READY",
      "DE_COMPLETED",
      "REVISION_UPLOADED",
      "SEMINAR_REGISTERED",
      "SEMINAR_COMPLETED",
    ].includes(p.status);
    return (
      scoringStatus &&
      (p.nilaiBimbingan.length === 0 || p.nilaiLiteratureReview.length === 0)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mahasiswa Bimbingan</h1>
        <p className="text-sm text-gray-500 mt-1">
          {proposals.length} mahasiswa
        </p>
      </div>

      {/* Pending Actions */}
      {(pendingSeminar.length > 0 || pendingScores.length > 0) && (
        <div className="space-y-2">
          {pendingSeminar.map((p) => (
            <Link
              key={p.id}
              href={`/dosen/pembimbing/${p.id}?tab=seminar`}
            >
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                <Bell className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">
                    Jadwalkan Seminar
                  </p>
                  <p className="text-xs text-amber-700">
                    {p.enrollment.student.name} telah mendaftar seminar
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
              </div>
            </Link>
          ))}
          {pendingScores.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Nilai Belum Dilengkapi
                </p>
                <p className="text-xs text-blue-700">
                  {pendingScores.length} mahasiswa belum dinilai bimbingan/LR
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student List */}
      {proposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-600">Belum ada mahasiswa bimbingan</p>
          <p className="text-sm mt-1">
            Anda akan muncul di sini setelah Dosen Kelas menugaskan Anda sebagai
            pembimbing
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const isPembimbing1 =
              p.supervisor1AssignedId === session.user.id;
            const hasSeminarPending =
              p.status === "SEMINAR_REGISTERED" && !p.seminar?.scheduledDate;

            return (
              <Link key={p.id} href={`/dosen/pembimbing/${p.id}`}>
                <Card className="hover:border-[#C8102E] hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {p.enrollment.class.code} (
                            {p.enrollment.class.program.code})
                          </span>
                          <span className="font-medium text-gray-900">
                            {p.enrollment.student.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {p.enrollment.student.identifier}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              isPembimbing1
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }
                          >
                            {isPembimbing1 ? "Pembimbing 1" : "Pembimbing 2"}
                          </Badge>
                          {hasSeminarPending && (
                            <Badge
                              variant="secondary"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Jadwalkan Seminar
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {p.titleId}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Bimbingan: {p.bimbinganSessions.length}/3
                          </span>
                          <span>
                            Nilai Bimbingan:{" "}
                            {p.nilaiBimbingan.length > 0 ? "✓" : "–"}
                          </span>
                          <span>
                            Nilai LR:{" "}
                            {p.nilaiLiteratureReview.length > 0 ? "✓" : "–"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={p.status} type="proposal" />
                        {p.finalGrade?.gradeIndex && (
                          <span className="text-lg font-bold text-gray-900">
                            {p.finalGrade.gradeIndex}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
