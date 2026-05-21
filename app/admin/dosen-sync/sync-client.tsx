"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { executeSync, syncKKData } from "./actions";
import type { SyncPreview, KKSyncResult } from "./actions";
import { Layers, CheckCircle2 } from "lucide-react";

export function SyncClient({ preview }: { preview: SyncPreview }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [kkLoading, setKKLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [kkResult, setKKResult] = useState<KKSyncResult | null>(null);

  const { toCreate, toUpdate, toDeactivate } = preview;
  const hasChanges = toCreate.length > 0 || toUpdate.length > 0 || toDeactivate.length > 0;

  const handleSync = async () => {
    if (
      !window.confirm(
        `Sinkronisasi akan:\n` +
          `• Membuat ${toCreate.length} akun dosen baru\n` +
          `• Memperbarui ${toUpdate.length} akun\n` +
          `• Menonaktifkan ${toDeactivate.length} akun\n\n` +
          `Lanjutkan?`
      )
    )
      return;

    setLoading(true);
    const result = await executeSync();
    setLoading(false);

    if ("error" in result) {
      toast.error(`Gagal: ${result.error}`);
    } else {
      toast.success(
        `Sinkronisasi selesai: ${result.created} akun dibuat, ${result.updated} diperbarui, ${result.deactivated} dinonaktifkan`
      );
      setDone(true);
      router.refresh();
    }
  };

  const handleKKSync = async () => {
    if (
      !window.confirm(
        `Sinkronisasi KK akan:\n` +
          `• Membuat Kelompok Keahlian yang belum ada\n` +
          `• Mengisi kode dosen (KODE) dari data referensi\n` +
          `• Menetapkan kelompok keahlian untuk setiap dosen\n\n` +
          `Data lain (nama, password, penugasan, nilai) TIDAK akan diubah.\n\nLanjutkan?`
      )
    )
      return;

    setKKLoading(true);
    const result = await syncKKData();
    setKKLoading(false);
    setKKResult(result);

    if ("error" in result) {
      toast.error(`Gagal sinkronisasi KK: ${result.error}`);
    } else {
      toast.success(
        `KK sync selesai: ${result.kkCreated} KK baru, ${result.dosenUpdated} dosen diperbarui`
      );
      router.refresh();
    }
  };

  if (done) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-green-600 font-medium">Sinkronisasi akun dosen berhasil dilakukan.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.refresh()}>
              Periksa Kembali
            </Button>
          </CardContent>
        </Card>
        <KKSyncCard
          loading={kkLoading}
          result={kkResult}
          onSync={handleKKSync}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                +{toCreate.length} Dibuat
              </Badge>
              <span className="text-sm text-gray-500">akun baru</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                ~{toUpdate.length} Diperbarui
              </Badge>
              <span className="text-sm text-gray-500">akun yang berubah</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                -{toDeactivate.length} Dinonaktifkan
              </Badge>
              <span className="text-sm text-gray-500">tidak ada di data referensi</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts to create */}
      {toCreate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-700">
              Akun Baru ({toCreate.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {toCreate.map((d) => (
                <div key={d.email} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-gray-500 text-xs">{d.email}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Password awal = NIP (dapat diganti di Pengaturan Akun)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accounts to update */}
      {toUpdate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-blue-700">
              Akun Diperbarui ({toUpdate.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {toUpdate.map(({ current, changes }) => (
                <div key={current.id} className="text-sm py-1 border-b last:border-0">
                  <p className="font-medium">{current.name}</p>
                  <ul className="text-xs text-gray-500 list-disc list-inside">
                    {changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts to deactivate */}
      {toDeactivate.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">
              Akun Dinonaktifkan ({toDeactivate.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {toDeactivate.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <span className="font-medium">{d.name}</span>
                    {d.affectedProposals > 0 && (
                      <span className="ml-2 text-xs text-red-600">
                        ({d.affectedProposals} proposal terdampak)
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">{d.email}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-400 mt-2">
              Penugasan dosen ini akan dihapus. Koordinator kelas perlu menugaskan ulang Dosen Pembimbing dan Desk Evaluator.
            </p>
          </CardContent>
        </Card>
      )}

      {!hasChanges && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Data dosen sudah sinkron dengan data referensi. Tidak ada perubahan.</p>
          </CardContent>
        </Card>
      )}

      {hasChanges && (
        <Button
          onClick={handleSync}
          disabled={loading}
          className="bg-[#C8102E] hover:bg-[#a50d26]"
        >
          {loading ? "Menyinkronkan..." : "Jalankan Sinkronisasi Akun"}
        </Button>
      )}

      {/* KK Sync section — always shown independently */}
      <KKSyncCard loading={kkLoading} result={kkResult} onSync={handleKKSync} />
    </div>
  );
}

function KKSyncCard({
  loading,
  result,
  onSync,
}: {
  loading: boolean;
  result: KKSyncResult | null;
  onSync: () => void;
}) {
  return (
    <Card className="border-indigo-200">
      <CardHeader>
        <CardTitle className="text-base text-indigo-700 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Sinkronisasi Kelompok Keahlian & Kode Dosen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">
          Buat Kelompok Keahlian dari data referensi dan tetapkan setiap dosen ke KK-nya.
          Operasi ini aman — hanya mengisi <code className="bg-gray-100 px-1 rounded text-xs">kodeDosen</code> dan{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">kelompokKeahlianId</code>. Penugasan pembimbing,
          nilai, dan data historis tidak diubah.
        </p>

        {result && (
          <div className="rounded-md border bg-gray-50 p-3 space-y-1 text-sm">
            {"error" in result ? (
              <p className="text-red-600">Error: {result.error}</p>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Selesai</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 ml-6">
                  <span>KK baru dibuat:</span><span className="font-semibold">{result.kkCreated}</span>
                  <span>Dosen diperbarui:</span><span className="font-semibold">{result.dosenUpdated}</span>
                  <span>Dosen tidak ditemukan:</span><span className="font-semibold">{result.dosenSkipped}</span>
                  <span>Gagal:</span><span className="font-semibold">{result.dosenFailed}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={onSync}
          disabled={loading}
          variant="outline"
          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
        >
          <Layers className="h-4 w-4 mr-2" />
          {loading ? "Menyinkronkan KK..." : "Jalankan Sinkronisasi KK"}
        </Button>
      </CardContent>
    </Card>
  );
}
