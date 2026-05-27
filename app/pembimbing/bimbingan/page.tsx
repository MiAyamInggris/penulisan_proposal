import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BimbinganScoreList, type BimbinganProposalRow } from "./bimbingan-score-list";

const BIMBINGAN_FIELDS = [
  { name: "pemilihanTema", label: "Pemilihan Tema", max: 15 },
  { name: "researchQuestion", label: "Pertanyaan Penelitian (Research Question)", max: 15 },
  { name: "studiLiteratur1", label: "Studi Literatur – Ide/Gagasan/Strategi", max: 10 },
  { name: "studiLiteratur2", label: "Studi Literatur – Justifikasi Model/Metode", max: 10 },
  { name: "rencanaImplementasi", label: "Rencana Implementasi/Simulasi/Komputasi", max: 10 },
  { name: "kemandirian", label: "Kemandirian Mahasiswa dalam Penyusunan Proposal", max: 20 },
  { name: "prosesBimbingan", label: "Proses Bimbingan", max: 20 },
] as const;

export default async function NilaiBimbinganPage() {
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
      bimbinganSessions: { orderBy: { sessionNumber: "asc" }, select: { id: true, sessionNumber: true } },
      supervisor1Assigned: { select: { name: true } },
      supervisor2Assigned: { select: { name: true } },
      nilaiBimbingan: {
        select: {
          pembimbingId: true,
          pemilihanTema: true, researchQuestion: true,
          studiLiteratur1: true, studiLiteratur2: true,
          rencanaImplementasi: true, kemandirian: true, prosesBimbingan: true,
          notes: true, updatedAt: true,
        },
      },
    },
  });

  const rows: BimbinganProposalRow[] = proposals.map((p) => {
    const myScore = p.nilaiBimbingan.find((n) => n.pembimbingId === session.user.id) ?? null;
    const hasTwoPembimbing = !!p.supervisor1AssignedId && !!p.supervisor2AssignedId;
    const iAmPb1 = session.user.id === p.supervisor1AssignedId;
    const otherPbId = iAmPb1 ? p.supervisor2AssignedId : p.supervisor1AssignedId;
    const otherPbName = iAmPb1
      ? (p.supervisor2Assigned?.name ?? "Pembimbing 2")
      : (p.supervisor1Assigned?.name ?? "Pembimbing 1");
    const otherPbRole = iAmPb1 ? "Pembimbing 2" : "Pembimbing 1";
    const rawOther = hasTwoPembimbing && otherPbId
      ? p.nilaiBimbingan.find((n) => n.pembimbingId === otherPbId) ?? null
      : null;

    return {
      id: p.id,
      titleId: p.titleId,
      status: p.status,
      enrollment: p.enrollment,
      bimbinganSessions: p.bimbinganSessions,
      myScore: myScore
        ? {
            ...myScore,
            updatedAt: myScore.updatedAt.toISOString(),
          }
        : null,
      otherPembimbing: hasTwoPembimbing
        ? {
            name: otherPbName,
            role: otherPbRole as "Pembimbing 1" | "Pembimbing 2",
            score: rawOther
              ? {
                  items: BIMBINGAN_FIELDS.map((f) => ({
                    label: f.label,
                    value: (rawOther as unknown as Record<string, number>)[f.name],
                    max: f.max,
                  })),
                  notes: rawOther.notes,
                  total: BIMBINGAN_FIELDS.reduce(
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
        <h1 className="text-2xl font-bold text-gray-900">Nilai Bimbingan (TA1-01B)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai bimbingan untuk setiap mahasiswa bimbingan Anda
        </p>
      </div>
      <BimbinganScoreList proposals={rows} />
    </div>
  );
}
