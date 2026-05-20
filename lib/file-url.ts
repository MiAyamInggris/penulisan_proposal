/**
 * Convert a stored file URL to an authenticated download URL.
 *
 * All file URLs (Vercel Blob, Supabase, etc.) are routed through
 * /api/download so that:
 *   - The caller must be authenticated before receiving the file.
 *   - Private Vercel Blob stores are accessed with the server-side token.
 *   - Supabase public URLs are transparently redirected.
 */
export function fileDownloadUrl(storedUrl: string | null | undefined): string {
  if (!storedUrl) return "";
  if (storedUrl.startsWith("/local-uploads/")) return storedUrl;
  // External public links (Google Drive, OneDrive, etc.) — open directly, no proxy needed
  if (
    (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) &&
    !storedUrl.includes(".vercel-storage.com") &&
    !storedUrl.includes(".supabase.co")
  ) {
    return storedUrl;
  }
  return `/api/download?url=${encodeURIComponent(storedUrl)}`;
}
