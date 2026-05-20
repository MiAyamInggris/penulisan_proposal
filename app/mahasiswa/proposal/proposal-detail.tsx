"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { submitForDE, uploadProposalFile } from "./actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Upload } from "lucide-react";
import { fileDownloadUrl } from "@/lib/file-url";

type Proposal = {
  id: string;
  titleId: string;
  titleEn: string | null;
  topicArea: string | null;
  abstract: string | null;
  status: string;
  proposalUrl: string | null;
  supervisor1Requested: { name: string } | null;
  supervisor2Requested: { name: string } | null;
  supervisor1Assigned: { name: string } | null;
  supervisor2Assigned: { name: string } | null;
  bimbinganSessions: unknown[];
};

type EprtRecord = { status: string } | null;

const UPLOAD_ALLOWED_STATUSES = new Set([
  "PROPOSAL_UPLOADED",
  "ASSIGNED",
  "BIMBINGAN",
]);

export function ProposalDetail({ proposal, eprt }: { proposal: Proposal; eprt: EprtRecord }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bimbinganCount = proposal.bimbinganSessions.length;
  const canSubmitDE =
    proposal.status === "BIMBINGAN" &&
    bimbinganCount >= 3 &&
    eprt?.status === "VERIFIED";

  const canUploadFile = UPLOAD_ALLOWED_STATUSES.has(proposal.status);

  const handleSubmitDE = async () => {
    setLoading(true);
    setConfirmOpen(false);
    try {
      const result = await submitForDE();
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Proposal berhasil dikumpulkan untuk Desk Evaluation!");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.querySelector('[name="proposalFile"]') as HTMLInputElement)?.files?.[0];
    if (!file || file.size === 0) {
      toast.error("Pilih file PDF terlebih dahulu");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Hanya file PDF yang diperbolehkan");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB");
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData(form);
      const result = await uploadProposalFile(formData);
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("File proposal berhasil diupload!");
        router.refresh();
      }
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detail Proposal</CardTitle>
          <StatusBadge status={proposal.status} type="proposal" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Judul (Bahasa Indonesia)</p>
            <p className="text-sm font-medium text-gray-900">{proposal.titleId}</p>
          </div>
          {proposal.titleEn && (
            <div>
              <p className="text-xs text-gray-500">Judul (Bahasa Inggris)</p>
              <p className="text-sm text-gray-700">{proposal.titleEn}</p>
            </div>
          )}
          {proposal.topicArea && (
            <div>
              <p className="text-xs text-gray-500">Bidang Topik</p>
              <p className="text-sm text-gray-700">{proposal.topicArea}</p>
            </div>
          )}
          {proposal.abstract && (
            <div>
              <p className="text-xs text-gray-500">Abstrak</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {proposal.abstract}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-500">Pembimbing 1 (Usulan)</p>
              <p className="text-sm text-gray-700">{proposal.supervisor1Requested?.name ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pembimbing 2 (Usulan)</p>
              <p className="text-sm text-gray-700">{proposal.supervisor2Requested?.name ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pembimbing 1 (Ditugaskan)</p>
              <p className="text-sm font-medium text-gray-900">
                {proposal.supervisor1Assigned?.name ?? "Belum ditugaskan"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pembimbing 2 (Ditugaskan)</p>
              <p className="text-sm font-medium text-gray-900">
                {proposal.supervisor2Assigned?.name ?? "–"}
              </p>
            </div>
          </div>

          {/* Proposal file */}
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-2">File Proposal</p>
            {proposal.proposalUrl ? (
              <a
                href={fileDownloadUrl(proposal.proposalUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
              >
                <Download className="h-4 w-4" />
                Unduh Proposal PDF
              </a>
            ) : (
              <p className="text-sm text-gray-400 italic">Belum ada file diunggah</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File upload / re-upload */}
      {canUploadFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              {proposal.proposalUrl ? "Ganti File Proposal" : "Upload File Proposal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUploadFile} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="proposalFileUpload">File PDF (maks. 5 MB)</Label>
                <Input
                  id="proposalFileUpload"
                  name="proposalFile"
                  type="file"
                  accept="application/pdf"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={uploadLoading}
                className="bg-[#C8102E] hover:bg-[#a50d26]"
              >
                {uploadLoading ? "Mengupload..." : "Upload"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {proposal.status === "BIMBINGAN" && (
        <Card className={!canSubmitDE ? "border-yellow-200" : "border-green-200"}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Pengumpulan Desk Evaluation</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className={bimbinganCount >= 3 ? "text-green-600" : "text-red-500"}>
                    {bimbinganCount >= 3 ? "✓" : "✗"}
                  </span>
                  <span className="text-gray-600">Sesi bimbingan: {bimbinganCount}/3</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={eprt?.status === "VERIFIED" ? "text-green-600" : "text-red-500"}>
                    {eprt?.status === "VERIFIED" ? "✓" : "✗"}
                  </span>
                  <span className="text-gray-600">
                    EpRT: {eprt ? (eprt.status === "VERIFIED" ? "Terverifikasi" : "Menunggu Verifikasi") : "Belum diupload"}
                  </span>
                </div>
              </div>
              <Button
                disabled={!canSubmitDE || loading}
                className="bg-[#C8102E] hover:bg-[#a50d26]"
                onClick={() => setConfirmOpen(true)}
              >
                Kumpulkan ke Desk Evaluation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pengumpulan</AlertDialogTitle>
            <AlertDialogDescription>
              Setelah dikumpulkan, status proposal akan berubah ke "Dikumpul ke DE" dan tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitDE} className="bg-[#C8102E] hover:bg-[#a50d26]">
              Ya, Kumpulkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
