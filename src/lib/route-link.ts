import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase-server";
import { getDbLang } from "@/lib/partner";
import { PLAY_STORE_URL } from "@/lib/app-meta";

/**
 * The route page's one door to the app database — `tuggi.app/r/<slug>`, card
 * #946, contract `docs/contracts/link-da-rota.md` (the RPC is #943's).
 *
 * WHY THE PUBLISHABLE KEY. `core.get_custom_route_by_slug` is SECURITY DEFINER
 * and executable by `anon` (#943), and it already hides what a stranger may
 * not see (no name in review or after moderation). A public URL that takes an
 * arbitrary slug is exactly where a key that bypasses RLS should not be — and
 * the card says no credential beyond the one the site already uses.
 */

/**
 * The public link of a route. `tuggi.app`, not `www.`: it is the host the app
 * claims in its App Links and in the AASA, and the one the app's
 * `routeLinkOf` (`tuggi-drive-v2`, `src/modules/customRoutes/utils/routeLink.ts`)
 * shares. The two ends cite each other; the contract owns the shape.
 */
export const ROUTE_LINK_ORIGIN = "https://tuggi.app";

export function routeLinkOf(slug: string): string {
  return `${ROUTE_LINK_ORIGIN}/r/${slug}`;
}

/**
 * Shape of a slug as `core.slugify` writes it. Checked before the database is
 * asked, so `/r/../../etc` or a scanner's junk costs nothing upstream. Upper
 * case and spaces are forgiven by the RPC itself (it slugifies the input), so
 * the segment is lower-cased here and the redirect lands on the canonical one.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 96;

export function normalizeRouteSlug(raw: string): string | null {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const slug = value.trim().toLowerCase();
  return slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug) ? slug : null;
}

export type RouteAvailability =
  | "ok"
  | "expired"
  | "not_yet_valid"
  | "pending_review"
  | "removed_by_author"
  | "removed_by_moderation";

/**
 * What the page may know about a route. `not_found` also covers "the database
 * did not answer" and "the function does not exist yet" (migration of #943
 * not applied): the visitor gets the same page with the store, never a 500
 * (spec §1.2, precedent BR-B2B-001 on `/d/`).
 */
export type RouteLink =
  | {
      status: "available";
      slug: string;
      name: string;
      region: string | null;
      country: string | null;
      stops: number;
      partnerName: string | null;
    }
  | { status: "review" }
  | { status: "gone" }
  | { status: "not_found" };

const NOT_FOUND: RouteLink = { status: "not_found" };

interface RouteRow {
  id?: unknown;
  name?: unknown;
  translated_name?: unknown;
  region?: unknown;
  country?: unknown;
  stops_count?: unknown;
  partner_name?: unknown;
  slug?: unknown;
  availability?: unknown;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Reads the RPC row. Expired keeps the whole page: whoever has the link keeps
 * following it (epic #942, decision 4). The owner's own view (`is_mine`) never
 * applies here: the page is read anonymously.
 */
export function parseRouteRow(data: unknown, requestedSlug: string): RouteLink {
  const row = (Array.isArray(data) ? data[0] : data) as RouteRow | null | undefined;
  if (!row || typeof row !== "object" || typeof row.id !== "string") return NOT_FOUND;

  const availability = text(row.availability) ?? "ok";
  if (availability === "pending_review") return { status: "review" };
  if (availability === "removed_by_author" || availability === "removed_by_moderation") {
    return { status: "gone" };
  }

  const name = text(row.translated_name) ?? text(row.name);
  if (!name) return NOT_FOUND;
  const slug = normalizeRouteSlug(text(row.slug) ?? requestedSlug) ?? requestedSlug;
  const stops = typeof row.stops_count === "number" && row.stops_count > 0 ? row.stops_count : 0;

  return {
    status: "available",
    slug,
    name,
    region: text(row.region),
    country: text(row.country),
    stops,
    partnerName: text(row.partner_name),
  };
}

/**
 * The route behind a `/r/<slug>` segment. `cache` dedupes the call between
 * `generateMetadata` and the page, so one request is one RPC.
 */
export const getRouteLink = cache(async (rawSlug: string, locale: string): Promise<RouteLink> => {
  const slug = normalizeRouteSlug(rawSlug);
  if (!slug) return NOT_FOUND;

  try {
    const { data, error } = await getSupabaseClient("publishable")
      .schema("core")
      .rpc("get_custom_route_by_slug", {
        p_slug: slug,
        p_user_language: getDbLang(locale),
        p_voice_gender: "male",
      });

    if (error) {
      // The slug is not logged: a `link_only` route is shared on purpose with
      // few people, and the error code alone says what failed.
      console.error("get_custom_route_by_slug failed:", error.code ?? "unknown");
      return NOT_FOUND;
    }
    return parseRouteRow(data, slug);
  } catch (err) {
    console.error("get_custom_route_by_slug threw:", (err as Error)?.name ?? "unknown");
    return NOT_FOUND;
  }
});

/**
 * The slug behind the `/route/<uuid>` link the app's Wrapped card shared
 * before #946. Null when it cannot be resolved; the caller shows the
 * not-found page, which still has the store.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getRouteSlugById = cache(async (rawId: string): Promise<string | null> => {
  const id = rawId.trim();
  if (!UUID_PATTERN.test(id)) return null;
  try {
    // Three named arguments: the one-argument form is ambiguous (#943 contract).
    const { data, error } = await getSupabaseClient("publishable")
      .schema("core")
      .rpc("get_custom_route_by_id", {
        p_route_id: id,
        p_user_language: "en-us",
        p_voice_gender: "male",
      });
    if (error) {
      console.error("get_custom_route_by_id failed:", error.code ?? "unknown");
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as RouteRow | null | undefined;
    return normalizeRouteSlug(text(row?.slug) ?? "");
  } catch (err) {
    console.error("get_custom_route_by_id threw:", (err as Error)?.name ?? "unknown");
    return null;
  }
});

/**
 * The Play link of the route page. The Play Store hands `referrer` to the app
 * on its first launch, and the app reads `tuggi_route=<slug>` from it
 * (`InstallReferrerService`): on Android the install lands on the route
 * deterministically, with no paid tool (#946 item 3). The partner token is not
 * here: the route page does not run the partner capture (contract §4).
 */
export function routePlayStoreUrl(slug: string): string {
  const referrer = `utm_source=tuggi_site&utm_medium=route_link&utm_campaign=route&tuggi_route=${slug}`;
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer)}`;
}
