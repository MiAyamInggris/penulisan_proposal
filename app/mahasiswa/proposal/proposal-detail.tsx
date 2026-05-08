"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { submitForDE } from "./actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Proposal = {
  id: string;
  titleId: string;
  titleEn: string | null;
  topicArea: string | null;
  status: string;
  proposalUrl: string | null;
  supervisor1Requested: { name: string } | null;
  supervisor2Requested: { name: string } | null;
  supervisor1Assigned: { name: string } | null;
  supervisor2Assigned: { name: string } | null;
  bimbinganSessions: unknown[];
};

type EprtRecord = { status: string } | null;

export function ProposalDetail({ proposal, eprt }: { proposal: Proposal; eprt: EprtRecord }) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bimbinganCount = proposal.bimbinganSessions.length;
  const canSubmitDE =
    proposal.status === "BIMBINGAN" &&
    bimbinganCount >= 3 &&
    eprt?.status === "VERIFIED";

  const handleSubmitDE = async () => {
    setLoading(true);
    setConfirmOpen(false);
    try {
      const result = await submitForDE();
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Proposal berhasil dikumpulkan untuk Desk Evaluation!");
      }
    } finally {
      setLoading(false);
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
        </CardContent>
      </Card>

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
