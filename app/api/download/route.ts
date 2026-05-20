import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Tidak terautentikasi", { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return new NextResponse("Parameter url wajib diisi", { status: 400 });
  }

  const fileUrl = decodeURIComponent(raw);

  // ── Local dev path ─────────────────────────────────────────────────────────
  if (fileUrl.startsWith("/local-uploads/")) {
    return new NextResponse(
      "File tidak tersedia di lingkungan ini (local dev path).",
      { status: 404 }
    );
  }

  // ── Supabase public bucket → redirect directly ─────────────────────────────
  if (fileUrl.includes(".supabase.co")) {
    return NextResponse.redirect(fileUrl);
  }

  // ── Vercel Blob (private) → generate download URL then proxy ───────────────
  if (fileUrl.includes(".vercel-storage.com")) {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    try {
      // getDownloadUrl converts a private blob URL to an authenticated form
      const { getDownloadUrl } = await import("@vercel/blob");
      const downloadUrl = getDownloadUrl(fileUrl);

      const upstream = await fetch(downloadUrl, {
        headers: blobToken && !blobToken.includes("XXXX")
          ? { Authorization: `Bearer ${blobToken}` }
          : {},
      });

      if (!upstream.ok) {
        return new NextResponse(`File tidak ditemukan (${upstream.status})`, {
          status: 404,
        });
      }

      const contentType =
        upstream.headers.get("content-type") ?? "application/octet-stream";

      const rawName = fileUrl.split("?")[0].split("/").pop() ?? "file";
      const filename = decodeURIComponent(rawName).replace(/^\d+-/, "");

      return new NextResponse(upstream.body, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch (err: any) {
      console.error("[/api/download] blob error:", err?.message ?? err);
      return new NextResponse("Gagal mengunduh file dari storage", { status: 502 });
    }
  }

  // ── Unknown origin ─────────────────────────────────────────────────────────
  return new NextResponse("URL file tidak dikenali", { status: 400 });
}
