"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { verifyEprt, rejectEprt } from "./actions";
import { CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type EprtItem = {
  id: string;
  eprtDate: Date;
  screenshotUrl: string;
  createdAt: Date;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string; name: string };
  };
};

export function EprtVerifyList({ eprts }: { eprts: EprtItem[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  if (eprts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Tidak ada EpRT yang perlu diverifikasi</p>
      </div>
    );
  }

  const handleVerify = async (id: string) => {
    setLoading(id);
    try {
      const result = await verifyEprt(id);
      if ("error" in result) toast.error(String(result.error));
      else toast.success("EpRT berhasil diverifikasi");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setLoading(rejectId);
    try {
      const result = await rejectEprt(rejectId);
      if ("error" in result) toast.error(String(result.error));
      else toast.success("EpRT berhasil ditolak");
    } finally {
      setLoading(null);
      setRejectId(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {eprts.map((eprt) => (
          <Card key={eprt.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {eprt.enrollment.student.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {eprt.enrollment.student.identifier}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Kelas: {eprt.enrollment.class.code} – {eprt.enrollment.class.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tanggal EpRT: {format(new Date(eprt.eprtDate), "dd MMM yyyy", { locale: idLocale })}
                  </p>
                  <p className="text-xs text-gray-400">
                    Diupload: {format(new Date(eprt.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                  </p>
                  <a
                    href={eprt.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Lihat Screenshot EpRT ↗
                  </a>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleVerify(eprt.id)}
                    disabled={loading === eprt.id}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Verifikasi
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={loading === eprt.id}
                    onClick={() => setRejectId(eprt.id)}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Tolak
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!rejectId} onOpenChange={(v) => { if (!v) setRejectId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak EpRT?</AlertDialogTitle>
            <AlertDialogDescription>
              EpRT mahasiswa ini akan dihapus dan mahasiswa perlu mengupload ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-red-600">
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
