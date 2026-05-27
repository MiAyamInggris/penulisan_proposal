import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DEList, type DEProposalRow } from "./de-list";
import { SemesterCardGrid, sortSemesters } from "@/app/pembimbing/_components/semester-card-grid";

const DE_STATUSES = [
  "DE_READY",
  "DE_COMPLETED",
  "REVISION_UPLOADED",
  "SEMINAR_REGISTERED",
  "SEMINAR_COMPLETED",
  "COMPLETED",
] as const;

export default async function PembimbingDeskEvaluationPage({
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
        deskEvaluatorId: session.user.id,
        status: { in: [...DE_STATUSES] },
      },
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
          <h1 className="text-2xl font-bold text-gray-900">Desk Evaluation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih semester untuk melihat daftar proposal yang ditugaskan kepada Anda
          </p>
        </div>
        <SemesterCardGrid
          semesters={sortSemesters([...semesterMap.values()])}
          basePath="/pembimbing/desk-evaluation"
        />
      </div>
    );
  }

  const proposals = await prisma.proposal.findMany({
    where: {
      deskEvaluatorId: session.user.id,
      status: { in: [...DE_STATUSES] },
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
      deskEvaluation: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  const semesterLabel = `Semester ${selectedSemester} ${selectedYear}`;

  const rows: DEProposalRow[] = proposals.map((p) => ({
    id: p.id,
    titleId: p.titleId,
    status: p.status,
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
          href="/pembimbing/desk-evaluation"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Ganti Semester
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Desk Evaluation</h1>
          <span className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
            {semesterLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Beri nilai proposal mahasiswa yang ditugaskan kepada Anda sebagai Desk Evaluator
        </p>
      </div>
      <DEList proposals={rows} />
    </div>
  );
}
