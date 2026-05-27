import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LRScoreList, type LRProposalRow } from "./lr-score-list";

const LR_FIELDS = [
  { name: "kualitasPustaka", label: "Kualitas Pustaka sebagai Referensi Utama", max: 10 },
  { name: "kontenRumusan", label: "Konten Pustaka mengenai Rumusan Masalah", max: 10 },
  { name: "analisisTujuan", label: "Analisis Pustaka terkait Tujuan/Ide Pokok", max: 10 },
  { name: "kelengkapanKajian", label: "Kelengkapan Kajian Teori Metode/Algoritma", max: 10 },
  { name: "kelebihanKekurangan", label: "Kelebihan dan Kekurangan Penelitian", max: 40 },
  { name: "relasiTeori", label: "Relasi Teori terhadap Topik Proposal", max: 20 },
] as const;

export default async function LiteratureReviewPage() {
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
          class: { select: { code: true } },
        },
      },
      supervisor1Assigned: { select: { name: true } },
      supervisor2Assigned: { select: { name: true } },
      nilaiLiteratureReview: {
        select: {
          pembimbingId: true,
          kualitasPustaka: true, kontenRumusan: true,
          analisisTujuan: true, kelengkapanKajian: true,
          kelebihanKekurangan: true, relasiTeori: true,
          catatan: true, updatedAt: true,
        },
      },
    },
  });

  const rows: LRProposalRow[] = proposals.map((p) => {
    const myScore = p.nilaiLiteratureReview.find((n) => n.pembimbingId === session.user.id) ?? null;
    const hasTwoPembimbing = !!p.supervisor1AssignedId && !!p.supervisor2AssignedId;
    const iAmPb1 = session.user.id === p.supervisor1AssignedId;
    const otherPbId = iAmPb1 ? p.supervisor2AssignedId : p.supervisor1AssignedId;
    const otherPbName = iAmPb1
      ? (p.supervisor2Assigned?.name ?? "Pembimbing 2")
      : (p.supervisor1Assigned?.name ?? "Pembimbing 1");
    const otherPbRole = iAmPb1 ? "Pembimbing 2" : "Pembimbing 1";
    const rawOther = hasTwoPembimbing && otherPbId
      ? p.nilaiLiteratureReview.find((n) => n.pembimbingId === otherPbId) ?? null
      : null;

    return {
      id: p.id,
      titleId: p.titleId,
      enrollment: p.enrollment,
      myScore: myScore ? { ...myScore, updatedAt: myScore.updatedAt.toISOString() } : null,
      otherPembimbing: hasTwoPembimbing
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
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Literature Review (TA1-05)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai literature review untuk mahasiswa bimbingan Anda
        </p>
      </div>
      <LRScoreList proposals={rows} />
    </div>
  );
}
