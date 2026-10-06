import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase-server";
import { isPublicStorageUrl } from "@/lib/storage";
import { TUGGI_PARTNER_ID } from "@/lib/app-meta";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PartnerData {
  /** Resolved client UUID — required for download attribution (clipboard, /api/attribution, Play Store referrer). */
  id: string;
  slug: string | null;
  name: string | null;
  audioUrl?: string;
  description?: string;
  isTuggi: boolean;
  /** DB language used for the welcome audio/text (e.g. "pt-br", "pt-pt", "en-us"). Drives the call-audio file. */
  audioLang: string;
  /** Partner identity for the "stay connected" framing (type chip + contact links). */
  clientType?: string | null;
  website?: string | null;
  social?: string | null;
  /**
   * Partner seal rendered in the hero lockup next to the Tuggi logo (co-branding:
   * the visitor scanned a QR printed with the partner's mark and needs to see it
   * again to know the page is the right one). Null unless partner.clients.avatar_url
   * is a public object in our own Storage — see isPublicStorageUrl.
   */
  logoUrl?: string | null;
}

type ClientRow = {
  id: string;
  slug: string | null;
  name: string | null;
  company_name: string | null;
  welcome_poi_id: string | null;
  metadata: { welcome_poi_id?: string } | null;
  client_type: string | null;
  website: string | null;
  social_handle: string | null;
  avatar_url: string | null;
};

const CLIENT_COLUMNS =
  "id, slug, name, company_name, welcome_poi_id, metadata, client_type, website, social_handle, avatar_url";

/**
 * Narrows a free-text avatar_url down to what next/image is allowed to render.
 * Most partners have no logo at all, so null is the ordinary answer here, not
 * an error path — the hero renders without the seal.
 */
function toLogoUrl(avatarUrl: string | null | undefined): string | null {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return null;
  if (!isPublicStorageUrl(trimmed)) {
    // A seal that never shows up is the worst outcome for the curator who filled
    // the field, so leave a trace: next/image would answer 400 for this URL and
    // the visitor would see a broken image instead of the plain hero.
    console.warn("Ignoring partner logo outside Supabase Storage:", trimmed);
    return null;
  }
  return trimmed;
}

/**
 * A partner row can carry an empty string where a name is absent, and `??` only
 * catches null — an empty trade name would then win over a filled legal name and
 * the hero would render no name at all.
 */
function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Maps a next-intl locale to the language code used in core.attraction_descriptions. */
export function getDbLang(locale: string): string {
  switch (locale) {
    case "en": return "en-us";
    case "es": return "es-es";
    case "pt": return "pt-br";
    case "it": return "it-it";
    default: return "en-us";
  }
}

/**
 * Fetches the localized welcome audio + description for a POI, with en-us
 * fallback. `dbLang` is the resolved DB language/dialect (e.g. "pt-pt") — the
 * caller decides it (see src/lib/ptDialect.ts), decoupled from the UI locale.
 */
async function fetchLocalizedWelcome(
  supabase: SupabaseClient,
  poiId: string | null | undefined,
  dbLang: string
): Promise<{ audioUrl?: string; description?: string }> {
  if (!poiId) return {};

  let { data: description } = await supabase
    .schema("core")
    .from("attraction_descriptions")
    .select("audio_url, description")
    .eq("attraction_id", poiId)
    .eq("language", dbLang)
    .single();

  if (!description) {
    const { data: enFallback } = await supabase
      .schema("core")
      .from("attraction_descriptions")
      .select("audio_url, description")
      .eq("attraction_id", poiId)
      .eq("language", "en-us")
      .single();
    if (enFallback) description = enFallback;
  }

  return description
    ? { audioUrl: description.audio_url, description: description.description }
    : {};
}

/** Builds the partner view-model from a client row, fetching the localized welcome audio/text. */
async function buildPartnerData(
  supabase: SupabaseClient,
  client: ClientRow,
  dbLang: string
): Promise<PartnerData> {
  const isTuggi = client.id === TUGGI_PARTNER_ID;
  const welcomePoiId = client.welcome_poi_id || client.metadata?.welcome_poi_id;
  const welcome = await fetchLocalizedWelcome(supabase, welcomePoiId, dbLang);
  return {
    id: client.id,
    // The TRADE NAME first (`name`), the legal name (`company_name`) only as fallback.
    // `/d/{slug}` is the page the tourist opens from the QR printed on the table: what
    // is on the sign is the trade name ("Cozi +"), not the legal one ("Cozimais
    // Restaurante e Café"). Same order the slug itself uses since migration
    // `20260826_01_client_slug_from_trade_name` (partner.ensure_client_slug). The
    // fallback keeps bare clients working (a driver has no company_name) and keeps
    // legacy rows that only ever filled company_name showing a name at all.
    name: isTuggi ? null : (nonEmpty(client.name) ?? nonEmpty(client.company_name)),
    slug: client.slug,
    isTuggi,
    audioLang: dbLang,
    clientType: isTuggi ? null : client.client_type,
    website: isTuggi ? null : client.website,
    social: isTuggi ? null : client.social_handle,
    logoUrl: isTuggi ? null : toLogoUrl(client.avatar_url),
    ...welcome,
  };
}

async function resolvePartner(
  column: "id" | "slug",
  value: string,
  dbLang: string
): Promise<PartnerData | null> {
  try {
    // service_role, and here it is load-bearing: the only SELECT policy on
    // `partner.clients` requires an admin `cms_users` row or a matching
    // `auth.uid()`, so as `anon` this query returns zero rows **and no error**
    // — every partner landing would 404 and drop out of the sitemap with
    // nothing logged anywhere.
    const supabase = getSupabaseClient("serviceRole");
    const { data: client, error } = await supabase
      .schema("partner")
      .from("clients")
      .select(CLIENT_COLUMNS)
      .eq(column, value)
      .single();

    if (error || !client) return null;
    return await buildPartnerData(supabase, client as ClientRow, dbLang);
  } catch (err) {
    console.error(`Error fetching partner by ${column}:`, err);
    return null;
  }
}

/** An approved partner as the site publishes it: the slug of its /d/<slug> URL. */
export interface ApprovedPartner {
  slug: string;
  /** `partner.clients.updated_at`, for the sitemap's `lastModified`. Null on a row that never had one. */
  updatedAt: string | null;
}

type ApprovedPartnerRow = { slug: string | null; updated_at: string | null };

/**
 * Every partner whose `/d/<slug>` URL the site publishes.
 *
 * **One list, two consumers, and they have to agree**: `src/app/sitemap.ts`
 * submits these URLs to Google, and `/d/[slug]/opengraph-image` pre-renders a
 * share card for each of them at build time. A slug in one list and not in the
 * other is an indexed URL whose preview is generated per request — which is the
 * cost this enumeration exists to remove (#687). The filter therefore lives
 * here, once, and not at either call site.
 *
 * Three exclusions, all deliberate:
 *  - `status = 'approved'` — a partner still in review has no public page;
 *  - a null `slug` has no `/d/` URL at all;
 *  - the Tuggi row itself (`TUGGI_PARTNER_ID`) is the first-party bucket, not a
 *    partner: `/d/tuggi` is where the site's own chrome CTAs point, and it is
 *    deliberately absent from the sitemap.
 *
 * service_role, for the reason spelled out in `resolvePartner`: the only SELECT
 * policy on `partner.clients` answers zero rows **and no error** to `anon`, so
 * on the publishable key this would silently return an empty list and every
 * partner URL would quietly disappear from both consumers.
 *
 * **Build time only.** Both callers run during `next build` — never on a
 * request path — which is what keeps a table-wide read off the hot path.
 *
 * Failure is swallowed on purpose, and returning `[]` is what "the DB was
 * unreachable" looks like to both callers: a hiccup here must not fail the
 * build, it must cost a sitemap section and a batch of pre-rendered cards.
 */
export async function listApprovedPartners(): Promise<ApprovedPartner[]> {
  try {
    const supabase = getSupabaseClient("serviceRole");
    const { data, error } = await supabase
      .schema("partner")
      .from("clients")
      .select("slug, updated_at")
      .eq("status", "approved")
      .not("slug", "is", null)
      .neq("id", TUGGI_PARTNER_ID);

    if (error) {
      console.error("Error listing approved partners:", error);
      return [];
    }

    return ((data ?? []) as ApprovedPartnerRow[])
      .filter((row): row is ApprovedPartnerRow & { slug: string } => Boolean(row.slug))
      .map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
  } catch (err) {
    console.error("Error listing approved partners:", err);
    return [];
  }
}

// Wrapped in React cache() so generateMetadata and the page component share a
// single DB lookup per request (same args → one query). `dbLang` is the
// resolved welcome dialect (see src/lib/ptDialect.ts), part of the cache key.

/** Resolve a partner by client UUID (legacy /download?ID= flow). */
export const getPartnerById = cache(
  (id: string, dbLang: string): Promise<PartnerData | null> => resolvePartner("id", id, dbLang)
);

/** Resolve a partner by friendly slug (new /d/<slug> flow). */
export const getPartnerBySlug = cache(
  (slug: string, dbLang: string): Promise<PartnerData | null> => resolvePartner("slug", slug, dbLang)
);

// ────────────────────────────────────────────────────────────────────────────
// Coupon-code variant of the same /d/<slug> route. When a slug matches an
// active coupon (UPPER convention: WEBSUMMIT26), the page renders the
// coupon owner's audio + an extra "Resgatar no app" CTA. Public-safe
// view via the SECURITY DEFINER RPC drive.get_coupon_preview — no direct
// read of drive.coupons from the web layer.
// ────────────────────────────────────────────────────────────────────────────

/**
 * The two concessions a coupon can grant (BR-MONETIZACAO-047), as the redeem
 * block needs them: an `until` coupon is measured in `days`, a `minutes`
 * coupon in whole `hours` of guide balance. Exactly one of the two is set.
 */
export type CouponPreview =
  | { code: string; grantKind: "until"; days: number; hours?: undefined }
  | { code: string; grantKind: "minutes"; hours: number; days?: undefined };

export interface CouponContext {
  /** Owner of the coupon rendered as a partner — drives the existing audio/CTA UI. */
  partner: PartnerData;
  coupon: CouponPreview;
}

interface GetCouponPreviewRpcResult {
  found: boolean;
  code?: string;
  /** `drive.coupons.duration_days` — null on a `minutes` coupon. */
  days?: number | null;
  /** BR-MONETIZACAO-047. Absent on a pre-20260928120000 envelope, which only knew `until`. */
  grant_kind?: "until" | "minutes" | null;
  /** `drive.coupons.grant_minutes` — null on an `until` coupon. */
  minutes?: number | null;
  owner_client_id?: string | null;
  owner_slug?: string | null;
  owner_name?: string | null;
  owner_avatar_url?: string | null;
  owner_bio?: string | null;
  owner_poi_id?: string | null;
}

/**
 * BR-MONETIZACAO-047: reads the concession off the RPC envelope. A coupon
 * whose amount cannot be shown (no days, or under one whole hour) is not
 * rendered as a coupon at all — the URL falls through to the partner pass,
 * exactly as an unknown code does, rather than promising "0 hours".
 */
function toCouponPreview(
  code: string,
  result: GetCouponPreviewRpcResult
): CouponPreview | null {
  if (result.grant_kind === "minutes") {
    const hours = Math.floor((result.minutes ?? 0) / 60);
    return hours >= 1 ? { code, grantKind: "minutes", hours } : null;
  }
  return result.days ? { code, grantKind: "until", days: result.days } : null;
}

async function resolveCoupon(
  rawCode: string,
  dbLang: string
): Promise<CouponContext | null> {
  try {
    // `get_coupon_preview` is SECURITY DEFINER and `anon` may execute it, so
    // this one call would survive the publishable key. It stays on
    // service_role with the rest of the partner page: the reads around it
    // (`partner.clients`, above) do not.
    const supabase = getSupabaseClient("serviceRole");
    const { data, error } = await supabase
      .schema("drive")
      .rpc("get_coupon_preview", { p_code: rawCode });

    if (error) {
      console.error("Error calling get_coupon_preview:", error);
      return null;
    }

    const result = data as GetCouponPreviewRpcResult | null;
    if (!result || !result.found || !result.code) return null;
    const coupon = toCouponPreview(result.code, result);
    if (!coupon) return null;

    const welcome = await fetchLocalizedWelcome(supabase, result.owner_poi_id, dbLang);
    const ownerClientId = result.owner_client_id ?? "";
    const isTuggi = !ownerClientId || ownerClientId === TUGGI_PARTNER_ID;

    const partner: PartnerData = {
      id: ownerClientId,
      slug: result.owner_slug ?? null,
      name: isTuggi ? null : (result.owner_name ?? null),
      isTuggi,
      audioLang: dbLang,
      // Same seal as the partner flow: the RPC already returns the owner's
      // avatar, and a coupon LP renders the very same hero.
      logoUrl: isTuggi ? null : toLogoUrl(result.owner_avatar_url),
      ...welcome,
    };

    return {
      partner,
      coupon,
    };
  } catch (err) {
    console.error("Error resolving coupon:", err);
    return null;
  }
}

/** Resolve an active redeemable coupon by raw code (case-insensitive). */
export const getCouponBySlug = cache(
  (code: string, dbLang: string): Promise<CouponContext | null> =>
    resolveCoupon(code, dbLang)
);

/**
 * What the one resolver of `/d/{slug}` says about a slug — `partner.resolve_partner_slug`,
 * BR-B2B-037 item 2 (docs/contracts/places-portal-rascunho.md §9).
 *
 * - `soon`: a place whose slug was reserved at submit and is not approved yet. Its kit may
 *   already be printed (BR-B2B-050 item 1), so the QR must land somewhere that is not an error.
 * - `client`: the slug belongs to `clientSlug`; when they differ, the printed one redirects.
 * - `retired`: a rejected place. Blocked forever, never names the place.
 * - `null`: unknown slug — no row.
 * - `"unavailable"`: the RPC failed. Until migration 20261006230000 is applied the function does
 *   not exist, and the caller must keep today's behaviour instead of breaking the page.
 */
type SlugResolution =
  | { state: "soon" }
  | { state: "retired" }
  | { state: "client"; clientSlug: string };

const resolveSlug = cache(
  async (slug: string): Promise<SlugResolution | null | "unavailable"> => {
    try {
      const { data, error } = await getSupabaseClient("serviceRole")
        .schema("partner")
        .rpc("resolve_partner_slug", { p_slug: slug });
      if (error || !Array.isArray(data)) return "unavailable";
      const row = data[0] as { state?: string; client_slug?: string | null } | undefined;
      if (!row) return null;
      if (row.state === "soon") return { state: "soon" };
      if (row.state === "retired") return { state: "retired" };
      if (row.state === "client" && row.client_slug) {
        return { state: "client", clientSlug: row.client_slug };
      }
      return "unavailable";
    } catch {
      return "unavailable";
    }
  }
);

export type PartnerSlugResult =
  | { kind: "partner"; partner: PartnerData; coupon: CouponPreview | null }
  | { kind: "redirect"; slug: string }
  | { kind: "soon" }
  | { kind: "retired" };

/**
 * Resolves a /d/<slug> URL:
 *   1. Coupon code (UPPERCASE convention: WEBSUMMIT26) — its own door, BR-MONETIZACAO-015/016.
 *      Returns the owner + coupon metadata so the page renders the redeem block.
 *   2. `partner.resolve_partner_slug` (BR-B2B-037 item 2): `soon`, `retired`, or the client —
 *      redirect when the printed slug is not the client's own (item 4: it never stops resolving).
 *   3. The client by slug, as before. Also the whole partner pass while the resolver RPC is
 *      unavailable (migration not applied yet).
 * `null` means nothing matched: the page serves the plain download LP, `noindex`.
 *
 * Lives here because the page and its opengraph-image both resolve the same
 * URL and must agree on what it is.
 */
export async function resolvePartnerOrCoupon(
  slug: string,
  dbLang: string
): Promise<PartnerSlugResult | null> {
  const coupon = await getCouponBySlug(slug, dbLang);
  if (coupon) return { kind: "partner", partner: coupon.partner, coupon: coupon.coupon };

  const resolution = await resolveSlug(slug);
  if (resolution === null) return null;
  if (resolution !== "unavailable") {
    if (resolution.state === "soon") return { kind: "soon" };
    if (resolution.state === "retired") return { kind: "retired" };
    if (resolution.clientSlug !== slug) return { kind: "redirect", slug: resolution.clientSlug };
  }

  const partner = await getPartnerBySlug(slug, dbLang);
  if (partner) return { kind: "partner", partner, coupon: null };

  return null;
}
