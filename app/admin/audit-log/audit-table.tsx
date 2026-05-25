"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
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
import { Search, X } from "lucide-react";

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

const ACTION_LABELS: Record<string, string> = {
  BULK_IMPORT_HISTORICAL: "Import Historis",
  ASSIGN_KAPRODI: "Tetapkan Kaprodi",
  REMOVE_KAPRODI: "Hapus Kaprodi",
  ASSIGN_PEMBIMBING_KK: "Penugasan Pembimbing",
  KK_SYNC: "Sinkronisasi KK",
  DOSEN_SYNC: "Sinkronisasi Dosen",
};

const ACTION_COLORS: Record<string, string> = {
  BULK_IMPORT_HISTORICAL: "bg-indigo-100 text-indigo-800",
  ASSIGN_KAPRODI: "bg-green-100 text-green-800",
  REMOVE_KAPRODI: "bg-red-100 text-red-800",
  ASSIGN_PEMBIMBING_KK: "bg-blue-100 text-blue-800",
  KK_SYNC: "bg-purple-100 text-purple-800",
  DOSEN_SYNC: "bg-gray-100 text-gray-700",
};

const ROLE_LABELS: Record<string, string> = {
  KAPRODI: "Kaprodi",
  KETUA_KK: "Ketua KK",
  ADMIN: "Admin",
  DOSEN: "Dosen",
  KOORDINATOR: "Koordinator",
};

function DetailModal({ detail }: { detail: unknown }) {
  if (!detail) return <span className="text-gray-400 text-xs">—</span>;

  return (
    <Dialog>
      <DialogTrigger>
        <button className="text-xs text-blue-600 hover:underline">Lihat detail</button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Aksi</DialogTitle>
        </DialogHeader>
        <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
          {JSON.stringify(detail, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogFilters({
  search,
  action,
  role,
}: {
  search: string;
  action: string;
  role: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => router.push(pathname);

  const hasFilters = search || action || role;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          className="pl-8 w-56"
          placeholder="Cari nama/email..."
          defaultValue={search}
          onBlur={(e) => update("search", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("search", (e.target as HTMLInputElement).value);
          }}
        />
      </div>

      <Select value={action || "_all"} onValueChange={(v) => { if (v) update("action", v === "_all" ? "" : v); }}>
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

      <Select value={role || "_all"} onValueChange={(v) => { if (v) update("role", v === "_all" ? "" : v); }}>
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
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-gray-500">
          <X className="h-4 w-4 mr-1" /> Reset
        </Button>
      )}
    </div>
  );
}

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">Tidak ada log yang cocok dengan filter.</p>
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
                {new Date(log.createdAt).toLocaleString("id-ID", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
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
                <Badge className={`text-xs ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
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

  const go = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
      <span>
        Halaman {page} dari {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
          ← Sebelumnya
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => go(page + 1)}>
          Berikutnya →
        </Button>
      </div>
    </div>
  );
}
