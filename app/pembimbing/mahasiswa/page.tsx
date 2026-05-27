import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { SemesterCardGrid, sortSemesters } from "@/app/pembimbing/_components/semester-card-grid";

export default async function MahasiswaListPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { semester: selectedSemester, year: selectedYear } = await searchParams;

  if (!selectedSemester || !selectedYear) {
    const allForStats = await prisma.proposal.findMany({
      where: {
        OR: [
          { supervisor1AssignedId: session.user.id },
          { supervisor2AssignedId: session.user.id },
        ],
      },
      select: {
        status: true,
        enrollment: {
          select: { class: { select: { semester: true, academicYear: true } } },
        },
      },
    });

    const semesterMap = new Map<
      string,
      { semester: string; academicYear: string; total: number; scored: number }
    >();
    for (const p of allForStats) {
      const { semester, academicYear } = p.enrollment.class;
      const key = `${semester}::${academicYear}`;
      const entry = semesterMap.get(key) ?? { semester, academicYear, total: 0, scored: 0 };
      entry.total++;
      if (p.status === "COMPLETED") entry.scored++;
      semesterMap.set(key, entry);
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Mahasiswa Bimbingan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih semester untuk melihat daftar mahasiswa bimbingan
          </p>
        </div>
        <SemesterCardGrid
          semesters={sortSemesters([...semesterMap.values()])}
          basePath="/pembimbing/mahasiswa"
          scoredLabel="selesai"
        />
      </div>
    );
  }

  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { supervisor1AssignedId: session.user.id },
        { supervisor2AssignedId: session.user.id },
      ],
      enrollment: { class: { semester: selectedSemester, academicYear: selectedYear } },
    },
    include: {
      enrollment: {
        include: {
          student: {
            select: {
              name: true,
              identifier: true,
              _count: { select: { enrollments: true } },
            },
          },
          class: { select: { code: true, program: { select: { code: true } } } },
        },
      },
      bimbinganSessions: { orderBy: { sessionNumber: "desc" }, take: 1 },
      finalGrade: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const semesterLabel = `Semester ${selectedSemester} ${selectedYear}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pembimbing/mahasiswa"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Ganti Semester
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Daftar Mahasiswa Bimbingan</h1>
          <span className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
            {semesterLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{proposals.length} mahasiswa</p>
      </div>

      {proposals.length === 0 ? (
        <p className="text-gray-500">Belum ada mahasiswa yang ditugaskan pada semester ini.</p>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const isMengulang = p.enrollment.student._count.enrollments > 1;

            return (
              <Card key={p.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {p.enrollment.class.code} ({p.enrollment.class.program.code})
                        </span>
                        <span className="font-semibold text-gray-900">
                          {p.enrollment.student.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {p.enrollment.student.identifier}
                        </span>
                        {isMengulang && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                            Mengulang
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{p.titleId}</p>
                    </div>
                    <StatusBadge status={p.status} type="proposal" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <span>
                      {p.supervisor1AssignedId === session.user.id
                        ? "Pembimbing 1"
                        : "Pembimbing 2"}
                    </span>
                    <span>
                      Bimbingan:{" "}
                      {p.bimbinganSessions.length > 0
                        ? `Sesi ${p.bimbinganSessions[0].sessionNumber}`
                        : "Belum ada"}
                    </span>
                    {p.finalGrade?.gradeIndex ? (
                      <span className="font-bold text-gray-900">
                        Nilai: {p.finalGrade.gradeIndex} ({p.finalGrade.weightedTotal?.toFixed(1)})
                      </span>
                    ) : (
                      <span>–</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
