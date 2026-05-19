"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { FileUpload } from "@/components/shared/FileUpload";
import { toast } from "sonner";
import { uploadRevision } from "@/lib/actions/proposal";
import { CheckCircle2 } from "lucide-react";

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
  const router = useRouter();

  // Track URLs in local state — kept separate from the server-supplied
  // initial values so that a revalidatePath-triggered re-render of the
  // parent server component does NOT reset a file the user just uploaded.
  const [revisionUrl, setRevisionUrl] = useState<string>(
    proposal.revisionUrl ?? ""
  );
  const [presentationUrl, setPresentationUrl] = useState<string>(
    proposal.presentationUrl ?? ""
  );

  // True when the file was uploaded in this browser session (not just
  // carried over from DB).  Used for per-file success indicators.
  const [revisionFresh, setRevisionFresh] = useState(false);
  const [presentationFresh, setPresentationFresh] = useState(false);

  const [loading, setLoading] = useState(false);

  const canUpload = ["DE_COMPLETED", "REVISION_UPLOADED"].includes(
    proposal.status
  );

  const handleRevisionUpload = (url: string) => {
    console.info("[RevisiUpload] revisionUrl received:", url ? url.slice(0, 60) : "EMPTY");
    if (!url) {
      toast.error("File revisi tidak berhasil diunggah. Coba lagi.");
      return;
    }
    setRevisionUrl(url);
    setRevisionFresh(true);
  };

  const handlePresentationUpload = (url: string) => {
    console.info("[RevisiUpload] presentationUrl received:", url ? url.slice(0, 60) : "EMPTY");
    if (!url) {
      toast.error("File presentasi tidak berhasil diunggah. Coba lagi.");
      return;
    }
    setPresentationUrl(url);
    setPresentationFresh(true);
  };

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
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Revisi berhasil diunggah!");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan revisi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const de = proposal.deskEvaluation;
  const finalScore = de
    ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode
    : null;

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
            {/* Revision PDF */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  File Proposal (PDF) *
                </p>
                {revisionUrl && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {revisionFresh ? "Terunggah" : "Sudah ada"}
                  </span>
                )}
              </div>
              <FileUpload
                folder="revision"
                accept=".pdf"
                label="Upload PDF Revisi"
                onUpload={handleRevisionUpload}
              />
              <p className="text-xs text-gray-400">Format: PDF. Maks 4MB.</p>
            </div>

            {/* Presentation file */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  File Presentasi (PPT/PDF) *
                </p>
                {presentationUrl && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {presentationFresh ? "Terunggah" : "Sudah ada"}
                  </span>
                )}
              </div>
              <FileUpload
                folder="presentation"
                accept=".ppt,.pptx,.pdf"
                label="Upload File Presentasi"
                onUpload={handlePresentationUpload}
              />
              <p className="text-xs text-gray-400">
                Format: PPT, PPTX, atau PDF. Maks 4MB.
              </p>
            </div>

            {/* Checklist of what's still needed */}
            {(!revisionUrl || !presentationUrl) && (
              <div className="text-xs text-amber-600 bg-amber-50 rounded p-2 space-y-0.5">
                {!revisionUrl && <p>• File proposal (PDF) belum diunggah</p>}
                {!presentationUrl && (
                  <p>• File presentasi belum diunggah</p>
                )}
              </div>
            )}

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
