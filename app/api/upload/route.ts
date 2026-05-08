import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "uploads";

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({
      url: `/local-uploads/${folder}/${Date.now()}-${file.name}`,
    });
  }

  const { put } = await import("@vercel/blob");
  const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });
  return NextResponse.json({ url: blob.url });
}
