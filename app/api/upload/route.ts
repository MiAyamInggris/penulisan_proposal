import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
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
  const token = process.env.BLOB_READ_WRITE_TOKEN;

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
        ` vercel=${isVercel} hasToken=${!!token}`
    );

    // ── Size guard (must stay under Vercel infra body limit) ──────────────
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File terlalu besar. Maksimal ${MAX_SIZE_BYTES / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    // ── Local dev fallback (no real token) ─────────────────────────────────
    if (!token || token.startsWith("vercel_blob_XXXX")) {
      if (isVercel) {
        // Misconfigured production deployment — fail loudly instead of storing
        // a useless local URL in the database.
        console.error(
          "[/api/upload] BLOB_READ_WRITE_TOKEN is missing on Vercel." +
            " Go to Vercel Dashboard → Storage → connect a Blob store and" +
            " add BLOB_READ_WRITE_TOKEN to the project's environment variables."
        );
        return NextResponse.json(
          {
            error:
              "Konfigurasi penyimpanan file belum diatur di server. " +
              "Hubungi administrator.",
          },
          { status: 503 }
        );
      }

      // Local dev: return a deterministic fake URL so the UI flow can be tested.
      return NextResponse.json({
        url: `/local-uploads/${folder}/${Date.now()}-${encodeURIComponent(file.name)}`,
      });
    }

    // ── Vercel Blob upload ─────────────────────────────────────────────────
    const path = `${folder}/${Date.now()}-${encodeURIComponent(file.name)}`;

    let blob;
    try {
      blob = await put(path, file, { access: "public", token });
    } catch (blobErr: any) {
      console.error(
        `[/api/upload] Vercel Blob put() failed:`,
        blobErr?.message ?? blobErr
      );
      return NextResponse.json(
        {
          error:
            blobErr?.message?.includes("token")
              ? "Token penyimpanan file tidak valid. Periksa konfigurasi BLOB_READ_WRITE_TOKEN."
              : `Gagal menyimpan file: ${blobErr?.message ?? "unknown error"}`,
        },
        { status: 502 }
      );
    }

    console.info(`[/api/upload] OK → ${blob.url}`);
    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[/api/upload] Unhandled error:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengupload file. Coba lagi." },
      { status: 500 }
    );
  }
}
