import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase-server";
import { getDbLang } from "@/lib/partner";
import { UUID_PATTERN } from "@/lib/attribution";

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
 * The "Open in the app" link (#946): the app's own scheme, which opens the app
 * even where the Universal Link does not fire (a link pasted in Safari's
 * address bar, an AASA not yet re-read). The form is the one
 * `DeepLinkService.handleDeepLink` (`tuggi-drive-v2`, `case '/route'`) already
 * accepts, `tuggi://route?id=<uuid>`, so the build already in the stores
 * understands it; `tuggi://r/<slug>` does not route there.
 */
export function routeAppSchemeUrl(id: string): string {
  return `tuggi://route?id=${encodeURIComponent(id)}`;
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
      /** The route's uuid, only when it has that shape: it feeds the app scheme link. */
      id: string | null;
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
    id: UUID_PATTERN.test(row.id) ? row.id : null,
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
 * What the link of a route shares besides the page — contract
 * `link-da-rota.md` §5a, `core.get_route_share_meta` (#1221).
 *
 * `authorPartnerId` is the creator record the author's route credits
 * (BR-B2B-066 item 3, BR-ROTA-005 item 8.a), and it reaches the browser: the
 * capture runs there, as on `tuggi.app/@nome`. `coverPhotoKey` NEVER leaves
 * the server. It starts with the author's account id, so nothing the visitor
 * receives may carry it: not the HTML, not the RSC payload, not `og:image`,
 * not a log line (security review of #1221).
 */
export interface RouteShareMeta {
  slug: string;
  authorPartnerId: string | null;
  coverPhotoKey: string | null;
}

interface RouteShareMetaRow {
  slug?: unknown;
  author_partner_id?: unknown;
  cover_photo_key?: unknown;
}

export function parseRouteShareMeta(data: unknown): RouteShareMeta | null {
  const row = (Array.isArray(data) ? data[0] : data) as RouteShareMetaRow | null | undefined;
  if (!row || typeof row !== "object") return null;
  const slug = normalizeRouteSlug(text(row.slug) ?? "");
  if (!slug) return null;
  const partner = text(row.author_partner_id);
  return {
    slug,
    authorPartnerId: partner && UUID_PATTERN.test(partner) ? partner.toLowerCase() : null,
    coverPhotoKey: text(row.cover_photo_key),
  };
}

/**
 * The share meta of a `/r/<slug>` segment, or null. Null is every answer that
 * is not a row: no row (route in review, removed, switched off, unknown),
 * `PGRST202`/`42883` (migration `20261120130000` not applied yet) and any
 * other error. The page does not depend on it to exist: without it, it only
 * stops crediting the author and showing the cover (§5a).
 *
 * Publishable key, no session, like `getRouteLink`: the function is executable
 * by `anon` and decides on its own what a stranger may know.
 */
export const getRouteShareMeta = cache(async (rawSlug: string): Promise<RouteShareMeta | null> => {
  const slug = normalizeRouteSlug(rawSlug);
  if (!slug) return null;
  try {
    const { data, error } = await getSupabaseClient("publishable")
      .schema("core")
      .rpc("get_route_share_meta", { p_slug: slug });
    if (error) {
      // The code only, never the slug: a `link_only` route is shared with few
      // people on purpose.
      console.error("get_route_share_meta failed:", error.code ?? "unknown");
      return null;
    }
    return parseRouteShareMeta(data);
  } catch (err) {
    console.error("get_route_share_meta threw:", (err as Error)?.name ?? "unknown");
    return null;
  }
});

/** Bucket of the route covers (contract `diario-de-bordo.md`, Storage). */
const ROUTE_COVER_BUCKET = "travel-diary-photos";
/**
 * What the share card can draw. The app uploads JPEG (`diaryRpc`, at most
 * 1600 px a side); PNG is the other format the card renderer decodes.
 */
const ROUTE_COVER_TYPES = new Set(["image/jpeg", "image/png"]);
/**
 * Far above a 1600 px JPEG. A larger object is not what the app uploads, and
 * decoding it would spend the Worker's memory on a preview: the card falls back.
 */
const ROUTE_COVER_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The approved cover of the route on the air, as a data URL for the share card
 * (`r/[slug]/opengraph-image.tsx`), or null — BR-ROTA-005 item 8.b.
 *
 * Read on the server with the publishable key: the Storage policy opens the
 * object to `anon` exactly when `cover_photo_key` came back (§5a). The bytes
 * are redrawn into the card, so the image the visitor gets is the site's own:
 * no bucket, no key, no account id, no signed URL that expires inside a chat,
 * and no EXIF of the author's phone either.
 *
 * Null on no meta, no cover, a refused download, a type the card cannot draw
 * or an object above the ceiling; the card is then the default one.
 */
export async function getRouteCoverDataUrl(rawSlug: string): Promise<string | null> {
  const meta = await getRouteShareMeta(rawSlug);
  if (!meta?.coverPhotoKey) return null;
  try {
    const { data, error } = await getSupabaseClient("publishable")
      .storage.from(ROUTE_COVER_BUCKET)
      .download(meta.coverPhotoKey);
    if (error || !data) {
      // The error name only: the key carries the author's account id.
      console.error("route cover: download refused", error?.name ?? "no data");
      return null;
    }
    const type = data.type.split(";")[0].trim().toLowerCase();
    if (!ROUTE_COVER_TYPES.has(type) || data.size > ROUTE_COVER_MAX_BYTES) {
      console.error("route cover: not drawable", type || "none", data.size);
      return null;
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch (err) {
    console.error("route cover: download threw", (err as Error)?.name ?? "unknown");
    return null;
  }
}
