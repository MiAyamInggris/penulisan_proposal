import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "DOSEN" || !session.user.isKaprodi) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const dataRows = [
    {
      NIM: "6701220001",
      "Nama Mahasiswa": "Budi Santoso",
      "Judul Proposal": "Pengembangan Sistem Rekomendasi Berbasis AI",
      "Pembimbing 1 (Email/NIP/Kode)": "pembimbing1@telkomuniversity.ac.id",
      "Pembimbing 2 (Email/NIP/Kode)": "pembimbing2@telkomuniversity.ac.id",
      "Desk Evaluator (Email/NIP/Kode)": "deskeval@telkomuniversity.ac.id",
      "Nilai Bimbingan Pembimbing 1": 82.5,
      "Nilai Bimbingan Pembimbing 2": 80.0,
      "Nilai Literature Review Pembimbing 1": 78.0,
      "Nilai Literature Review Pembimbing 2": 76.0,
      "Nilai Presentasi Pembimbing 1": 80.0,
      "Nilai Presentasi Pembimbing 2": 83.0,
      "Nilai Desk Evaluation": 75.0,
    },
    {
      NIM: "6701220002",
      "Nama Mahasiswa": "Siti Rahayu",
      "Judul Proposal": "Analisis Kinerja Jaringan Sensor Nirkabel",
      "Pembimbing 1 (Email/NIP/Kode)": "pembimbing1@telkomuniversity.ac.id",
      "Pembimbing 2 (Email/NIP/Kode)": "",
      "Desk Evaluator (Email/NIP/Kode)": "deskeval@telkomuniversity.ac.id",
      "Nilai Bimbingan Pembimbing 1": 88.0,
      "Nilai Bimbingan Pembimbing 2": "",
      "Nilai Literature Review Pembimbing 1": 85.0,
      "Nilai Literature Review Pembimbing 2": "",
      "Nilai Presentasi Pembimbing 1": 87.0,
      "Nilai Presentasi Pembimbing 2": "",
      "Nilai Desk Evaluation": 80.0,
    },
  ];

  const infoRows = [
    { Keterangan: "=== PETUNJUK PENGISIAN TEMPLATE ===" },
    { Keterangan: "" },
    { Keterangan: "KOLOM WAJIB:" },
    { Keterangan: "  NIM — Nomor Induk Mahasiswa (contoh: 6701220001)" },
    { Keterangan: "  Nama Mahasiswa — Nama lengkap mahasiswa" },
    { Keterangan: "" },
    { Keterangan: "KOLOM OPSIONAL:" },
    { Keterangan: "  Judul Proposal — Judul proposal (default: 'Data Historis' jika kosong)" },
    { Keterangan: "  Pembimbing 1/2 — Isi dengan email ATAU NIP ATAU kode dosen (misal: AAP)" },
    { Keterangan: "  Desk Evaluator — Isi dengan email ATAU NIP ATAU kode dosen" },
    { Keterangan: "" },
    { Keterangan: "KOLOM NILAI (masing-masing 0–100):" },
    { Keterangan: "  Nilai Bimbingan Pembimbing 1 — Nilai bimbingan dari Pembimbing 1" },
    { Keterangan: "  Nilai Bimbingan Pembimbing 2 — Nilai bimbingan dari Pembimbing 2 (kosongkan jika hanya 1 pembimbing)" },
    { Keterangan: "  Nilai Literature Review Pembimbing 1 — Nilai LR dari Pembimbing 1" },
    { Keterangan: "  Nilai Literature Review Pembimbing 2 — Nilai LR dari Pembimbing 2 (kosongkan jika hanya 1 pembimbing)" },
    { Keterangan: "  Nilai Presentasi Pembimbing 1 — Nilai presentasi dari Pembimbing 1" },
    { Keterangan: "  Nilai Presentasi Pembimbing 2 — Nilai presentasi dari Pembimbing 2 (kosongkan jika hanya 1 pembimbing)" },
    { Keterangan: "  Nilai Desk Evaluation — Nilai dari Desk Evaluator (satu kolom, bukan per-pembimbing)" },
    { Keterangan: "" },
    { Keterangan: "ATURAN PERHITUNGAN:" },
    { Keterangan: "  - 1 pembimbing: nilai komponen = nilai Pembimbing 1" },
    { Keterangan: "  - 2 pembimbing: nilai komponen = rata-rata Pembimbing 1 dan Pembimbing 2" },
    { Keterangan: "  - Nilai akhir dihitung otomatis dari bobot program studi" },
    { Keterangan: "" },
    { Keterangan: "CATATAN:" },
    { Keterangan: "  - Akun mahasiswa dibuat otomatis jika belum ada (password = NIM)" },
    { Keterangan: "  - Baris yang sudah ada di kelas ini akan dilewati (tidak duplikat)" },
    { Keterangan: "  - Dosen yang tidak ditemukan akan menghasilkan peringatan tetapi tidak gagal" },
    { Keterangan: "  - Jangan ubah nama kolom pada sheet 'Template'" },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData["!cols"] = [
    { wch: 14 }, { wch: 32 }, { wch: 45 },
    { wch: 35 }, { wch: 35 }, { wch: 35 },
    { wch: 30 }, { wch: 30 },
    { wch: 32 }, { wch: 32 },
    { wch: 30 }, { wch: 30 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, "Template");

  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-historis.xlsx"',
    },
  });
}
