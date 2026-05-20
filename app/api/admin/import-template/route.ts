import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const rows = [
    { nama: "Budi Santoso", email: "budi.santoso@student.example.com", nim: "20231001" },
    { nama: "Siti Rahayu", email: "siti.rahayu@student.example.com", nim: "20231002" },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 36 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Import Mahasiswa");

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-import-mahasiswa.xlsx"',
    },
  });
}
