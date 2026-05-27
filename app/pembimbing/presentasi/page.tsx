import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PresentasiScoreList, type PresentasiProposalRow } from "./presentasi-score-list";

const PRESENTASI_FIELDS = [
  { name: "latarBelakangScore", label: "Menjawab Latar Belakang, Rumusan, Tujuan & Metodologi", max: 25 },
  { name: "teoriPendukungScore", label: "Menguasai Teori Pendukung TA", max: 15 },
  { name: "toolsPemodelanScore", label: "Menguasai Tools Pemodelan/Simulasi/Implementasi", max: 10 },
  { name: "pemaparanScore", label: "Pemaparan / Cara Menjawab", max: 25 },
  { name: "komunikasiScore", label: "Komunikasi Interpersonal", max: 25 },
] as const;

export default async function PresentasiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { supervisor1AssignedId: session.user.id },
        { supervisor2AssignedId: session.user.id },
      ],
      status: { in: ["SEMINAR_REGISTERED", "SEMINAR_COMPLETED", "COMPLETED"] },
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

  const rows: PresentasiProposalRow[] = proposals.map((p) => {
    const myScore = p.seminar?.nilaiPresentasi.find((n) => n.pembimbingId === session.user.id) ?? null;
    const hasTwoPembimbing = !!p.supervisor1AssignedId && !!p.supervisor2AssignedId;
    const iAmPb1 = session.user.id === p.supervisor1AssignedId;
    const otherPbId = iAmPb1 ? p.supervisor2AssignedId : p.supervisor1AssignedId;
    const otherPbName = iAmPb1
      ? (p.supervisor2Assigned?.name ?? "Pembimbing 2")
      : (p.supervisor1Assigned?.name ?? "Pembimbing 1");
    const otherPbRole = iAmPb1 ? "Pembimbing 2" : "Pembimbing 1";
    const rawOther = hasTwoPembimbing && otherPbId
      ? p.seminar?.nilaiPresentasi.find((n) => n.pembimbingId === otherPbId) ?? null
      : null;

    return {
      id: p.id,
      titleId: p.titleId,
      status: p.status,
      enrollment: p.enrollment,
      seminar: p.seminar
        ? {
            id: p.seminar.id,
            scheduledDate: p.seminar.scheduledDate,
            location: p.seminar.location,
          }
        : null,
      myScore: myScore
        ? { ...myScore, updatedAt: myScore.updatedAt.toISOString() }
        : null,
      otherPembimbing: hasTwoPembimbing
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
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Presentasi Seminar (TA1-03)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai presentasi setelah seminar proposal dilaksanakan
        </p>
      </div>
      <PresentasiScoreList proposals={rows} />
    </div>
  );
}
