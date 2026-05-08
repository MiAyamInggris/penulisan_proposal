"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";

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
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (data.url) {
        onUpload(data.url);
        setUploaded(true);
      }
    } finally {
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
        className={uploaded ? "border-green-400 text-green-700" : ""}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : uploaded ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {loading ? "Mengunggah..." : uploaded ? "Terunggah" : label}
      </Button>
      {fileName && !loading && (
        <span className="text-xs text-gray-500 truncate max-w-[200px]">{fileName}</span>
      )}
    </div>
  );
}
