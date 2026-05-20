"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { saveEprtRecord } from "./actions";
import { CheckCircle, Clock, ExternalLink, Link2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type EprtRecord = {
  id: string;
  eprtDate: Date;
  screenshotUrl: string;
  status: string;
  verifiedAt: Date | null;
} | null;

export function EprtUpload({ eprt }: { eprt: EprtRecord }) {
  const router = useRouter();
  const [eprtDate, setEprtDate] = useState("");
  const [eprtLink, setEprtLink] = useState("");
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const linkValid = isValidUrl(eprtLink);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkValid) {
      toast.error("Masukkan link EpRT yang valid (harus diawali https://)");
      return;
    }
    setLoading(true);
    try {
      const result = await saveEprtRecord(eprtDate, eprtLink);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Link EpRT berhasil disimpan! Menunggu verifikasi dari Dosen Kelas.");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (eprt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {eprt.status === "VERIFIED" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            Status EpRT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={eprt.status} type="eprt" />
            {eprt.status === "VERIFIED" && eprt.verifiedAt && (
              <span className="text-xs text-gray-500">
                Diverifikasi pada{" "}
                {format(new Date(eprt.verifiedAt), "dd MMM yyyy", { locale: idLocale })}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Tanggal EpRT</p>
            <p className="text-sm font-medium">
              {format(new Date(eprt.eprtDate), "dd MMMM yyyy", { locale: idLocale })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Link EpRT</p>
            <a
              href={eprt.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka Link EpRT
            </a>
          </div>
          {eprt.status === "PENDING" && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              EpRT Anda sedang menunggu verifikasi dari Dosen Kelas.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Submit Link EpRT
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="eprtDate">Tanggal EpRT *</Label>
            <Input
              id="eprtDate"
              type="date"
              required
              max={today}
              value={eprtDate}
              onChange={(e) => setEprtDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="eprtLink">Link EpRT *</Label>
            <Input
              id="eprtLink"
              type="url"
              placeholder="https://drive.google.com/file/..."
              value={eprtLink}
              onChange={(e) => setEprtLink(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Masukkan link Google Drive, OneDrive, atau platform lain yang berisi screenshot/dokumen nilai EpRT. Pastikan link dapat diakses siapapun yang memiliki link.
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading || !linkValid || !eprtDate}
            className="bg-[#C8102E] hover:bg-[#a50d26]"
          >
            {loading ? "Menyimpan..." : "Simpan Link EpRT"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
