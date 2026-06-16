import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Internal "Tuggi" client — not a real partner; rendered as the default experience. */
export const TUGGI_PARTNER_ID = "8be94d35-282d-46bf-bc12-6fcd2f83a432";

export interface PartnerData {
  /** Resolved client UUID — required for download attribution (clipboard, /api/attribution, Play Store referrer). */
  id: string;
  slug: string | null;
  name: string | null;
  audioUrl?: string;
  description?: string;
  isTuggi: boolean;
}

type ClientRow = {
  id: string;
  slug: string | null;
  company_name: string | null;
  welcome_poi_id: string | null;
  metadata: { welcome_poi_id?: string } | null;
};

const CLIENT_COLUMNS = "id, slug, company_name, welcome_poi_id, metadata";

/** Maps a next-intl locale to the language code used in core.attraction_descriptions. */
export function getDbLang(locale: string): string {
  switch (locale) {
    case "en": return "en-us";
    case "es": return "es-es";
    case "pt-br": return "pt-br";
    case "pt-pt": return "pt-pt";
    case "it": return "it-it";
    default: return "en-us";
  }
}

/** Fetches the localized welcome audio + description for a POI, with en-us fallback. */
async function fetchLocalizedWelcome(
  supabase: SupabaseClient,
  poiId: string | null | undefined,
  locale: string
): Promise<{ audioUrl?: string; description?: string }> {
  if (!poiId) return {};

  let { data: description } = await supabase
    .schema("core")
    .from("attraction_descriptions")
    .select("audio_url, description")
    .eq("attraction_id", poiId)
    .eq("language", getDbLang(locale))
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
  locale: string
): Promise<PartnerData> {
  const isTuggi = client.id === TUGGI_PARTNER_ID;
  const welcomePoiId = client.welcome_poi_id || client.metadata?.welcome_poi_id;
  const welcome = await fetchLocalizedWelcome(supabase, welcomePoiId, locale);
  return {
    id: client.id,
    slug: client.slug,
    name: isTuggi ? null : client.company_name,
    isTuggi,
    ...welcome,
  };
}

async function resolvePartner(
  column: "id" | "slug",
  value: string,
  locale: string
): Promise<PartnerData | null> {
  try {
    const supabase = getSupabaseServer();
    const { data: client, error } = await supabase
      .schema("core")
      .from("clients")
      .select(CLIENT_COLUMNS)
      .eq(column, value)
      .single();

    if (error || !client) return null;
    return await buildPartnerData(supabase, client as ClientRow, locale);
  } catch (err) {
    console.error(`Error fetching partner by ${column}:`, err);
    return null;
  }
}

// Wrapped in React cache() so generateMetadata and the page component share a
// single DB lookup per request (same args → one query).

/** Resolve a partner by client UUID (legacy /download?ID= flow). */
export const getPartnerById = cache(
  (id: string, locale: string): Promise<PartnerData | null> => resolvePartner("id", id, locale)
);

/** Resolve a partner by friendly slug (new /d/<slug> flow). */
export const getPartnerBySlug = cache(
  (slug: string, locale: string): Promise<PartnerData | null> => resolvePartner("slug", slug, locale)
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
  locale: string
): Promise<CouponContext | null> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .schema("drive")
      .rpc("get_coupon_preview", { p_code: rawCode });

    if (error) {
      console.error("Error calling get_coupon_preview:", error);
      return null;
    }

    const result = data as GetCouponPreviewRpcResult | null;
    if (!result || !result.found || !result.code || !result.days) return null;

    const welcome = await fetchLocalizedWelcome(supabase, result.owner_poi_id, locale);
    const ownerClientId = result.owner_client_id ?? "";
    const isTuggi = !ownerClientId || ownerClientId === TUGGI_PARTNER_ID;

    const partner: PartnerData = {
      id: ownerClientId,
      slug: result.owner_slug ?? null,
      name: isTuggi ? null : (result.owner_name ?? null),
      isTuggi,
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
  (code: string, locale: string): Promise<CouponContext | null> =>
    resolveCoupon(code, locale)
);
