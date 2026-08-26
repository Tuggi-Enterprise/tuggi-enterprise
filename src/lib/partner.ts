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

export interface CouponPreview {
  code: string;
  days: number;
}

export interface CouponContext {
  /** Owner of the coupon rendered as a partner — drives the existing audio/CTA UI. */
  partner: PartnerData;
  coupon: CouponPreview;
}

interface GetCouponPreviewRpcResult {
  found: boolean;
  code?: string;
  days?: number;
  owner_client_id?: string | null;
  owner_slug?: string | null;
  owner_name?: string | null;
  owner_avatar_url?: string | null;
  owner_bio?: string | null;
  owner_poi_id?: string | null;
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
    if (!result || !result.found || !result.code || !result.days) return null;

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
      coupon: { code: result.code, days: result.days },
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
 * Resolves a /d/<slug> URL in two passes:
 *   1. Coupon code (UPPERCASE convention: WEBSUMMIT26). Returns the owner +
 *      coupon metadata so the page renders the redeem block.
 *   2. Partner slug (lowercase-with-hyphens convention: neymar-jr). Returns
 *      just the owner — existing behaviour.
 * `null` means neither matched and the caller should 404.
 *
 * Lives here because the page and its opengraph-image both resolve the same
 * URL and must agree on what it is.
 */
export async function resolvePartnerOrCoupon(
  slug: string,
  dbLang: string
): Promise<{ partner: PartnerData; coupon: CouponPreview | null } | null> {
  const coupon = await getCouponBySlug(slug, dbLang);
  if (coupon) return { partner: coupon.partner, coupon: coupon.coupon };

  const partner = await getPartnerBySlug(slug, dbLang);
  if (partner) return { partner, coupon: null };

  return null;
}
