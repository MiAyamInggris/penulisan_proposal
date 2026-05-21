import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const dataRows = [
    { NIM: "6701220001", "Nama Mahasiswa": "Budi Santoso", "Program Studi": "RPL" },
    { NIM: "6701220002", "Nama Mahasiswa": "Siti Rahayu", "Program Studi": "IF" },
    { NIM: "6701220003", "Nama Mahasiswa": "Andi Wijaya", "Program Studi": "DS" },
  ];

  const infoRows = [
    { Keterangan: "Kolom yang wajib diisi: NIM, Nama Mahasiswa, Program Studi" },
    { Keterangan: "Email mahasiswa akan di-generate otomatis: NIM@student.telkomuniversity.ac.id" },
    { Keterangan: "Password default = NIM (dapat diubah mahasiswa setelah login)" },
    { Keterangan: "Program Studi yang valid: RPL, IF, DS, SI" },
    { Keterangan: "Jika akun mahasiswa sudah ada (NIM sama), akun lama akan dipakai" },
    { Keterangan: "Jangan ubah nama kolom pada sheet 'Template'" },
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.json_to_sheet(dataRows);
  wsData["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsData, "Template");

  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-enrollmen-massal.xlsx"',
    },
  });
}
