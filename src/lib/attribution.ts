/**
 * First touch, as the browser keeps it — BR-B2B-002.
 *
 * One module, imported by the API route that WRITES the cookie and by the
 * client hook that READS it, because the two have to agree on the name, the
 * shape and the lifetime of the same fact. It is deliberately free of React,
 * of `next/*` and of anything server-only: a "use client" module cannot be
 * imported by a route handler without the export turning into a client
 * reference, and a server-only one cannot be imported by a badge.
 *
 * The contract is `docs/contracts/atribuicao-de-parceiro.md`, sections 1, 3 and 9.
 */

/**
 * First-party, `SameSite=Lax`, 90 days, and NOT `HttpOnly`: every store CTA on
 * the site is a client component that reads this to build its link, so the
 * document has to be able to see it. Nothing secret is in it — the two UUIDs
 * are already travelling in a URL the visitor can read.
 */
export const ATTRIBUTION_COOKIE = "tuggi_attr";

/**
 * 90 days. Longer than the 30-day retention of `drive.click_fingerprints`
 * (contract §8) on purpose: after the row expires the cookie still names the
 * partner, and it is the cookie — not the row — that keeps a second QR from
 * overwriting the first while the visitor is still deciding to install.
 */
export const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** The one string that crosses the store, in both channels — contract §2. */
export const CLICK_REFERRER_PREFIX = "tuggi_click_";

/** Shape of any id that may be credited: the plain UUID, in either case. */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the cookie holds. `ts` is ISO-8601, and it is when FIRST touch happened. */
export interface StoredAttribution {
  partner_id: string;
  click_id: string;
  ts: string;
}

/**
 * The referrer/clipboard payload for a click — `tuggi_click_<uuid>`.
 *
 * Returns null for anything that is not a click id, so a caller cannot build
 * `tuggi_click_undefined` and hand the app a token it will try to resolve.
 */
export function clickToken(clickId: string | null | undefined): string | null {
  if (!clickId || !UUID_PATTERN.test(clickId)) return null;
  return `${CLICK_REFERRER_PREFIX}${clickId}`;
}

/**
 * The cookie value for a first touch — plain JSON, NOT percent-encoded here.
 *
 * `NextResponse.cookies.set` encodes the value on the way out, so encoding it
 * first produced `%257B` on the wire: the reader decoded once, got `%7B`, and
 * every first touch read as absent. The pair is `serialize` → (transport
 * encodes) → `parse` (decodes once), and it round-trips in either direction
 * because JSON of two UUIDs and a timestamp contains nothing to encode.
 */
export function serializeAttribution(value: StoredAttribution): string {
  return JSON.stringify(value);
}

/**
 * The stored first touch, or null when there is none.
 *
 * Validates instead of trusting: this value survives 90 days in a store the
 * visitor can edit, and a malformed one must read as "no first touch yet"
 * rather than as a partner. A cookie holding junk therefore does not
 * permanently block the capture — the next partner visit writes over it.
 */
export function parseAttribution(raw: string | null | undefined): StoredAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<StoredAttribution> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const { partner_id, click_id, ts } = parsed;
    if (typeof partner_id !== "string" || !UUID_PATTERN.test(partner_id)) return null;
    if (typeof click_id !== "string" || !UUID_PATTERN.test(click_id)) return null;
    return { partner_id, click_id, ts: typeof ts === "string" ? ts : "" };
  } catch {
    return null;
  }
}

/** Picks one cookie out of a `Cookie:` header or out of `document.cookie`. */
export function readCookie(jar: string | null | undefined, name: string): string | null {
  if (!jar) return null;
  for (const part of jar.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return part.slice(eq + 1).trim();
  }
  return null;
}

/** The first touch this browser is carrying, read from `document.cookie`. */
export function readStoredAttribution(): StoredAttribution | null {
  if (typeof document === "undefined") return null;
  return parseAttribution(readCookie(document.cookie, ATTRIBUTION_COOKIE));
}

// ── Normalisation, and both ends obey it — contract §3 ──────────────────────

/**
 * The primary subtag, lowercased: `pt-BR` → `pt`, so the site writes what the
 * app writes. This single mismatch is what killed the probabilistic match in
 * production — the site stored `pt-BR`, the app sent `pt`, and string equality
 * never fired.
 *
 * Returns null rather than the old literal `"Unknown"`: the column is
 * nullable, a NULL never matches anything, and a row saying "Unknown" both
 * lies and matches every other row that lies the same way.
 */
export function normalizeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const subtag = value.trim().split("-")[0]?.toLowerCase() ?? "";
  // `Unknown` was the literal this route used to store when the field was
  // missing, and rows still carry it. It is not a language: it is the sentinel
  // that made every ignorant row match every other ignorant row.
  if (subtag === "unknown") return null;
  return /^[a-z]{2,8}$/.test(subtag) ? subtag : null;
}

/**
 * An IANA zone, or NULL. `Etc/Unknown` is what `Intl` answers when the host
 * has no zone, and storing it made 33% of the rows match each other by
 * agreeing on their own ignorance.
 */
export function normalizeTimezone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "etc/unknown") return null;
  return trimmed.slice(0, 50);
}
