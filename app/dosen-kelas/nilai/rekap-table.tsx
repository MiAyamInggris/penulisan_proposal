"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Detail types ─────────────────────────────────────────────────────────────
type NilaiBimbinganDetail = {
  pembimbingName: string;
  pemilihanTema: number;
  researchQuestion: number;
  studiLiteratur1: number;
  studiLiteratur2: number;
  rencanaImplementasi: number;
  kemandirian: number;
  prosesBimbingan: number;
  notes: string | null;
};

type NilaiLRDetail = {
  pembimbingName: string;
  kualitasPustaka: number;
  kontenRumusan: number;
  analisisTujuan: number;
  kelengkapanKajian: number;
  kelebihanKekurangan: number;
  relasiTeori: number;
  catatan: string | null;
};

type DEDetail = {
  evaluatorName: string;
  latarBelakang: number;
  formulasiMasalah: number;
  teoriPendukung: number;
  ideMetode: number;
  catatanReviewer: string | null;
  isLate: boolean;
};

type PresentasiDetail = {
  pembimbingName: string;
  latarBelakangScore: number;
  teoriPendukungScore: number;
  toolsPemodelanScore: number;
  pemaparanScore: number;
  komunikasiScore: number;
};

export type AssessmentDetail = {
  nilaiBimbingan: NilaiBimbinganDetail[];
  nilaiLiteratureReview: NilaiLRDetail[];
  deskEvaluation: DEDetail | null;
  nilaiPresentasi: PresentasiDetail[];
};

type ProgramWeights = {
  bimbinganPct: number;
  lrPct: number;
  dePct: number;
  presentasiPct: number;
};

export type RekapRow = {
  id: string;
  nim: string;
  name: string;
  kelas: string;
  prodi: string;
  status: string;
  proposalId: string | null;
  lrScore: number | null;
  bimbinganScore: number | null;
  deScore: number | null;
  presentasiScore: number | null;
  weightedTotal: number | null;
  gradeIndex: string | null;
  passed: boolean | null;
  isLate: boolean;
  isRetake?: boolean;
  weights: ProgramWeights | null;
  detail: AssessmentDetail;
};

// ─── Excel export ─────────────────────────────────────────────────────────────
function weightedContrib(score: number | null, pct: number): string {
  if (score === null) return "–";
  return `${score.toFixed(1)} × ${pct}% = ${((score * pct) / 100).toFixed(2)}`;
}

function exportToExcel(rows: RekapRow[]) {
  const data = rows.map((r) => ({
    Kelas: r.kelas,
    NIM: r.nim,
    Nama: r.name,
    Mengulang: r.isRetake ? "Ya" : "Tidak",
    Prodi: r.prodi,
    Status: STATUS_LABELS[r.status] ?? r.status,
    "Nilai LR": r.lrScore !== null ? r.lrScore.toFixed(1) : "–",
    "Nilai Bimbingan": r.bimbinganScore !== null ? r.bimbinganScore.toFixed(1) : "–",
    "Nilai DE": r.deScore !== null ? r.deScore.toFixed(1) : "–",
    "Terlambat DE": r.isLate ? "Ya" : "Tidak",
    "Nilai Presentasi": r.presentasiScore !== null ? r.presentasiScore.toFixed(1) : "–",
    ...(r.weights
      ? {
          [`Kontribusi LR (${r.weights.lrPct}%)`]: weightedContrib(r.lrScore, r.weights.lrPct),
          [`Kontribusi Bimbingan (${r.weights.bimbinganPct}%)`]: weightedContrib(r.bimbinganScore, r.weights.bimbinganPct),
          [`Kontribusi DE (${r.weights.dePct}%)`]: weightedContrib(r.deScore, r.weights.dePct),
          [`Kontribusi Presentasi (${r.weights.presentasiPct}%)`]: weightedContrib(r.presentasiScore, r.weights.presentasiPct),
        }
      : {}),
    "Nilai Akhir": r.weightedTotal !== null ? r.weightedTotal.toFixed(2) : "–",
    "Huruf": r.gradeIndex ?? "–",
    "Status Kelulusan": r.passed === null ? "–" : r.passed ? "LULUS" : "TIDAK LULUS",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String((r as Record<string, string>)[key] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `rekap-nilai-${date}.xlsx`);
}

// ─── Status labels ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Terdaftar",
  PROPOSAL_UPLOADED: "Proposal Terdaftar",
  ASSIGNED: "Pembimbing Ditugaskan",
  BIMBINGAN: "Bimbingan",
  DE_READY: "Siap DE",
  DE_COMPLETED: "DE Selesai",
  REVISION_UPLOADED: "Revisi Diunggah",
  SEMINAR_REGISTERED: "Daftar Seminar",
  SEMINAR_COMPLETED: "Seminar Selesai",
  COMPLETED: "Selesai",
};

// ─── Detail modal helpers ──────────────────────────────────────────────────────
function ScoreRow({ label, score, max }: { label: string; score: number; max?: number }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xs font-medium tabular-nums shrink-0">
        {score.toFixed(1)}{max !== undefined ? `/${max}` : ""}
      </span>
    </div>
  );
}

function SectionHeader({ title, total }: { title: string; total: number }) {
  return (
    <div className="flex justify-between items-center mb-2">
      <p className="text-xs font-semibold text-gray-800">{title}</p>
      <span className="text-sm font-bold tabular-nums">{total.toFixed(1)}</span>
    </div>
  );
}

function DetailModalContent({ row }: { row: RekapRow }) {
  const d = row.detail;
  const hasAny =
    d.nilaiBimbingan.length > 0 ||
    d.nilaiLiteratureReview.length > 0 ||
    d.deskEvaluation !== null ||
    d.nilaiPresentasi.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        Belum ada nilai yang diinputkan.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Nilai Bimbingan */}
      {d.nilaiBimbingan.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
            Nilai Bimbingan
          </p>
          <div className="space-y-3">
            {d.nilaiBimbingan.map((nb, i) => {
              const total =
                nb.pemilihanTema +
                nb.researchQuestion +
                nb.studiLiteratur1 +
                nb.studiLiteratur2 +
                nb.rencanaImplementasi +
                nb.kemandirian +
                nb.prosesBimbingan;
              return (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <SectionHeader title={nb.pembimbingName} total={total} />
                  <ScoreRow label="Pemilihan Tema" score={nb.pemilihanTema} max={15} />
                  <ScoreRow label="Pertanyaan Penelitian (Research Question)" score={nb.researchQuestion} max={15} />
                  <ScoreRow label="Studi Literatur – Ide/Gagasan/Strategi" score={nb.studiLiteratur1} max={10} />
                  <ScoreRow label="Studi Literatur – Justifikasi Model/Metode" score={nb.studiLiteratur2} max={10} />
                  <ScoreRow label="Rencana Implementasi/Simulasi/Komputasi" score={nb.rencanaImplementasi} max={10} />
                  <ScoreRow label="Kemandirian Mahasiswa dalam Penyusunan Proposal" score={nb.kemandirian} max={20} />
                  <ScoreRow label="Proses Bimbingan" score={nb.prosesBimbingan} max={20} />
                  {nb.notes && (
                    <p className="mt-2 text-xs text-gray-500 italic">Catatan: {nb.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Literature Review */}
      {d.nilaiLiteratureReview.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
            Literature Review
          </p>
          <div className="space-y-3">
            {d.nilaiLiteratureReview.map((lr, i) => {
              const total =
                lr.kualitasPustaka +
                lr.kontenRumusan +
                lr.analisisTujuan +
                lr.kelengkapanKajian +
                lr.kelebihanKekurangan +
                lr.relasiTeori;
              return (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <SectionHeader title={lr.pembimbingName} total={total} />
                  <ScoreRow label="Kualitas Pustaka sebagai Referensi Utama" score={lr.kualitasPustaka} max={10} />
                  <ScoreRow label="Konten Pustaka mengenai Rumusan Masalah" score={lr.kontenRumusan} max={10} />
                  <ScoreRow label="Analisis Pustaka terkait Tujuan/Ide Pokok" score={lr.analisisTujuan} max={10} />
                  <ScoreRow label="Kelengkapan Kajian Teori Metode/Algoritma" score={lr.kelengkapanKajian} max={10} />
                  <ScoreRow label="Kelebihan dan Kekurangan Penelitian" score={lr.kelebihanKekurangan} max={40} />
                  <ScoreRow label="Relasi Teori terhadap Topik Proposal" score={lr.relasiTeori} max={20} />
                  {lr.catatan && (
                    <p className="mt-2 text-xs text-gray-500 italic">Catatan: {lr.catatan}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desk Evaluation */}
      {d.deskEvaluation && (
        <div>
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
            Desk Evaluation
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            {d.deskEvaluation.isLate && (
              <p className="text-xs text-red-500 mb-2">
                Terlambat — nilai dikap maks. 51
              </p>
            )}
            <SectionHeader
              title={d.deskEvaluation.evaluatorName}
              total={Math.min(
                d.deskEvaluation.latarBelakang +
                  d.deskEvaluation.formulasiMasalah +
                  d.deskEvaluation.teoriPendukung +
                  d.deskEvaluation.ideMetode,
                d.deskEvaluation.isLate ? 51 : Infinity,
              )}
            />
            <ScoreRow label="Latar Belakang" score={d.deskEvaluation.latarBelakang} max={25} />
            <ScoreRow label="Formulasi Masalah" score={d.deskEvaluation.formulasiMasalah} max={30} />
            <ScoreRow label="Teori Pendukung / Literatur" score={d.deskEvaluation.teoriPendukung} max={30} />
            <ScoreRow label="Ide & Metode Penyelesaian" score={d.deskEvaluation.ideMetode} max={15} />
            {d.deskEvaluation.catatanReviewer && (
              <p className="mt-2 text-xs text-gray-500 italic">
                Catatan: {d.deskEvaluation.catatanReviewer}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Presentasi */}
      {d.nilaiPresentasi.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
            Presentasi Seminar
          </p>
          <div className="space-y-3">
            {d.nilaiPresentasi.map((np, i) => {
              const total =
                np.latarBelakangScore +
                np.teoriPendukungScore +
                np.toolsPemodelanScore +
                np.pemaparanScore +
                np.komunikasiScore;
              return (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <SectionHeader title={np.pembimbingName} total={total} />
                  <ScoreRow label="Menjawab Latar Belakang, Rumusan, Tujuan & Metodologi" score={np.latarBelakangScore} max={25} />
                  <ScoreRow label="Menguasai Teori Pendukung TA" score={np.teoriPendukungScore} max={15} />
                  <ScoreRow label="Menguasai Tools Pemodelan/Simulasi/Implementasi" score={np.toolsPemodelanScore} max={10} />
                  <ScoreRow label="Pemaparan / Cara Menjawab" score={np.pemaparanScore} max={25} />
                  <ScoreRow label="Komunikasi Interpersonal" score={np.komunikasiScore} max={25} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weighted calculation breakdown */}
      {(row.weights || row.weightedTotal !== null) && (
        <div className="border-t pt-4 space-y-3">
          {row.weights && (
            <>
              <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                Perhitungan Nilai Akhir
              </p>
              <div className="rounded-lg border divide-y overflow-hidden">
                {[
                  { label: "Nilai Bimbingan", score: row.bimbinganScore, pct: row.weights.bimbinganPct },
                  { label: "Literature Review", score: row.lrScore, pct: row.weights.lrPct },
                  { label: "Desk Evaluation", score: row.deScore, pct: row.weights.dePct },
                  { label: "Nilai Presentasi", score: row.presentasiScore, pct: row.weights.presentasiPct },
                ].map(({ label, score, pct }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-2.5 bg-white min-w-0">
                    <span className="flex-1 min-w-0 text-sm text-gray-700">{label}</span>
                    <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                      {pct}%
                    </span>
                    {score !== null ? (
                      <div className="shrink-0 text-right text-sm tabular-nums">
                        <span className="text-gray-500">{score.toFixed(1)} ×</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          = {((score * pct) / 100).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0">Belum ada nilai</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {row.weightedTotal !== null && (
            <div className="flex items-center justify-between bg-gray-900 text-white rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-gray-400">Nilai Akhir</p>
                <p className="text-2xl font-bold tabular-nums">{row.weightedTotal.toFixed(2)}</p>
                <p className={`text-xs font-semibold mt-0.5 ${row.passed ? "text-green-400" : "text-red-400"}`}>
                  {row.passed ? "LULUS" : "TIDAK LULUS"}
                </p>
              </div>
              <p className="text-5xl font-bold text-white/90">{row.gradeIndex}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Table columns (static) ───────────────────────────────────────────────────
const staticColumns: ColumnDef<RekapRow>[] = [
  { accessorKey: "kelas", header: "Kelas" },
  { accessorKey: "nim", header: "NIM" },
  {
    accessorKey: "name",
    header: "Nama",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.name}</span>
        {row.original.isRetake && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
            Mengulang
          </span>
        )}
      </div>
    ),
  },
  { accessorKey: "prodi", header: "Prodi" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="text-xs text-gray-500">
        {STATUS_LABELS[row.original.status] ?? row.original.status}
      </span>
    ),
  },
  {
    accessorKey: "lrScore",
    header: "LR",
    cell: ({ row }) => row.original.lrScore?.toFixed(1) ?? "–",
  },
  {
    accessorKey: "bimbinganScore",
    header: "Bimbingan",
    cell: ({ row }) => row.original.bimbinganScore?.toFixed(1) ?? "–",
  },
  {
    accessorKey: "deScore",
    header: "DE",
    cell: ({ row }) => (
      <span>
        {row.original.deScore?.toFixed(1) ?? "–"}
        {row.original.isLate && (
          <span className="text-xs text-red-400 ml-1">(L)</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "presentasiScore",
    header: "Presentasi",
    cell: ({ row }) => row.original.presentasiScore?.toFixed(1) ?? "–",
  },
  {
    accessorKey: "weightedTotal",
    header: "Nilai Akhir",
    cell: ({ row }) =>
      row.original.weightedTotal !== null ? (
        <span className="font-bold">{row.original.weightedTotal.toFixed(2)}</span>
      ) : (
        "–"
      ),
  },
  {
    accessorKey: "gradeIndex",
    header: "Huruf",
    cell: ({ row }) => (
      <span className="font-bold text-lg">{row.original.gradeIndex ?? "–"}</span>
    ),
  },
  {
    accessorKey: "passed",
    header: "Kelulusan",
    cell: ({ row }) =>
      row.original.passed === null ? (
        <span className="text-gray-400 text-xs">–</span>
      ) : row.original.passed ? (
        <span className="text-green-600 font-semibold text-xs">LULUS</span>
      ) : (
        <span className="text-red-600 font-semibold text-xs">TIDAK LULUS</span>
      ),
  },
  {
    id: "formulir",
    header: "Formulir",
    cell: ({ row }) => {
      const pid = row.original.proposalId;
      if (!pid) return <span className="text-gray-300 text-xs">–</span>;
      const links = [
        { label: "DE", href: `/print/desk-evaluation/${pid}`, title: "Form Nilai Desk Evaluation" },
        { label: "BIM", href: `/print/bimbingan/${pid}`, title: "Form Nilai Bimbingan" },
        { label: "LR", href: `/print/literature-review/${pid}`, title: "Form Nilai Literature Review" },
        { label: "PRES", href: `/print/presentasi/${pid}`, title: "Form Nilai Presentasi" },
      ];
      return (
        <div className="flex gap-1 flex-wrap">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              title={l.title}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <FileText className="h-2.5 w-2.5" />
              {l.label}
            </a>
          ))}
        </div>
      );
    },
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
export function RekapTable({ rows }: { rows: RekapRow[] }) {
  const [selectedRow, setSelectedRow] = useState<RekapRow | null>(null);

  const columns: ColumnDef<RekapRow>[] = [
    ...staticColumns,
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedRow(row.original)}
          className="gap-1 text-xs"
        >
          <Eye className="h-3 w-3" />
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportToExcel(rows)}
          disabled={rows.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Cari mahasiswa..."
      />

      <Dialog
        open={selectedRow !== null}
        onOpenChange={(open) => { if (!open) setSelectedRow(null); }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRow?.name}
              {selectedRow?.isRetake && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  Mengulang
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRow?.nim} · Kelas {selectedRow?.kelas} · {selectedRow?.prodi}
            </DialogDescription>
          </DialogHeader>
          {selectedRow && <DetailModalContent row={selectedRow} />}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
