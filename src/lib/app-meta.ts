import { CONTENT_LANGUAGES } from "./product-facts";
import { clickToken, UUID_PATTERN } from "./attribution";

/**
 * Single source of truth for app-level metadata.
 * Reused by JSON-LD (structured data), /llms.txt, and (optionally) the
 * download CTAs that currently hardcode the store URLs.
 */

export const APP_NAME = "TUGGI";
export const SITE_URL = "https://www.tuggi.app";
/**
 * The one mailbox the company actually reads (confirmed by the operator on
 * 2026-08-14). `legal@`, `press@`, `accessibility@` and the English `support@`
 * were all published without ever existing — see #325. Any other `@tuggi.app`
 * address, here or in `src/messages/*.json`, fails
 * `tests/e2e/contact-address.spec.ts` (BR-USUARIO-028).
 */
export const SUPPORT_EMAIL = "suporte@tuggi.app";

export const APP_STORE_URL = "https://apps.apple.com/app/tuggi-drive/id6744379818";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.tuggidrive.app";

// ── Download attribution ────────────────────────────────────────────────────
//
// Everything below decides how a download is credited to a partner. It lives in
// this module, and not in lib/partner.ts, because that module reaches for the
// server-only Supabase client while every consumer here is a client component
// or an API route.

/**
 * Internal "Tuggi" client — a real row in partner.clients, but not a partner:
 * it refers nobody and earns no commission, so its installs stay unattributed.
 * lib/partner.ts reads it from here to render that client as the plain
 * experience (PartnerData.isTuggi).
 */
export const TUGGI_PARTNER_ID = "8be94d35-282d-46bf-bc12-6fcd2f83a432";

/**
 * A partner id reaches us as untrusted text — a resolved /d/<slug>, a
 * `/download?ID=` query string, or a POST body — so it is matched before it is
 * used. Same UUID shape the app's InstallReferrerService parses out of the Play
 * referrer: anything else can never match an install, whatever we store.
 */
export const PARTNER_ID_PATTERN = UUID_PATTERN;

/** True when an install by this visitor may be credited to `id`. */
export function isAttributablePartnerId(
  id: string | null | undefined
): id is string {
  if (!id || !PARTNER_ID_PATTERN.test(id)) return false;
  return id.toLowerCase() !== TUGGI_PARTNER_ID;
}

/**
 * The Play Store URL for a download, carrying the install referrer whenever
 * this visitor has a captured click — `referrer=tuggi_click_<uuid>`, the token
 * of contract §2. Android hands it to the app through InstallReferrerClient on
 * first launch, and it is the one attribution channel that survives the
 * network changing between the QR scan and the install, so a link that drops it
 * is a lost commission, silently.
 *
 * IT TAKES THE CLICK ID AND NOT THE PARTNER ID, since #4xx. The click id is the
 * primary key of the row this visit wrote, so the app's match becomes a lookup
 * instead of a guess, the row can be marked as consumed (which is what kills
 * reuse behind a NAT), the attribution keeps its provenance, and a partner's
 * UUID stops being printed on public material. The app still parses the legacy
 * `partner_id_<uuid>` for the pieces already in the field — it is the site that
 * stops emitting it.
 *
 * Single owner on purpose. This rule used to be written inline inside the
 * partner page's floating CTA; the campaign band's Play badge linked to the
 * bare PLAY_STORE_URL, and every install started from that badge landed
 * unattributed. Every store CTA of the site calls this now — `useAttributionClickId`
 * hands them the id — and so does anything added later.
 */
export function buildPlayStoreUrl(clickId?: string | null): string {
  const token = clickToken(clickId);
  if (!token) return PLAY_STORE_URL;
  // PLAY_STORE_URL already carries `?id=`, hence the `&`.
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(token)}`;
}

/** Public social profiles for schema.org `sameAs`. */
export const SOCIAL_PROFILES: string[] = [
  "https://www.linkedin.com/company/tuggi/",
  "https://www.instagram.com/tuggi_app",
  "https://www.tiktok.com/@tuggi_app",
  "https://www.facebook.com/people/Tuggi-Personal-tour-guide/61580839157589/",
];

/**
 * Key product features (English) for SoftwareApplication.featureList.
 *
 * The language count is interpolated from lib/product-facts rather than
 * typed: this list is one of the four places the same figure used to be
 * written by hand, and the structured data a crawler reads has to agree with
 * the sentence a visitor reads (BR-IDIOMA-001, DS-COPY-005).
 */
export const APP_FEATURES = [
  "Self-guided audio stories that trigger automatically by GPS location",
  "Screen-off playback while you drive, walk, or cycle",
  "Works offline — download routes in advance, no roaming",
  `Audio in ${CONTENT_LANGUAGES} languages with synchronized closed captions`,
  // BR-MONETIZACAO-048 and 061: three Consumables, named by hours, one-time
  // purchase. BR-MONETIZACAO-050: the balance has no validity, which is why the
  // sentence says so instead of naming a window.
  //
  // "do not expire" and not the `design`'s "never expire" (#312): this string
  // reaches SoftwareApplication.featureList, which the layout serves on *every*
  // page, and partner-claims.spec.ts bans an unbacked absolute there with no
  // waiver path for prose. Same fact, same strength, one word apart.
  "Free to start; optional Tuggi Passes of 10, 25 or 45 hours of use that do not expire",
];
