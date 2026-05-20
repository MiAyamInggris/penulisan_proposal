"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { saveNilaiBimbingan } from "@/app/pembimbing/bimbingan/actions";
import { saveNilaiLR } from "@/app/pembimbing/literature-review/actions";
import { saveNilaiPresentasi } from "@/app/pembimbing/presentasi/actions";
import { scheduleSeminarWithNotification } from "@/lib/actions/seminar";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { fileDownloadUrl } from "@/lib/file-url";
import {
  CalendarDays,
  Clock,
  Download,
  MapPin,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BimbinganSession = {
  id: string;
  sessionNumber: number;
  date: Date;
  topicsDiscussed: string;
  nextPlan: string;
  notes: string | null;
};

type NilaiBimbingan = {
  pemilihanTema: number;
  researchQuestion: number;
  studiLiteratur1: number;
  studiLiteratur2: number;
  rencanaImplementasi: number;
  kemandirian: number;
  prosesBimbingan: number;
  notes: string | null;
};

type NilaiLR = {
  kualitasPustaka: number;
  kontenRumusan: number;
  analisisTujuan: number;
  kelengkapanKajian: number;
  kelebihanKekurangan: number;
  relasiTeori: number;
  catatan: string | null;
};

type NilaiPresentasi = {
  latarBelakangScore: number;
  teoriPendukungScore: number;
  toolsPemodelanScore: number;
  pemaparanScore: number;
  komunikasiScore: number;
};

type Proposal = {
  id: string;
  titleId: string;
  titleEn: string | null;
  topicArea: string | null;
  abstract: string | null;
  status: string;
  proposalUrl: string | null;
  revisionUrl: string | null;
  presentationUrl: string | null;
  supervisor1AssignedId: string | null;
  supervisor2AssignedId: string | null;
  supervisor1Assigned: { id: string; name: string } | null;
  supervisor2Assigned: { id: string; name: string } | null;
  deskEvaluator: { id: string; name: string } | null;
  bimbinganSessions: BimbinganSession[];
  nilaiBimbingan: NilaiBimbingan[];
  nilaiLiteratureReview: NilaiLR[];
  deskEvaluation: {
    latarBelakang: number;
    formulasiMasalah: number;
    teoriPendukung: number;
    ideMetode: number;
    isLate: boolean;
    catatanReviewer: string | null;
  } | null;
  seminar: {
    id: string;
    status: string;
    scheduledDate: Date | null;
    location: string | null;
    nilaiPresentasi: NilaiPresentasi[];
  } | null;
  finalGrade: {
    weightedTotal: number | null;
    gradeIndex: string | null;
    passed: boolean | null;
  } | null;
  enrollment: {
    eprt: { status: string } | null;
    class: { program: { literatureReviewPct: number; bimbinganPct: number; deskEvaluationPct: number; presentasiPct: number } };
  };
};

// ─── Tab Navigation ────────────────────────────────────────────────────────────

const TABS = [
  { key: "info", label: "Informasi" },
  { key: "bimbingan", label: "Bimbingan" },
  { key: "penilaian", label: "Penilaian" },
  { key: "seminar", label: "Seminar" },
];

export function StudentTabs({
  proposal,
  isSupervisor1,
  activeTab,
  studentId,
}: {
  proposal: Proposal;
  isSupervisor1: boolean;
  activeTab: string;
  studentId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const setTab = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-[#C8102E] text-[#C8102E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <InfoTab proposal={proposal} isSupervisor1={isSupervisor1} />
      )}
      {activeTab === "bimbingan" && (
        <BimbinganTab proposal={proposal} />
      )}
      {activeTab === "penilaian" && (
        <PenilaianTab proposal={proposal} />
      )}
      {activeTab === "seminar" && (
        <SeminarTab
          proposal={proposal}
          isSupervisor1={isSupervisor1}
          studentId={studentId}
        />
      )}
    </div>
  );
}

// ─── Tab 1: Informasi ─────────────────────────────────────────────────────────

const STAGES = [
  { key: "ENROLLED", label: "Terdaftar" },
  { key: "PROPOSAL_UPLOADED", label: "Proposal Terdaftar" },
  { key: "ASSIGNED", label: "Pembimbing Ditugaskan" },
  { key: "BIMBINGAN", label: "Bimbingan" },
  { key: "DE_READY", label: "Siap Desk Evaluasi" },
  { key: "DE_COMPLETED", label: "DE Selesai" },
  { key: "REVISION_UPLOADED", label: "Revisi Diunggah" },
  { key: "SEMINAR_REGISTERED", label: "Daftar Seminar" },
  { key: "SEMINAR_COMPLETED", label: "Seminar Selesai" },
  { key: "COMPLETED", label: "Selesai" },
];

function InfoTab({
  proposal,
  isSupervisor1,
}: {
  proposal: Proposal;
  isSupervisor1: boolean;
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === proposal.status);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detail Proposal</CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={proposal.status} type="proposal" />
              <Badge
                variant="secondary"
                className={
                  isSupervisor1
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }
              >
                {isSupervisor1 ? "Pembimbing 1" : "Pembimbing 2"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Judul (Indonesia)</p>
            <p className="text-sm font-medium text-gray-900">{proposal.titleId}</p>
          </div>
          {proposal.titleEn && (
            <div>
              <p className="text-xs text-gray-500">Judul (Inggris)</p>
              <p className="text-sm text-gray-700">{proposal.titleEn}</p>
            </div>
          )}
          {proposal.topicArea && (
            <div>
              <p className="text-xs text-gray-500">Bidang Topik</p>
              <p className="text-sm text-gray-700">{proposal.topicArea}</p>
            </div>
          )}
          {proposal.abstract && (
            <div>
              <p className="text-xs text-gray-500">Abstrak</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {proposal.abstract}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">Pembimbing 1</p>
              <p className="font-medium">{proposal.supervisor1Assigned?.name ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pembimbing 2</p>
              <p className="font-medium">{proposal.supervisor2Assigned?.name ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Desk Evaluator</p>
              <p className="font-medium">{proposal.deskEvaluator?.name ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">EpRT</p>
              <p className="font-medium">
                {proposal.enrollment.eprt?.status ?? "Belum upload"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File links */}
      {(proposal.proposalUrl || proposal.revisionUrl || proposal.presentationUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proposal.proposalUrl && (
              <a
                href={fileDownloadUrl(proposal.proposalUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Download className="h-4 w-4" />
                Link Proposal
              </a>
            )}
            {proposal.revisionUrl && (
              <a
                href={fileDownloadUrl(proposal.revisionUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Download className="h-4 w-4" />
                Link Revisi
              </a>
            )}
            {proposal.presentationUrl && (
              <a
                href={fileDownloadUrl(proposal.presentationUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <Download className="h-4 w-4" />
                Link Presentasi
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress Tahapan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {STAGES.map((stage, idx) => {
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isDone
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-[#C8102E] text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      isDone
                        ? "text-gray-400 line-through"
                        : isCurrent
                        ? "font-semibold text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs bg-[#C8102E] text-white px-2 py-0.5 rounded-full ml-auto">
                      Saat ini
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 2: Bimbingan ─────────────────────────────────────────────────────────

function BimbinganTab({ proposal }: { proposal: Proposal }) {
  const sessions = proposal.bimbinganSessions;
  const eprt = proposal.enrollment.eprt;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-white border rounded-lg">
        <div>
          <p className="text-xs text-gray-500">Total Sesi</p>
          <p className={`text-2xl font-bold ${sessions.length >= 3 ? "text-green-600" : "text-gray-900"}`}>
            {sessions.length} / 3
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">EpRT</p>
          <p className={`text-sm font-medium ${eprt?.status === "VERIFIED" ? "text-green-600" : "text-orange-500"}`}>
            {eprt?.status ?? "Belum upload"}
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-center py-8 text-gray-400">
          Belum ada sesi bimbingan tercatat
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#C8102E] text-white text-sm flex items-center justify-center font-bold shrink-0">
                    {s.sessionNumber}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(s.date), "dd MMMM yyyy", { locale: idLocale })}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Topik Dibahas
                  </p>
                  <p className="text-sm text-gray-800">{s.topicsDiscussed}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Rencana Berikutnya
                  </p>
                  <p className="text-sm text-gray-800">{s.nextPlan}</p>
                </div>
                {s.notes && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Catatan
                    </p>
                    <p className="text-sm text-gray-600">{s.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Penilaian ─────────────────────────────────────────────────────────

const BIMBINGAN_CRITERIA = [
  { name: "pemilihanTema", label: "Pemilihan Tema", max: 15 },
  { name: "researchQuestion", label: "Pertanyaan Penelitian (Research Question)", max: 15 },
  { name: "studiLiteratur1", label: "Studi Literatur – Ide/Gagasan/Strategi", max: 10 },
  { name: "studiLiteratur2", label: "Studi Literatur – Justifikasi Model/Metode", max: 10 },
  { name: "rencanaImplementasi", label: "Rencana Implementasi/Simulasi/Komputasi", max: 10 },
  { name: "kemandirian", label: "Kemandirian Mahasiswa dalam Penyusunan Proposal", max: 20 },
  { name: "prosesBimbingan", label: "Proses Bimbingan", max: 20 },
];

const LR_CRITERIA = [
  { name: "kualitasPustaka", label: "Kualitas Pustaka sebagai Referensi Utama", max: 10 },
  { name: "kontenRumusan", label: "Konten Pustaka mengenai Rumusan Masalah", max: 10 },
  { name: "analisisTujuan", label: "Analisis Pustaka terkait Tujuan/Ide Pokok", max: 10 },
  { name: "kelengkapanKajian", label: "Kelengkapan Kajian Teori Metode/Algoritma", max: 10 },
  { name: "kelebihanKekurangan", label: "Kelebihan dan Kekurangan Penelitian", max: 40 },
  { name: "relasiTeori", label: "Relasi Teori terhadap Topik Proposal", max: 20 },
];

const PRESENTASI_CRITERIA = [
  { name: "latarBelakangScore", label: "Menjawab Latar Belakang, Rumusan, Tujuan & Metodologi", max: 25 },
  { name: "teoriPendukungScore", label: "Menguasai Teori Pendukung TA", max: 15 },
  { name: "toolsPemodelanScore", label: "Menguasai Tools Pemodelan/Simulasi/Implementasi", max: 10 },
  { name: "pemaparanScore", label: "Pemaparan / Cara Menjawab", max: 25 },
  { name: "komunikasiScore", label: "Komunikasi Interpersonal", max: 25 },
];

function ScoreInput({
  name,
  label,
  max,
  value,
  onChange,
}: {
  name: string;
  label: string;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <Label htmlFor={name} className="text-sm leading-tight">
          {label}
        </Label>
        <span className="text-xs text-gray-400 shrink-0 ml-2">/ {max}</span>
      </div>
      <Input
        id={name}
        name={name}
        type="number"
        min={0}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)))
        }
        required
        className="h-9"
      />
    </div>
  );
}

function TotalBadge({ total }: { total: number }) {
  const color =
    total >= 70
      ? "bg-green-100 text-green-700"
      : total >= 50
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";
  return (
    <div className={`p-3 rounded-lg flex justify-between items-center ${color}`}>
      <span className="text-sm font-medium">Total</span>
      <span className="text-lg font-bold">{total.toFixed(1)} / 100</span>
    </div>
  );
}

function BimbinganScoreForm({
  proposalId,
  existing,
}: {
  proposalId: string;
  existing: NilaiBimbingan | null;
}) {
  const initScores = Object.fromEntries(
    BIMBINGAN_CRITERIA.map((c) => [
      c.name,
      (existing as Record<string, unknown> | null)?.[c.name] as number ?? 0,
    ])
  );
  const [scores, setScores] = useState<Record<string, number>>(initScores);
  const [loading, setLoading] = useState(false);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await saveNilaiBimbingan(proposalId, new FormData(e.currentTarget));
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Nilai bimbingan berhasil disimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {BIMBINGAN_CRITERIA.map((c) => (
        <ScoreInput
          key={c.name}
          name={c.name}
          label={c.label}
          max={c.max}
          value={scores[c.name]}
          onChange={(v) => setScores((prev) => ({ ...prev, [c.name]: v }))}
        />
      ))}
      <TotalBadge total={total} />
      <div className="space-y-1">
        <Label htmlFor="notes-b">Catatan (opsional)</Label>
        <Textarea
          id="notes-b"
          name="notes"
          defaultValue={existing?.notes ?? ""}
          rows={2}
          placeholder="Catatan untuk mahasiswa..."
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
      >
        {loading ? "Menyimpan..." : existing ? "Perbarui Nilai Bimbingan" : "Simpan Nilai Bimbingan"}
      </Button>
    </form>
  );
}

function LRScoreForm({
  proposalId,
  existing,
}: {
  proposalId: string;
  existing: NilaiLR | null;
}) {
  const initScores = Object.fromEntries(
    LR_CRITERIA.map((c) => [
      c.name,
      (existing as Record<string, unknown> | null)?.[c.name] as number ?? 0,
    ])
  );
  const [scores, setScores] = useState<Record<string, number>>(initScores);
  const [loading, setLoading] = useState(false);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await saveNilaiLR(proposalId, new FormData(e.currentTarget));
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Nilai LR berhasil disimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {LR_CRITERIA.map((c) => (
        <ScoreInput
          key={c.name}
          name={c.name}
          label={c.label}
          max={c.max}
          value={scores[c.name]}
          onChange={(v) => setScores((prev) => ({ ...prev, [c.name]: v }))}
        />
      ))}
      <TotalBadge total={total} />
      <div className="space-y-1">
        <Label htmlFor="catatan-lr">Catatan Reviewer (opsional)</Label>
        <Textarea
          id="catatan-lr"
          name="catatan"
          defaultValue={existing?.catatan ?? ""}
          rows={2}
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
      >
        {loading ? "Menyimpan..." : existing ? "Perbarui Nilai LR" : "Simpan Nilai LR"}
      </Button>
    </form>
  );
}

function PresentasiScoreForm({
  proposalId,
  seminarId,
  existing,
  canScore,
}: {
  proposalId: string;
  seminarId: string;
  existing: NilaiPresentasi | null;
  canScore: boolean;
}) {
  const initScores = Object.fromEntries(
    PRESENTASI_CRITERIA.map((c) => [
      c.name,
      (existing as Record<string, unknown> | null)?.[c.name] as number ?? 0,
    ])
  );
  const [scores, setScores] = useState<Record<string, number>>(initScores);
  const [loading, setLoading] = useState(false);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  if (!canScore) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
        Penilaian presentasi tersedia setelah seminar dijadwalkan
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await saveNilaiPresentasi(
        seminarId,
        proposalId,
        new FormData(e.currentTarget)
      );
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Nilai presentasi berhasil disimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {PRESENTASI_CRITERIA.map((c) => (
        <ScoreInput
          key={c.name}
          name={c.name}
          label={c.label}
          max={c.max}
          value={scores[c.name]}
          onChange={(v) => setScores((prev) => ({ ...prev, [c.name]: v }))}
        />
      ))}
      <TotalBadge total={total} />
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
      >
        {loading
          ? "Menyimpan..."
          : existing
          ? "Perbarui Nilai Presentasi"
          : "Simpan Nilai Presentasi"}
      </Button>
    </form>
  );
}

function PenilaianTab({ proposal }: { proposal: Proposal }) {
  const [activeForm, setActiveForm] = useState<"bimbingan" | "lr" | "presentasi">("bimbingan");
  const canScore = ["BIMBINGAN", "DE_READY", "DE_COMPLETED", "REVISION_UPLOADED", "SEMINAR_REGISTERED", "SEMINAR_COMPLETED", "COMPLETED"].includes(proposal.status);

  const canPresentasi = !!(
    proposal.seminar &&
    ["SCHEDULED", "COMPLETED"].includes(proposal.seminar.status)
  );

  if (!canScore) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="font-medium">Penilaian belum tersedia</p>
        <p className="text-sm mt-1">
          Penilaian tersedia setelah mahasiswa mulai sesi bimbingan (status: Bimbingan)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desk Evaluation result — visible to Pembimbing after DE is submitted */}
      {proposal.deskEvaluation && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Hasil Desk Evaluation</p>
              <div className="flex items-center gap-2">
                {proposal.deskEvaluation.isLate && (
                  <span className="text-xs text-red-500">Terlambat</span>
                )}
                <span className="text-sm font-bold tabular-nums">
                  {Math.min(
                    proposal.deskEvaluation.latarBelakang +
                      proposal.deskEvaluation.formulasiMasalah +
                      proposal.deskEvaluation.teoriPendukung +
                      proposal.deskEvaluation.ideMetode,
                    proposal.deskEvaluation.isLate ? 51 : Infinity,
                  ).toFixed(1)}{" "}
                  / 100
                </span>
              </div>
            </div>
            {proposal.deskEvaluation.catatanReviewer ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Catatan Desk Evaluator
                </p>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                  {proposal.deskEvaluation.catatanReviewer}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Tidak ada catatan dari Desk Evaluator.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {(["bimbingan", "lr", "presentasi"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setActiveForm(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeForm === key
                ? "bg-[#C8102E] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {key === "bimbingan"
              ? `Nilai Bimbingan${proposal.nilaiBimbingan.length > 0 ? " ✓" : ""}`
              : key === "lr"
              ? `Nilai LR${proposal.nilaiLiteratureReview.length > 0 ? " ✓" : ""}`
              : `Nilai Presentasi${proposal.seminar?.nilaiPresentasi.length ? " ✓" : ""}`}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          {activeForm === "bimbingan" && (
            <BimbinganScoreForm
              proposalId={proposal.id}
              existing={proposal.nilaiBimbingan[0] ?? null}
            />
          )}
          {activeForm === "lr" && (
            <LRScoreForm
              proposalId={proposal.id}
              existing={proposal.nilaiLiteratureReview[0] ?? null}
            />
          )}
          {activeForm === "presentasi" && (
            <PresentasiScoreForm
              proposalId={proposal.id}
              seminarId={proposal.seminar?.id ?? ""}
              existing={proposal.seminar?.nilaiPresentasi[0] ?? null}
              canScore={canPresentasi}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 4: Seminar ───────────────────────────────────────────────────────────

function SeminarTab({
  proposal,
  isSupervisor1: _isSupervisor1,
  studentId,
}: {
  proposal: Proposal;
  isSupervisor1: boolean;
  studentId: string;
}) {
  const [scheduledDate, setScheduledDate] = useState(
    proposal.seminar?.scheduledDate
      ? new Date(proposal.seminar.scheduledDate).toISOString().slice(0, 16)
      : ""
  );
  const [location, setLocation] = useState(proposal.seminar?.location ?? "");
  const [loading, setLoading] = useState(false);

  const seminar = proposal.seminar;
  const canSchedule = [
    "SEMINAR_REGISTERED",
    "SEMINAR_COMPLETED",
  ].includes(proposal.status) || !!seminar?.scheduledDate;

  if (!["SEMINAR_REGISTERED", "SEMINAR_COMPLETED", "COMPLETED"].includes(proposal.status) && !seminar) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="font-medium">Seminar belum terdaftar</p>
        <p className="text-sm mt-1">
          Mahasiswa perlu mendaftar seminar terlebih dahulu
        </p>
      </div>
    );
  }

  const handleSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await scheduleSeminarWithNotification(
        proposal.id,
        studentId,
        fd
      );
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Jadwal seminar berhasil disimpan. Mahasiswa telah diberitahu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {seminar?.scheduledDate && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Seminar Dijadwalkan</p>
                <p className="text-sm text-green-700 mt-1">
                  {format(
                    new Date(seminar.scheduledDate),
                    "EEEE, dd MMMM yyyy 'pukul' HH:mm",
                    { locale: idLocale }
                  )}
                </p>
                {seminar.location && (
                  <div className="flex items-center gap-1 text-sm text-green-700 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {seminar.location}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!seminar?.scheduledDate && proposal.status === "SEMINAR_REGISTERED" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-semibold text-amber-900">
            Mahasiswa telah mendaftar seminar. Jadwalkan sekarang.
          </p>
        </div>
      )}

      {canSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {seminar?.scheduledDate ? "Ubah Jadwal Seminar" : "Jadwalkan Seminar"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="scheduledDate">Tanggal & Waktu *</Label>
                <Input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location">Lokasi / Link</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="Contoh: Ruang Sidang A atau https://meet.google.com/..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !scheduledDate}
                className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
              >
                {loading
                  ? "Menyimpan..."
                  : seminar?.scheduledDate
                  ? "Perbarui Jadwal"
                  : "Jadwalkan Seminar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
