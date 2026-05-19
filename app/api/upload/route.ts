import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Vercel serverless function max duration (seconds)
export const maxDuration = 30;

const BLOB_TIMEOUT_MS = 25_000;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // No token or clearly a placeholder → local dev fallback
    if (!token || token.includes("XXXX")) {
      return NextResponse.json({
        url: `/local-uploads/${folder}/${Date.now()}-${encodeURIComponent(file.name)}`,
      });
    }

    const path = `${folder}/${Date.now()}-${encodeURIComponent(file.name)}`;
    const { put } = await import("@vercel/blob");

    const blob = await Promise.race([
      put(path, file, { access: "public" }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Blob upload timeout setelah 25 detik")),
          BLOB_TIMEOUT_MS
        )
      ),
    ]);

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[/api/upload]", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengupload file. Coba lagi." },
      { status: 500 }
    );
  }
}
