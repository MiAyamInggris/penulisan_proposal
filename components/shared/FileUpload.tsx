"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Must stay in sync with MAX_SIZE_BYTES in app/api/upload/route.ts
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

type Props = {
  folder?: string;
  accept?: string;
  label?: string;
  onUpload: (url: string) => void;
};

export function FileUpload({
  folder = "uploads",
  accept = "*",
  label = "Pilih File",
  onUpload,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Client-side pre-flight checks ──────────────────────────────────────
    if (file.size === 0) {
      toast.error("File kosong. Pilih file yang valid.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(
        `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
          `Maksimal ${MAX_FILE_BYTES / 1024 / 1024} MB.`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLoading(true);
    setUploaded(false);
    setFailed(false);
    setFileName(file.name);

    // 45 s client-side abort — longer than maxDuration so the server error
    // message (not an AbortError) reaches the client first in most cases.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      let data: { url?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server mengembalikan respons tidak valid (HTTP ${res.status})`);
      }

      if (!res.ok || !data.url) {
        throw new Error(
          data.error ||
            (res.status === 401
              ? "Sesi habis — silakan login ulang"
              : res.status === 413
              ? "File terlalu besar untuk diunggah"
              : res.status === 503
              ? "Layanan penyimpanan belum dikonfigurasi"
              : `Upload gagal (HTTP ${res.status})`)
        );
      }

      onUpload(data.url);
      setUploaded(true);
    } catch (err: any) {
      setFailed(true);
      setFileName(null);
      const msg =
        err?.name === "AbortError"
          ? "Upload timeout — coba lagi atau gunakan file yang lebih kecil"
          : err?.message || "Gagal mengupload file. Coba lagi.";
      toast.error(msg);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={
          uploaded
            ? "border-green-400 text-green-700"
            : failed
            ? "border-red-400 text-red-600"
            : ""
        }
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : uploaded ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : failed ? (
          <AlertCircle className="mr-2 h-4 w-4" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {loading
          ? "Mengunggah..."
          : uploaded
          ? "Terunggah"
          : failed
          ? "Coba Lagi"
          : label}
      </Button>
      {fileName && !loading && !failed && (
        <span className="text-xs text-gray-500 truncate max-w-[200px]" title={fileName}>
          {fileName}
        </span>
      )}
    </div>
  );
}
