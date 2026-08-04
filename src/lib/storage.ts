/**
 * Supabase Storage is the only remote image host this site renders.
 *
 * Two places have to agree on that fact: the next/image allowlist in
 * next.config.ts and the partner view-model in src/lib/partner.ts. When they
 * drift, the image optimizer answers 400 and the visitor gets a broken image —
 * so both read the host from here, derived from SUPABASE_URL, the same env var
 * getSupabaseServer() connects with.
 *
 * NEXT_PUBLIC_SUPABASE_URL is deliberately not used: it is absent from .env and
 * .env.example, and its only reader (src/lib/supabase.ts) has no importers.
 */

/** Public Storage objects live under this path. Signed and private ones do not. */
export const STORAGE_PUBLIC_PATH = "/storage/v1/object/public/";

/** Hostname of the Supabase project, or null when SUPABASE_URL is missing or malformed. */
export function getStorageHost(): string | null {
  const raw = process.env.SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

/**
 * True when `url` points at a public object in our own Supabase Storage — the
 * exact set next.config.ts lets next/image optimize.
 *
 * Columns like core.clients.avatar_url are free text typed by an admin in the
 * CMS, so an off-allowlist URL is an expected input, not an anomaly. Callers
 * drop those and fall back to the no-image layout instead of rendering an
 * image the optimizer would refuse.
 */
export function isPublicStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const host = getStorageHost();
  if (!host) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === host &&
      parsed.pathname.startsWith(STORAGE_PUBLIC_PATH)
    );
  } catch {
    return false;
  }
}
