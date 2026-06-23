"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Crown } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type HistoricalImportSource = "KAPRODI_FULL" | "KETUA_KK_TA_PAST" | null;

type Assignment = {
  proposalId: string;
  role: "P1" | "P2";
  titleId: string | null;
  status: string;
  studentName: string;
  nim: string;
  studentId: string;
  classCode: string;
  programCode: string;
  academicStage: "PENULISAN_PROPOSAL" | "TUGAS_AKHIR_2" | "COMPLETED";
  academicYear: string;
  semester: string;
  isRetake: boolean;
  isContinuedActive?: boolean;
  historicalImportSource?: HistoricalImportSource;
  tanggalYudisium?: string | null;
};

type DEAssignment = {
  proposalId: string;
  status: string;
  isHistoricalImport: boolean;
  historicalImportSource?: HistoricalImportSource;
  studentName: string;
  nim: string;
  studentId: string;
  classCode: string;
  programCode: string;
  academicStage: "PENULISAN_PROPOSAL" | "TUGAS_AKHIR_2" | "COMPLETED";
  academicYear: string;
  semester: string;
  isRetake: boolean;
};

export type DosenRow = {
  id: string;
  name: string;
  identifier: string;
  kodeDosen: string | null;
  isKetua: boolean;
  historicalCount: number;
  activeCount: number;
  graduatedCount: number;
  deCount: number;
  potentialTotal: number;
  duplicateActiveCount: number;
  remaining: number;
  loadPct: number;
  loadStatus: "ringan" | "normal" | "hampir-penuh" | "melebihi-kuota";
  historicalAssignments: Assignment[];
  activeAssignments: Assignment[];
  graduatedAssignments: Assignment[];
  deAssignments: DEAssignment[];
};

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Ditugaskan",
  BIMBINGAN: "Bimbingan",
  DE_READY: "Siap DE",
  DE_COMPLETED: "DE Selesai",
  REVISION_UPLOADED: "Revisi",
  SEMINAR_REGISTERED: "Daftar Seminar",
  SEMINAR_COMPLETED: "Seminar Selesai",
  COMPLETED: "Selesai",
  LULUS: "Lulus",
};

const LOAD_CONFIG = {
  ringan: { label: "Ringan", color: "bg-green-100 text-green-700 hover:bg-green-100" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  "hampir-penuh": { label: "Hampir Penuh", color: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  "melebihi-kuota": { label: "Melebihi Kuota", color: "bg-red-100 text-red-700 hover:bg-red-100" },
};

// ── Retake badge ──────────────────────────────────────────────────────────────

function RetakeBadge() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 shrink-0 ml-1">
      Mengulang
    </span>
  );
}

function ContinuedActiveBadge() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 shrink-0 ml-1">
      Diteruskan ke kelas aktif
    </span>
  );
}

function ImportTAPastBadge() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 shrink-0 ml-1">
      IMPORT_TA_PAST
    </span>
  );
}

function AcademicStageBadge({ stage }: { stage: "PENULISAN_PROPOSAL" | "TUGAS_AKHIR_2" | "COMPLETED" }) {
  if (stage === "COMPLETED") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
        Lulus
      </span>
    );
  }
  return stage === "TUGAS_AKHIR_2" ? (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
      Tugas Akhir 2
    </span>
  ) : (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      Penulisan Proposal
    </span>
  );
}

// ── Assignment table (used inside the detail dialog) ──────────────────────────

function AssignmentTable({ assignments }: { assignments: Assignment[] }) {
  if (assignments.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic py-2 px-1">Tidak ada data</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="text-left py-1.5 pr-3 font-medium">NIM</th>
            <th className="text-left py-1.5 pr-3 font-medium">Nama</th>
            <th className="text-center py-1.5 pr-3 font-medium w-10">Peran</th>
            <th className="text-left py-1.5 pr-3 font-medium">Kelas</th>
            <th className="text-left py-1.5 pr-3 font-medium">Program Studi</th>
            <th className="text-left py-1.5 pr-3 font-medium">TA</th>
            <th className="text-left py-1.5 pr-3 font-medium">Academic Stage</th>
            <th className="text-left py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={`${a.proposalId}-${a.role}`} className="border-b last:border-0">
              <td className="py-1.5 pr-3 font-mono text-gray-600">{a.nim}</td>
              <td className="py-1.5 pr-3">
                <span className="font-medium text-gray-800">{a.studentName}</span>
                {a.isRetake && <RetakeBadge />}
                {a.isContinuedActive && <ContinuedActiveBadge />}
                {a.historicalImportSource === "KETUA_KK_TA_PAST" && <ImportTAPastBadge />}
              </td>
              <td className="py-1.5 pr-3 text-center">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    a.role === "P1"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }`}
                >
                  {a.role}
                </span>
              </td>
              <td className="py-1.5 pr-3 text-gray-600">{a.classCode}</td>
              <td className="py-1.5 pr-3 text-gray-600">{a.programCode}</td>
              <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                {a.semester}/{a.academicYear}
              </td>
              <td className="py-1.5 pr-3">
                <AcademicStageBadge stage={a.academicStage} />
              </td>
              <td className="py-1.5">
                <span className="text-gray-600">
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DETable({ assignments }: { assignments: DEAssignment[] }) {
  if (assignments.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic py-2 px-1">Tidak ada data</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="text-left py-1.5 pr-3 font-medium">NIM</th>
            <th className="text-left py-1.5 pr-3 font-medium">Nama</th>
            <th className="text-left py-1.5 pr-3 font-medium">Kelas</th>
            <th className="text-left py-1.5 pr-3 font-medium">Program Studi</th>
            <th className="text-left py-1.5 pr-3 font-medium">TA</th>
            <th className="text-left py-1.5 pr-3 font-medium">Academic Stage</th>
            <th className="text-left py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.proposalId} className="border-b last:border-0">
              <td className="py-1.5 pr-3 font-mono text-gray-600">{a.nim}</td>
              <td className="py-1.5 pr-3">
                <span className="font-medium text-gray-800">{a.studentName}</span>
                {a.isRetake && <RetakeBadge />}
                {a.historicalImportSource === "KETUA_KK_TA_PAST" && <ImportTAPastBadge />}
              </td>
              <td className="py-1.5 pr-3 text-gray-600">{a.classCode}</td>
              <td className="py-1.5 pr-3 text-gray-600">{a.programCode}</td>
              <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                {a.semester}/{a.academicYear}
              </td>
              <td className="py-1.5 pr-3">
                <AcademicStageBadge stage={a.academicStage} />
              </td>
              <td className="py-1.5 text-gray-600">
                {STATUS_LABELS[a.status] ?? a.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────

function DosenDetailDialog({
  row,
  globalQuota,
  kkName,
  open,
  onClose,
}: {
  row: DosenRow;
  globalQuota: number;
  kkName: string;
  open: boolean;
  onClose: () => void;
}) {
  const cfg = LOAD_CONFIG[row.loadStatus];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {row.isKetua && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
            {row.name}
            {row.kodeDosen && (
              <span className="text-sm font-normal text-gray-500">({row.kodeDosen})</span>
            )}
            <Badge className={cfg.color}>{cfg.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            NIP: {row.identifier} · {kkName}
          </DialogDescription>
        </DialogHeader>

        {/* Quota summary strip */}
        <div className="flex flex-wrap gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
          <span className="text-gray-500">Kuota: <strong className="text-gray-900">{globalQuota}</strong></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Historical TA2: <strong className="text-gray-700">{row.historicalCount}</strong>
          </span>
          <span className="text-gray-300">+</span>
          <span className="text-gray-500">
            Active Proposal: <strong className="text-blue-700">{row.activeCount}</strong>
          </span>
          {row.duplicateActiveCount > 0 && (
            <>
              <span className="text-gray-300">−</span>
              <span className="text-gray-500">
                Duplikat: <strong className="text-amber-700">{row.duplicateActiveCount}</strong>
              </span>
            </>
          )}
          <span className="text-gray-300">=</span>
          <span className="text-gray-500">
            Total Workload: <strong className={row.potentialTotal > globalQuota ? "text-red-600" : "text-gray-900"}>
              {row.potentialTotal}
            </strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Remaining Capacity:{" "}
            <strong className={row.remaining < 0 ? "text-red-600" : row.remaining <= 2 ? "text-amber-600" : "text-green-700"}>
              {row.remaining}
            </strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">DE: <strong className="text-orange-700">{row.deCount}</strong></span>

          {/* Progress bar */}
          <div className="w-full mt-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  row.loadStatus === "melebihi-kuota"
                    ? "bg-red-500"
                    : row.loadStatus === "hampir-penuh"
                    ? "bg-amber-400"
                    : row.loadStatus === "normal"
                    ? "bg-blue-400"
                    : "bg-green-400"
                }`}
                style={{ width: `${Math.min(row.loadPct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{row.loadPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Historical TA2 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            Historical TA2
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-600">
              {row.historicalCount}
            </span>
          </h4>
          <AssignmentTable assignments={row.historicalAssignments} />
        </div>

        {/* Active Proposal */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            Active Proposal
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-50 text-blue-700">
              {row.activeCount}
            </span>
          </h4>
          <AssignmentTable assignments={row.activeAssignments} />
        </div>

        {/* Graduated TA2 (Lulus) */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            Graduated TA2 (Lulus)
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700">
              {row.graduatedCount}
            </span>
          </h4>
          <AssignmentTable assignments={row.graduatedAssignments} />
        </div>

        {/* Desk Evaluator */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            Desk Evaluator
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-orange-50 text-orange-700">
              {row.deCount}
            </span>
          </h4>
          <DETable assignments={row.deAssignments} />
        </div>

      </DialogContent>
    </Dialog>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export function DosenWorkloadTable({
  rows,
  globalQuota,
  kkName,
}: {
  rows: DosenRow[];
  globalQuota: number;
  kkName: string;
}) {
  const [selectedRow, setSelectedRow] = useState<DosenRow | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 px-4 py-8 text-center">
        Belum ada dosen dalam Kelompok Keahlian ini.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3 font-medium">Dosen</th>
              <th className="text-center px-4 py-3 font-medium">Kode</th>
              <th className="text-center px-4 py-3 font-medium">Kuota</th>
              <th className="text-center px-4 py-3 font-medium">
                Historical TA2
                <span className="block text-[10px] font-normal text-gray-400">(fixed)</span>
              </th>
              <th className="text-center px-4 py-3 font-medium">
                Graduated TA2
                <span className="block text-[10px] font-normal text-gray-400">(lulus)</span>
              </th>
              <th className="text-center px-4 py-3 font-medium">
                Active Proposal
                <span className="block text-[10px] font-normal text-gray-400">(expected)</span>
              </th>
              <th className="text-center px-4 py-3 font-medium">Total Workload</th>
              <th className="text-center px-4 py-3 font-medium">Remaining Capacity</th>
              <th className="text-center px-4 py-3 font-medium">DE</th>
              <th className="text-center px-4 py-3 font-medium">Beban</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const cfg = LOAD_CONFIG[d.loadStatus];
              const barPct = Math.min(d.loadPct, 100);

              return (
                <tr
                  key={d.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedRow(d)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {d.isKetua && (
                        <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                      )}
                      <span className="font-medium text-gray-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">
                    {d.kodeDosen ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{globalQuota}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-gray-700">{d.historicalCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-emerald-700">{d.graduatedCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-blue-700">{d.activeCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-bold ${
                        d.potentialTotal > globalQuota ? "text-red-600" : "text-gray-800"
                      }`}
                    >
                      {d.potentialTotal}
                    </span>
                    {d.duplicateActiveCount > 0 && (
                      <span
                        className="block text-[10px] font-normal text-amber-600 mt-0.5"
                        title="Mahasiswa mengulang dengan dosen yang sama: tidak dihitung dua kali"
                      >
                        −{d.duplicateActiveCount} duplikat
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        d.remaining < 0
                          ? "text-red-600 font-semibold"
                          : d.remaining <= 2
                          ? "text-amber-600 font-medium"
                          : "text-green-700 font-medium"
                      }
                    >
                      {d.remaining}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-orange-700 font-medium">
                    {d.deCount > 0 ? d.deCount : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-14 bg-gray-200 rounded-full h-1.5 shrink-0">
                        <div
                          className={`h-1.5 rounded-full ${
                            d.loadStatus === "melebihi-kuota"
                              ? "bg-red-500"
                              : d.loadStatus === "hampir-penuh"
                              ? "bg-amber-400"
                              : d.loadStatus === "normal"
                              ? "bg-blue-400"
                              : "bg-green-400"
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Indikator beban:</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          Ringan (0–50%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          Normal (51–80%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Hampir Penuh (81–100%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Melebihi Kuota (&gt;100%)
        </span>
      </div>

      {selectedRow && (
        <DosenDetailDialog
          row={selectedRow}
          globalQuota={globalQuota}
          kkName={kkName}
          open={!!selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </>
  );
}
