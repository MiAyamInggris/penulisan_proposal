import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LRScoreList, type LRProposalRow } from "./lr-score-list";
import { SemesterCardGrid, sortSemesters } from "@/app/pembimbing/_components/semester-card-grid";
import type { OtherPembimbingData } from "@/app/pembimbing/_components/other-pembimbing-panel";

const LR_FIELDS = [
  { name: "kualitasPustaka", label: "Kualitas Pustaka sebagai Referensi Utama", max: 10 },
  { name: "kontenRumusan", label: "Konten Pustaka mengenai Rumusan Masalah", max: 10 },
  { name: "analisisTujuan", label: "Analisis Pustaka terkait Tujuan/Ide Pokok", max: 10 },
  { name: "kelengkapanKajian", label: "Kelengkapan Kajian Teori Metode/Algoritma", max: 10 },
  { name: "kelebihanKekurangan", label: "Kelebihan dan Kekurangan Penelitian", max: 40 },
  { name: "relasiTeori", label: "Relasi Teori terhadap Topik Proposal", max: 20 },
] as const;

export default async function LiteratureReviewPage({
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
        enrollment: {
          select: { class: { select: { semester: true, academicYear: true } } },
        },
        nilaiLiteratureReview: {
          where: { pembimbingId: session.user.id },
          select: { id: true },
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
      if (p.nilaiLiteratureReview.length > 0) entry.scored++;
      semesterMap.set(key, entry);
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nilai Literature Review (TA1-05)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih semester untuk melihat daftar mahasiswa bimbingan
          </p>
        </div>
        <SemesterCardGrid
          semesters={sortSemesters([...semesterMap.values()])}
          basePath="/pembimbing/literature-review"
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
          class: { select: { code: true } },
        },
      },
      supervisor1Assigned: { select: { name: true } },
      supervisor2Assigned: { select: { name: true } },
      nilaiLiteratureReview: {
        select: {
          pembimbingId: true,
          kualitasPustaka: true,
          kontenRumusan: true,
          analisisTujuan: true,
          kelengkapanKajian: true,
          kelebihanKekurangan: true,
          relasiTeori: true,
          catatan: true,
          updatedAt: true,
        },
      },
    },
  });

  const semesterLabel = `Semester ${selectedSemester} ${selectedYear}`;

  const rows: LRProposalRow[] = proposals.map((p) => {
    const myScore = p.nilaiLiteratureReview.find((n) => n.pembimbingId === session.user.id) ?? null;
    const hasTwoPembimbing = !!p.supervisor1AssignedId && !!p.supervisor2AssignedId;
    const iAmPb1 = session.user.id === p.supervisor1AssignedId;
    const otherPbId = iAmPb1 ? p.supervisor2AssignedId : p.supervisor1AssignedId;
    const otherPbName = iAmPb1
      ? (p.supervisor2Assigned?.name ?? "Pembimbing 2")
      : (p.supervisor1Assigned?.name ?? "Pembimbing 1");
    const otherPbRole = iAmPb1 ? "Pembimbing 2" : "Pembimbing 1";
    const rawOther =
      hasTwoPembimbing && otherPbId
        ? (p.nilaiLiteratureReview.find((n) => n.pembimbingId === otherPbId) ?? null)
        : null;

    const otherPembimbing: OtherPembimbingData | null = hasTwoPembimbing
      ? {
          name: otherPbName,
          role: otherPbRole as "Pembimbing 1" | "Pembimbing 2",
          score: rawOther
            ? {
                items: LR_FIELDS.map((f) => ({
                  label: f.label,
                  value: (rawOther as unknown as Record<string, number>)[f.name],
                  max: f.max,
                })),
                notes: rawOther.catatan,
                total: LR_FIELDS.reduce(
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
      enrollment: {
        student: {
          name: p.enrollment.student.name,
          identifier: p.enrollment.student.identifier,
        },
        class: p.enrollment.class,
      },
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
          href="/pembimbing/literature-review"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Ganti Semester
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Nilai Literature Review (TA1-05)</h1>
          <span className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
            {semesterLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai literature review untuk mahasiswa bimbingan Anda
        </p>
      </div>
      <LRScoreList proposals={rows} />
    </div>
  );
}
