"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, X, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ArrowLeftRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuditLogRow = {
  id: string;
  action: string;
  userRole: string;
  entityType: string | null;
  entityId: string | null;
  detail: unknown;
  createdAt: string;
  user: { name: string; email: string };
};

interface ScoreDetail {
  assessmentType: string;
  proposalId: string;
  mahasiswaName: string;
  mahasiswaNim: string;
  classCode: string;
  dosenName?: string;
  dosenRole: string;
  isUpdate: boolean;
  previousTotal: number | null;
  newTotal: number;
  previousFields: Record<string, number> | null;
  newFields: Record<string, number>;
  source: "MANUAL" | "BULK_IMPORT";
  importedBy?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  BULK_IMPORT_HISTORICAL: "Import Historis",
  BULK_IMPORT_HISTORICAL_QUOTA: "Import Kuota Historis TA2",
  ASSIGN_KAPRODI: "Tetapkan Kaprodi",
  REMOVE_KAPRODI: "Hapus Kaprodi",
  ASSIGN_PEMBIMBING_KK: "Penugasan Pembimbing",
  KK_SYNC: "Sinkronisasi KK",
  DOSEN_SYNC: "Sinkronisasi Dosen",
  GRADUATE_UPDATE_IMPORT: "Update Mahasiswa Lulus (Bulk)",
  GRADUATE_STUDENT: "Update Mahasiswa Lulus",
  SIDANG_IMPORT_BULK: "Import Plotting Penguji",
  ASSIGN_PENGUJI_SIDANG: "Tugaskan Penguji",
  REASSIGN_PENGUJI_SIDANG: "Ubah Penguji",
  ASSIGNMENT_UPDATED: "Assignment Updated",
  CROSS_KK_EXAMINER_ASSIGNMENT: "Cross-KK Examiner Assignment",
};

const ACTION_COLORS: Record<string, string> = {
  BULK_IMPORT_HISTORICAL: "bg-indigo-100 text-indigo-800",
  BULK_IMPORT_HISTORICAL_QUOTA: "bg-indigo-100 text-indigo-800",
  ASSIGN_KAPRODI: "bg-green-100 text-green-800",
  REMOVE_KAPRODI: "bg-red-100 text-red-800",
  ASSIGN_PEMBIMBING_KK: "bg-blue-100 text-blue-800",
  KK_SYNC: "bg-purple-100 text-purple-800",
  DOSEN_SYNC: "bg-gray-100 text-gray-700",
  GRADUATE_UPDATE_IMPORT: "bg-emerald-100 text-emerald-800",
  GRADUATE_STUDENT: "bg-emerald-50 text-emerald-700",
  SIDANG_IMPORT_BULK: "bg-rose-100 text-rose-800",
  ASSIGN_PENGUJI_SIDANG: "bg-rose-50 text-rose-700",
  REASSIGN_PENGUJI_SIDANG: "bg-amber-100 text-amber-800",
  ASSIGNMENT_UPDATED: "bg-orange-100 text-orange-800",
  CROSS_KK_EXAMINER_ASSIGNMENT: "bg-fuchsia-100 text-fuchsia-800",
};

const ACTION_ICONS: Partial<Record<string, typeof RefreshCw>> = {
  ASSIGNMENT_UPDATED: RefreshCw,
  REASSIGN_PENGUJI_SIDANG: RefreshCw,
  CROSS_KK_EXAMINER_ASSIGNMENT: ArrowLeftRight,
};

type AssignmentChange = { field: string; previous: string; new: string };

const ROLE_LABELS: Record<string, string> = {
  KAPRODI: "Kaprodi",
  KETUA_KK: "Ketua KK",
  ADMIN: "Admin",
  DOSEN: "Dosen",
  KOORDINATOR: "Koordinator",
};

const ASSESSMENT_LABELS: Record<string, string> = {
  NILAI_BIMBINGAN: "Nilai Bimbingan",
  NILAI_LR: "Literature Review",
  DESK_EVALUATION: "Desk Evaluation",
  NILAI_PRESENTASI: "Nilai Presentasi",
};

const DOSEN_ROLE_LABELS: Record<string, string> = {
  PEMBIMBING_1: "Pembimbing 1",
  PEMBIMBING_2: "Pembimbing 2",
  DESK_EVALUATOR: "Desk Evaluator",
  PEMBIMBING: "Pembimbing",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(2);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function useUpdateParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname ?? ""}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );
}

// ─── View Tabs ────────────────────────────────────────────────────────────────

export function ViewTabs({ view }: { view: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const go = (v: string) => startTransition(() => router.push(`${pathname ?? ""}?view=${v}`));

  return (
    <div className="flex gap-1 border-b mb-2 items-center">
      <button
        onClick={() => go("admin")}
        disabled={isPending}
        className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors disabled:opacity-60 ${
          view !== "scores"
            ? "border-[#C8102E] text-[#C8102E]"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Aksi Admin
      </button>
      <button
        onClick={() => go("scores")}
        disabled={isPending}
        className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors disabled:opacity-60 ${
          view === "scores"
            ? "border-[#C8102E] text-[#C8102E]"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Log Nilai
      </button>
      {isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin text-gray-400" />}
    </div>
  );
}

// ─── Admin Action Filters ─────────────────────────────────────────────────────

export function AuditLogFilters({
  search,
  action,
  role,
}: {
  search: string;
  action: string;
  role: string;
}) {
  const update = useUpdateParam();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["search", "action", "role", "page"].forEach((k) => params.delete(k));
    startTransition(() => router.push(`${pathname ?? ""}?${params.toString()}`));
  };

  const hasFilters = search || action || role;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          className="pl-8 w-56"
          placeholder="Cari nama/email..."
          defaultValue={search}
          disabled={isPending}
          onBlur={(e) => startTransition(() => update("search", e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") startTransition(() => update("search", (e.target as HTMLInputElement).value));
          }}
        />
      </div>

      <Select
        value={action || "_all"}
        disabled={isPending}
        onValueChange={(v) => { if (v) startTransition(() => update("action", v === "_all" ? "" : v)); }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Semua aksi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Semua aksi</SelectItem>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={role || "_all"}
        disabled={isPending}
        onValueChange={(v) => { if (v) startTransition(() => update("role", v === "_all" ? "" : v)); }}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Semua peran" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Semua peran</SelectItem>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} disabled={isPending} className="text-gray-500">
          <X className="h-4 w-4 mr-1" /> Reset
        </Button>
      )}

      {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
    </div>
  );
}

// ─── Score Log Filters ────────────────────────────────────────────────────────

export function ScoreLogFilters({
  mahasiswa,
  assessmentType,
  modified,
  dosen,
  dateFrom,
  dateTo,
}: {
  mahasiswa: string;
  assessmentType: string;
  modified: string;
  dosen: string;
  dateFrom: string;
  dateTo: string;
}) {
  const update = useUpdateParam();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["mahasiswa", "assessmentType", "modified", "dosen", "dateFrom", "dateTo", "page"].forEach(
      (k) => params.delete(k)
    );
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const hasFilters = mahasiswa || assessmentType || modified || dosen || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          className="pl-8 w-44"
          placeholder="NIM / Nama mahasiswa"
          defaultValue={mahasiswa}
          disabled={isPending}
          onBlur={(e) => startTransition(() => update("mahasiswa", e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") startTransition(() => update("mahasiswa", (e.target as HTMLInputElement).value));
          }}
        />
      </div>

      <Input
        className="w-40"
        placeholder="Nama dosen..."
        defaultValue={dosen}
        disabled={isPending}
        onBlur={(e) => startTransition(() => update("dosen", e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") startTransition(() => update("dosen", (e.target as HTMLInputElement).value));
        }}
      />

      <Select
        value={assessmentType || "_all"}
        disabled={isPending}
        onValueChange={(v) => { if (v) startTransition(() => update("assessmentType", v === "_all" ? "" : v)); }}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Semua penilaian" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Semua penilaian</SelectItem>
          {Object.entries(ASSESSMENT_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={modified || "_all"}
        disabled={isPending}
        onValueChange={(v) => { if (v) startTransition(() => update("modified", v === "_all" ? "" : v)); }}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Semua status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Semua status</SelectItem>
          <SelectItem value="1">Hanya yang diubah</SelectItem>
        </SelectContent>
      </Select>

      <Input
        className="w-36"
        type="date"
        value={dateFrom}
        disabled={isPending}
        onChange={(e) => startTransition(() => update("dateFrom", e.target.value))}
        title="Dari tanggal"
      />
      <Input
        className="w-36"
        type="date"
        value={dateTo}
        disabled={isPending}
        onChange={(e) => startTransition(() => update("dateTo", e.target.value))}
        title="Sampai tanggal"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} disabled={isPending} className="text-gray-500">
          <X className="h-4 w-4 mr-1" /> Reset
        </Button>
      )}

      {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
    </div>
  );
}

// ─── Admin Action Table ───────────────────────────────────────────────────────

function DetailModal({ detail }: { detail: unknown }) {
  if (!detail) return <span className="text-gray-400 text-xs">—</span>;

  const obj = detail as Record<string, unknown>;
  const changes = Array.isArray(obj.changes) ? (obj.changes as AssignmentChange[]) : null;

  return (
    <Dialog>
      <DialogTrigger>
        <button className="text-xs text-blue-600 hover:underline">Lihat detail</button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Aksi</DialogTitle>
        </DialogHeader>
        {changes && changes.length > 0 ? (
          <div className="space-y-3 text-sm">
            {typeof obj.nim === "string" && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">NIM</span>
                <span className="font-mono">{String(obj.nim)}</span>
                {typeof obj.nama === "string" && (
                  <>
                    <span className="text-gray-500">Nama</span>
                    <span className="font-medium">{String(obj.nama)}</span>
                  </>
                )}
              </div>
            )}
            <table className="w-full text-xs border rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="text-left py-1.5 px-2 font-medium">Field</th>
                  <th className="text-left py-1.5 px-2 font-medium text-red-600">Sebelum</th>
                  <th className="text-left py-1.5 px-2 font-medium text-green-700">Setelah</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1.5 px-2 text-gray-700">{c.field}</td>
                    <td className="py-1.5 px-2 text-red-600">{c.previous}</td>
                    <td className="py-1.5 px-2 text-green-700 font-medium">{c.new}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
            {JSON.stringify(detail, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        Tidak ada log yang cocok dengan filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 bg-gray-50">
            <th className="px-4 py-2.5 font-medium">Waktu</th>
            <th className="px-4 py-2.5 font-medium">Pengguna</th>
            <th className="px-4 py-2.5 font-medium">Peran</th>
            <th className="px-4 py-2.5 font-medium">Aksi</th>
            <th className="px-4 py-2.5 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => (
            <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                {formatDateTime(log.createdAt)}
              </td>
              <td className="px-4 py-2.5">
                <p className="font-medium text-gray-900">{log.user.name}</p>
                <p className="text-xs text-gray-400">{log.user.email}</p>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {ROLE_LABELS[log.userRole] ?? log.userRole}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <Badge className={`text-xs gap-1 ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                  {ACTION_ICONS[log.action] && (() => {
                    const Icon = ACTION_ICONS[log.action]!;
                    return <Icon className="h-3 w-3" />;
                  })()}
                  {ACTION_LABELS[log.action] ?? log.action}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <DetailModal detail={log.detail} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Score Log Detail Modal ────────────────────────────────────────────────────

function ScoreDetailModal({ row }: { row: AuditLogRow }) {
  const d = row.detail as ScoreDetail;
  const isUpdate = row.action === "SCORE_UPDATE";

  const fieldLabels: Record<string, string> = {
    pemilihanTema: "Pemilihan Tema",
    researchQuestion: "Research Question",
    studiLiteratur1: "Studi Literatur 1",
    studiLiteratur2: "Studi Literatur 2",
    rencanaImplementasi: "Rencana Implementasi",
    kemandirian: "Kemandirian",
    prosesBimbingan: "Proses Bimbingan",
    kualitasPustaka: "Kualitas Pustaka",
    kontenRumusan: "Konten & Rumusan",
    analisisTujuan: "Analisis & Tujuan",
    kelengkapanKajian: "Kelengkapan Kajian",
    kelebihanKekurangan: "Kelebihan & Kekurangan",
    relasiTeori: "Relasi Teori",
    latarBelakang: "Latar Belakang",
    formulasiMasalah: "Formulasi Masalah",
    teoriPendukung: "Teori Pendukung",
    ideMetode: "Ide & Metode",
    latarBelakangScore: "Latar Belakang",
    teoriPendukungScore: "Teori Pendukung",
    toolsPemodelanScore: "Tools & Pemodelan",
    pemaparanScore: "Pemaparan",
    komunikasiScore: "Komunikasi",
    isLate: "Terlambat",
  };

  return (
    <Dialog>
      <DialogTrigger>
        <button className="text-xs text-blue-600 hover:underline">Detail</button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpdate ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            {isUpdate ? "Perubahan Nilai" : "Input Nilai Awal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <span className="text-gray-500">Mahasiswa</span>
            <span className="font-medium">{d.mahasiswaName} ({d.mahasiswaNim})</span>
            <span className="text-gray-500">Kelas</span>
            <span>{d.classCode}</span>
            <span className="text-gray-500">Jenis Penilaian</span>
            <span>{ASSESSMENT_LABELS[d.assessmentType] ?? d.assessmentType}</span>
            <span className="text-gray-500">Dosen</span>
            <span>
              {d.source === "BULK_IMPORT" && d.dosenName ? d.dosenName : row.user.name}
              <span className="ml-1 text-xs text-gray-400">
                ({DOSEN_ROLE_LABELS[d.dosenRole] ?? d.dosenRole})
              </span>
            </span>
            {d.source === "BULK_IMPORT" && (
              <>
                <span className="text-gray-500">Diimpor oleh</span>
                <span>{d.importedBy ?? row.user.name}</span>
              </>
            )}
            <span className="text-gray-500">Waktu</span>
            <span>{formatDateTime(row.createdAt)}</span>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Rincian Nilai
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1 pr-3 font-medium">Komponen</th>
                  {isUpdate && d.previousFields && (
                    <th className="text-right py-1 pr-3 font-medium text-red-600">Lama</th>
                  )}
                  <th className="text-right py-1 font-medium text-green-700">
                    {isUpdate ? "Baru" : "Nilai"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(d.newFields).map(([key, val]) => (
                  <tr key={key} className="border-t">
                    <td className="py-1 pr-3 text-gray-600">
                      {fieldLabels[key] ?? key}
                    </td>
                    {isUpdate && d.previousFields && (
                      <td className="py-1 pr-3 text-right text-red-600">
                        {typeof d.previousFields[key] === "number"
                          ? fmt(d.previousFields[key])
                          : "—"}
                      </td>
                    )}
                    <td className="py-1 text-right font-medium text-green-700">
                      {typeof val === "number" ? fmt(val) : String(val)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="py-1.5 pr-3">Total</td>
                  {isUpdate && d.previousFields && (
                    <td className="py-1.5 pr-3 text-right text-red-600">
                      {fmt(d.previousTotal)}
                    </td>
                  )}
                  <td className="py-1.5 text-right text-green-700">{fmt(d.newTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Score Log Table ──────────────────────────────────────────────────────────

export function ScoreLogTable({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        Tidak ada log nilai yang cocok dengan filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 bg-gray-50">
            <th className="px-4 py-2.5 font-medium">Waktu</th>
            <th className="px-4 py-2.5 font-medium">Mahasiswa</th>
            <th className="px-4 py-2.5 font-medium">Kelas</th>
            <th className="px-4 py-2.5 font-medium">Dosen</th>
            <th className="px-4 py-2.5 font-medium">Peran</th>
            <th className="px-4 py-2.5 font-medium">Penilaian</th>
            <th className="px-4 py-2.5 font-medium text-right">Skor Lama</th>
            <th className="px-4 py-2.5 font-medium text-right">Skor Baru</th>
            <th className="px-4 py-2.5 font-medium text-center">Status</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const d = row.detail as ScoreDetail | null;
            if (!d) return null;
            const isUpdate = row.action === "SCORE_UPDATE";
            const dosenDisplay =
              d.source === "BULK_IMPORT" && d.dosenName ? d.dosenName : row.user.name;

            return (
              <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                  {formatDateTime(row.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{d.mahasiswaName}</p>
                  <p className="text-xs text-gray-400">{d.mahasiswaNim}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{d.classCode}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{dosenDisplay}</p>
                  {d.source === "BULK_IMPORT" && (
                    <p className="text-xs text-gray-400">impor: {d.importedBy ?? row.user.name}</p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {DOSEN_ROLE_LABELS[d.dosenRole] ?? d.dosenRole}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {ASSESSMENT_LABELS[d.assessmentType] ?? d.assessmentType}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                  {isUpdate ? fmt(d.previousTotal) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                  {fmt(d.newTotal)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {isUpdate ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded"
                      title="Nilai diubah setelah input pertama"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Diubah
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      Normal
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <ScoreDetailModal row={row} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function AuditLogPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const go = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname ?? ""}?${params.toString()}`));
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
      <span className="flex items-center gap-2">
        Halaman {page} dari {totalPages}
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => go(page - 1)}>
          ← Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isPending}
          onClick={() => go(page + 1)}
        >
          Berikutnya →
        </Button>
      </div>
    </div>
  );
}
