import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DEAssessmentList, type DEAssessmentRow } from "./de-assessment-list";
import { SemesterCardGrid, sortSemesters } from "@/app/pembimbing/_components/semester-card-grid";

export default async function DEAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { semester: selectedSemester, year: selectedYear } = await searchParams;

  if (!selectedSemester || !selectedYear) {
    const allForStats = await prisma.proposal.findMany({
      where: { deskEvaluatorId: session.user.id },
      select: {
        enrollment: {
          select: { class: { select: { semester: true, academicYear: true } } },
        },
        deskEvaluation: { select: { id: true } },
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
      if (p.deskEvaluation !== null) entry.scored++;
      semesterMap.set(key, entry);
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Desk Evaluation Assessment</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih semester untuk melihat daftar proposal yang ditugaskan kepada Anda
          </p>
        </div>
        <SemesterCardGrid
          semesters={sortSemesters([...semesterMap.values()])}
          basePath="/dosen/desk-evaluation-assessment"
        />
      </div>
    );
  }

  const proposals = await prisma.proposal.findMany({
    where: {
      deskEvaluatorId: session.user.id,
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
          class: { select: { code: true, deDeadline: true } },
        },
      },
      deskEvaluation: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const semesterLabel = `Semester ${selectedSemester} ${selectedYear}`;

  const rows: DEAssessmentRow[] = proposals.map((p) => ({
    id: p.id,
    titleId: p.titleId,
    enrollment: {
      student: {
        name: p.enrollment.student.name,
        identifier: p.enrollment.student.identifier,
      },
      class: p.enrollment.class,
    },
    deskEvaluation: p.deskEvaluation,
    isMengulang: p.enrollment.student._count.enrollments > 1,
    semesterLabel,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dosen/desk-evaluation-assessment"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Ganti Semester
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Desk Evaluation Assessment</h1>
          <span className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
            {semesterLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Daftar proposal mahasiswa yang ditugaskan kepada Anda untuk dinilai
        </p>
      </div>
      <DEAssessmentList proposals={rows} />
    </div>
  );
}
