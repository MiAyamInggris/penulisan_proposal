"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

    setLoading(true);
    setUploaded(false);
    setFailed(false);
    setFileName(file.name);

    const controller = new AbortController();
    // 30 s client-side timeout so the button never stays stuck forever
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Gagal mengupload file");
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
      // Reset input so the same file can be retried
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
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
        <span className="text-xs text-gray-500 truncate max-w-[200px]">
          {fileName}
        </span>
      )}
    </div>
  );
}
