const UPLOAD_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Upload timeout setelah ${ms / 1000} detik`)),
        ms
      )
    ),
  ]);
}

/**
 * Upload a file to the configured storage backend.
 *
 * Priority:
 *   1. Supabase Storage  (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *   2. Vercel Blob       (BLOB_READ_WRITE_TOKEN, non-placeholder)
 *   3. Local dev path    (fallback — never resolves a real file in prod)
 *
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseBucket = process.env.SUPABASE_BUCKET ?? "uploads";
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  // ── 1. Supabase Storage ────────────────────────────────────────────────────
  if (supabaseUrl && supabaseKey) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await withTimeout(
      supabase.storage.from(supabaseBucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      }),
      UPLOAD_TIMEOUT_MS
    );

    if (error) throw new Error(`Upload gagal: ${error.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from(supabaseBucket).getPublicUrl(data.path);

    return publicUrl;
  }

  // ── 2. Vercel Blob ─────────────────────────────────────────────────────────
  // Uploads WITHOUT access:"public" so private stores are supported.
  // The returned URL must be fetched via /api/download (with Authorization).
  if (blobToken && !blobToken.includes("XXXX")) {
    const { put } = await import("@vercel/blob");
    const blob = await withTimeout(
      put(path, file, { access: "private" }),
      UPLOAD_TIMEOUT_MS
    );
    return blob.url;
  }

  // ── 3. Local dev fallback ──────────────────────────────────────────────────
  return `/local-uploads/${path}`;
}
