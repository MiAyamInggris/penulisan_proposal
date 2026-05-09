"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { uploadEprt } from "./actions";
import { Upload, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type EprtRecord = {
  id: string;
  eprtDate: Date;
  screenshotUrl: string;
  status: string;
  verifiedAt: Date | null;
} | null;

export function EprtUpload({ eprt }: { eprt: EprtRecord }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await uploadEprt(new FormData(e.currentTarget));
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("EpRT berhasil diupload! Menunggu verifikasi dari Dosen Kelas.");
        router.refresh();
      }
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
            <p className="text-xs text-gray-500">Screenshot</p>
            <a
              href={eprt.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Lihat Screenshot EpRT
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
          <Upload className="h-5 w-5" />
          Upload EpRT
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="eprtDate">Tanggal EpRT *</Label>
            <Input
              id="eprtDate"
              name="eprtDate"
              type="date"
              required
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="screenshot">Screenshot Nilai EpRT *</Label>
            <Input
              id="screenshot"
              name="screenshot"
              type="file"
              accept="image/*,application/pdf"
              required
            />
            <p className="text-xs text-gray-500">Format: JPG, PNG, atau PDF. Maks 5MB.</p>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#C8102E] hover:bg-[#a50d26]"
          >
            {loading ? "Mengupload..." : "Upload EpRT"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
