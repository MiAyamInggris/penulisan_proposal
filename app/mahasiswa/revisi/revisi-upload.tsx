"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { FileUpload } from "@/components/shared/FileUpload";
import { toast } from "sonner";
import { uploadRevision } from "@/lib/actions/proposal";

type DeskEval = {
  latarBelakang: number;
  formulasiMasalah: number;
  teoriPendukung: number;
  ideMetode: number;
  catatanReviewer: string | null;
  isLate: boolean;
  evaluator: { name: string };
};

type Proposal = {
  id: string;
  status: string;
  revisionUrl: string | null;
  presentationUrl: string | null;
  deskEvaluation: DeskEval | null;
};

export function RevisiUpload({ proposal }: { proposal: Proposal }) {
  const [revisionUrl, setRevisionUrl] = useState(proposal.revisionUrl ?? "");
  const [presentationUrl, setPresentationUrl] = useState(
    proposal.presentationUrl ?? ""
  );
  const [loading, setLoading] = useState(false);

  const canUpload = ["DE_COMPLETED", "REVISION_UPLOADED"].includes(
    proposal.status
  );

  const handleSubmit = async () => {
    if (!revisionUrl || !presentationUrl) {
      toast.error("Unggah kedua file terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const result = await uploadRevision(
        proposal.id,
        revisionUrl,
        presentationUrl
      );
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Revisi berhasil diunggah!");
    } finally {
      setLoading(false);
    }
  };

  const de = proposal.deskEvaluation;
  const rawTotal = de
    ? de.latarBelakang +
      de.formulasiMasalah +
      de.teoriPendukung +
      de.ideMetode
    : null;
  const finalScore =
    de?.isLate && rawTotal !== null ? Math.min(rawTotal, 51) : rawTotal;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StatusBadge status={proposal.status} type="proposal" />
      </div>

      {de ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil Desk Evaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Latar Belakang</p>
                <p className="font-semibold">{de.latarBelakang}</p>
              </div>
              <div>
                <p className="text-gray-500">Formulasi Masalah</p>
                <p className="font-semibold">{de.formulasiMasalah}</p>
              </div>
              <div>
                <p className="text-gray-500">Teori Pendukung</p>
                <p className="font-semibold">{de.teoriPendukung}</p>
              </div>
              <div>
                <p className="text-gray-500">Ide & Metode</p>
                <p className="font-semibold">{de.ideMetode}</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-gray-500">Nilai DE</p>
              <p className="text-2xl font-bold text-gray-900">
                {finalScore?.toFixed(1)}
                {de.isLate && (
                  <span className="text-xs text-orange-500 ml-2">
                    (dikap 51 – terlambat)
                  </span>
                )}
              </p>
            </div>
            {de.catatanReviewer && (
              <div>
                <p className="text-sm text-gray-500">
                  Catatan Reviewer ({de.evaluator.name})
                </p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded p-3 mt-1">
                  {de.catatanReviewer}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500 text-sm">
              Desk Evaluation belum selesai.
            </p>
          </CardContent>
        </Card>
      )}

      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Revisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                File Proposal (PDF) *
              </p>
              {proposal.revisionUrl && (
                <p className="text-xs text-green-600">
                  Sudah diunggah sebelumnya
                </p>
              )}
              <FileUpload
                folder="revision"
                accept=".pdf"
                label="Upload PDF Revisi"
                onUpload={(url) => setRevisionUrl(url)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                File Presentasi (PPT/PDF) *
              </p>
              {proposal.presentationUrl && (
                <p className="text-xs text-green-600">
                  Sudah diunggah sebelumnya
                </p>
              )}
              <FileUpload
                folder="presentation"
                accept=".ppt,.pptx,.pdf"
                label="Upload File Presentasi"
                onUpload={(url) => setPresentationUrl(url)}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !revisionUrl || !presentationUrl}
              className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
            >
              {loading ? "Menyimpan..." : "Simpan Revisi"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
