"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { verifyEprt, rejectEprt } from "./actions";
import { CheckCircle, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { fileDownloadUrl } from "@/lib/file-url";

type EprtItem = {
  id: string;
  eprtDate: Date;
  screenshotUrl: string;
  createdAt: Date;
  verifiedAt: Date | null;
  status: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string; name: string };
  };
};

function StudentInfo({ eprt }: { eprt: EprtItem }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-gray-900">
          {eprt.enrollment.student.name}
        </span>
        <span className="text-xs text-gray-500">
          {eprt.enrollment.student.identifier}
        </span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
          {eprt.enrollment.class.code}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Tanggal EpRT:{" "}
        {format(new Date(eprt.eprtDate), "dd MMM yyyy", { locale: idLocale })}
      </p>
      <p className="text-xs text-gray-400">
        Diupload:{" "}
        {format(new Date(eprt.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
      </p>
      <a
        href={fileDownloadUrl(eprt.screenshotUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
      >
        <ExternalLink className="h-3 w-3" />
        Lihat / Unduh File EpRT
      </a>
    </div>
  );
}

export function EprtVerifyList({
  pending,
  verified,
}: {
  pending: EprtItem[];
  verified: EprtItem[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

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
      else toast.success("EpRT berhasil ditolak dan dihapus");
    } finally {
      setLoading(null);
      setRejectId(null);
    }
  };

  return (
    <>
      {/* Pending section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Menunggu Verifikasi
          </h2>
          {pending.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
              {pending.length}
            </Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400 opacity-70" />
              <p className="text-sm text-gray-400">Tidak ada EpRT yang perlu diverifikasi</p>
            </CardContent>
          </Card>
        ) : (
          pending.map((eprt) => (
            <Card key={eprt.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <StudentInfo eprt={eprt} />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleVerify(eprt.id)}
                      disabled={loading === eprt.id}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      {loading === eprt.id ? "..." : "Verifikasi"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
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
          ))
        )}
      </div>

      {/* Verified section */}
      {verified.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">
              Sudah Diverifikasi
            </h2>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {verified.length}
            </Badge>
          </div>
          {verified.map((eprt) => (
            <Card key={eprt.id} className="border-green-100">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <StudentInfo eprt={eprt} />
                  <div className="flex items-center gap-1.5 text-green-600 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Terverifikasi
                      {eprt.verifiedAt && (
                        <span className="font-normal text-gray-400 ml-1">
                          {format(new Date(eprt.verifiedAt), "dd/MM/yy")}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!rejectId}
        onOpenChange={(v) => { if (!v) setRejectId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak EpRT?</AlertDialogTitle>
            <AlertDialogDescription>
              EpRT mahasiswa ini akan dihapus dan mahasiswa perlu mengupload
              ulang dokumen yang benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
