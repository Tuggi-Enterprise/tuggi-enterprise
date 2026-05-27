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
    default: return "en-us";
  }
}

/** Builds the partner view-model from a client row, fetching the localized welcome audio/text. */
async function buildPartnerData(
  supabase: SupabaseClient,
  client: ClientRow,
  locale: string
): Promise<PartnerData> {
  const isTuggi = client.id === TUGGI_PARTNER_ID;
  const base: PartnerData = {
    id: client.id,
    slug: client.slug,
    name: isTuggi ? null : client.company_name,
    isTuggi,
  };

  const welcomePoiId = client.welcome_poi_id || client.metadata?.welcome_poi_id;
  if (!welcomePoiId) return base;

  // Try the requested locale, then fall back to en-us.
  let { data: description } = await supabase
    .schema("core")
    .from("attraction_descriptions")
    .select("audio_url, description")
    .eq("attraction_id", welcomePoiId)
    .eq("language", getDbLang(locale))
    .single();

  if (!description) {
    const { data: enFallback } = await supabase
      .schema("core")
      .from("attraction_descriptions")
      .select("audio_url, description")
      .eq("attraction_id", welcomePoiId)
      .eq("language", "en-us")
      .single();
    if (enFallback) description = enFallback;
  }

  if (description) {
    return { ...base, audioUrl: description.audio_url, description: description.description };
  }
  return base;
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
