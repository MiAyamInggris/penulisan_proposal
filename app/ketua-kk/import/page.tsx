import { HistoricalQuotaImportClient } from "@/components/historical-quota-import-client";

export default async function KetuaKKImportPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Kuota Historis TA2</h1>
        <p className="text-sm text-gray-500 mt-1">
          Daftarkan mahasiswa Tugas Akhir 2 yang sudah ada sebelum sistem ini
          digunakan, agar beban bimbingan dosen dihitung dengan akurat.
        </p>
      </div>
      <HistoricalQuotaImportClient />
    </div>
  );
}
