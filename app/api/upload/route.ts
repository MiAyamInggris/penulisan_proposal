import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { NextResponse } from "next/server";

// Vercel serverless function max duration (seconds).
// NOTE: Vercel Hobby plan caps this at 10s regardless of this value.
// Files close to 4.5 MB may still timeout on Hobby — upgrade to Pro or
// switch to client-side Blob upload (upload() from @vercel/blob/client)
// if that becomes a problem.
export const maxDuration = 60;

// Slightly under Vercel's 4.5 MB serverless body limit so the function
// actually receives the request before the infrastructure rejects it.
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB hard cap

export async function POST(request: Request) {
  const isVercel = process.env.VERCEL === "1";

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session) {
      console.warn("[/api/upload] 401 – no session");
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string | null) || "uploads";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
    }

    console.info(
      `[/api/upload] user=${session.user.id} folder=${folder}` +
        ` file="${file.name}" size=${file.size} type=${file.type}` +
        ` vercel=${isVercel}`
    );

    // ── Size guard (must stay under Vercel infra body limit) ──────────────
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File terlalu besar. Maksimal ${MAX_SIZE_BYTES / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    // ── Upload via storage abstraction (Supabase → Vercel Blob → local) ────
    const path = `${folder}/${Date.now()}-${encodeURIComponent(file.name)}`;
    const url = await uploadFile(file, path);

    console.info(`[/api/upload] OK → ${url}`);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[/api/upload] Unhandled error:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengupload file. Coba lagi." },
      { status: 500 }
    );
  }
}
