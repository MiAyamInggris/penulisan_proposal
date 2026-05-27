import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PresentasiScoreList, type PresentasiProposalRow } from "./presentasi-score-list";
import { SemesterCardGrid, sortSemesters } from "@/app/pembimbing/_components/semester-card-grid";
import type { OtherPembimbingData } from "@/app/pembimbing/_components/other-pembimbing-panel";

const PRESENTASI_FIELDS = [
  { name: "latarBelakangScore", label: "Menjawab Latar Belakang, Rumusan, Tujuan & Metodologi", max: 25 },
  { name: "teoriPendukungScore", label: "Menguasai Teori Pendukung TA", max: 15 },
  { name: "toolsPemodelanScore", label: "Menguasai Tools Pemodelan/Simulasi/Implementasi", max: 10 },
  { name: "pemaparanScore", label: "Pemaparan / Cara Menjawab", max: 25 },
  { name: "komunikasiScore", label: "Komunikasi Interpersonal", max: 25 },
] as const;

const SEMINAR_STATUSES = ["SEMINAR_REGISTERED", "SEMINAR_COMPLETED", "COMPLETED"] as const;

export default async function PresentasiPage({
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
        status: { in: [...SEMINAR_STATUSES] },
      },
      select: {
        enrollment: {
          select: { class: { select: { semester: true, academicYear: true } } },
        },
        seminar: {
          select: {
            nilaiPresentasi: {
              where: { pembimbingId: session.user.id },
              select: { id: true },
            },
          },
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
      if ((p.seminar?.nilaiPresentasi.length ?? 0) > 0) entry.scored++;
      semesterMap.set(key, entry);
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nilai Presentasi Seminar (TA1-03)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih semester untuk melihat daftar mahasiswa bimbingan
          </p>
        </div>
        <SemesterCardGrid
          semesters={sortSemesters([...semesterMap.values()])}
          basePath="/pembimbing/presentasi"
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
      status: { in: [...SEMINAR_STATUSES] },
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
          class: { select: { code: true } },
        },
      },
      supervisor1Assigned: { select: { name: true } },
      supervisor2Assigned: { select: { name: true } },
      seminar: {
        include: {
          nilaiPresentasi: {
            select: {
              pembimbingId: true,
              latarBelakangScore: true,
              teoriPendukungScore: true,
              toolsPemodelanScore: true,
              pemaparanScore: true,
              komunikasiScore: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  const semesterLabel = `Semester ${selectedSemester} ${selectedYear}`;

  const rows: PresentasiProposalRow[] = proposals.map((p) => {
    const myScore = p.seminar?.nilaiPresentasi.find((n) => n.pembimbingId === session.user.id) ?? null;
    const hasTwoPembimbing = !!p.supervisor1AssignedId && !!p.supervisor2AssignedId;
    const iAmPb1 = session.user.id === p.supervisor1AssignedId;
    const otherPbId = iAmPb1 ? p.supervisor2AssignedId : p.supervisor1AssignedId;
    const otherPbName = iAmPb1
      ? (p.supervisor2Assigned?.name ?? "Pembimbing 2")
      : (p.supervisor1Assigned?.name ?? "Pembimbing 1");
    const otherPbRole = iAmPb1 ? "Pembimbing 2" : "Pembimbing 1";
    const rawOther =
      hasTwoPembimbing && otherPbId
        ? (p.seminar?.nilaiPresentasi.find((n) => n.pembimbingId === otherPbId) ?? null)
        : null;

    const otherPembimbing: OtherPembimbingData | null = hasTwoPembimbing
      ? {
          name: otherPbName,
          role: otherPbRole as "Pembimbing 1" | "Pembimbing 2",
          score: rawOther
            ? {
                items: PRESENTASI_FIELDS.map((f) => ({
                  label: f.label,
                  value: (rawOther as unknown as Record<string, number>)[f.name],
                  max: f.max,
                })),
                notes: null,
                total: PRESENTASI_FIELDS.reduce(
                  (sum, f) => sum + (rawOther as unknown as Record<string, number>)[f.name],
                  0
                ),
                updatedAt: rawOther.updatedAt.toISOString(),
              }
            : null,
        }
      : null;

    return {
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
      seminar: p.seminar
        ? {
            id: p.seminar.id,
            scheduledDate: p.seminar.scheduledDate,
            location: p.seminar.location,
          }
        : null,
      isMengulang: p.enrollment.student._count.enrollments > 1,
      semesterLabel,
      myScore: myScore ? { ...myScore, updatedAt: myScore.updatedAt.toISOString() } : null,
      otherPembimbing,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pembimbing/presentasi"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Ganti Semester
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Nilai Presentasi Seminar (TA1-03)</h1>
          <span className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
            {semesterLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai presentasi setelah seminar proposal dilaksanakan
        </p>
      </div>
      <PresentasiScoreList proposals={rows} />
    </div>
  );
}
