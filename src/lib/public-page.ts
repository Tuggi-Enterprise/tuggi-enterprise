import { createHash } from "node:crypto";
import { cache } from "react";
import { clientAddressOf, registerAttempt } from "@/lib/rate-limit";
import { getSupabaseClient } from "@/lib/supabase-server";

/**
 * The one resolver of the partner page — `partner.resolve_public_page`,
 * BR-B2B-037 item 2 and BR-B2B-067. `tuggi.app/@nome` and `/d/{slug}` both ask
 * it what a name is, and render what it answers (contract
 * `docs/contracts/identidade-publica.md`, "Site (`service_role`, servidor da
 * página)").
 *
 * service_role, because the function is not granted to `anon`: it reads the
 * account behind an @ and answers the same `not_found` for every name without
 * a page, which is what keeps it from becoming a lookup of who has an account
 * (BR-B2B-067 item 5). It runs on this server only.
 *
 * NOT CACHED, on purpose. A removed photo or a creator whose flag was turned
 * off leaves the page on the next read (BR-B2B-067 item 2.b), and an unknown
 * name stored per string would be one more object for anyone typing `/@<x>`.
 * `cache` only shares the one call between the metadata and the page.
 */

export type DbLangMap = Record<string, string>;

export interface PublicRoute {
  id: string;
  slug: string;
  name: string;
}

export interface PublicPoi {
  id: string;
  name: string;
}

export interface FeaturedRoutePreview {
  poiId: string;
  /** Stop name per database language (`pt-br`, `en-us`…). */
  names: DbLangMap;
  /** Clip URL per database language. Never empty: a preview without audio is no preview. */
  audio: DbLangMap;
}

export interface FeaturedRoute {
  id: string;
  slug: string;
  names: DbLangMap;
  distanceKm: number | null;
  stopsCount: number | null;
  durationMin: number | null;
  /** GeoJSON LineString coordinates, `[lng, lat][]`. Null when the route has no drawn path. */
  path: number[][] | null;
  preview: FeaturedRoutePreview | null;
}

export interface CreatorPage {
  state: "page";
  kind: "creator";
  clientId: string;
  name: string;
  displayName: string;
  photoKey: string | null;
  verified: boolean;
  bio: string | null;
  routes: PublicRoute[];
  discoveredPois: PublicPoi[];
  /** Distinct listeners, all time. Null below the floor the database keeps (BR-B2B-067). */
  listenersTotal: number | null;
  featuredRoute: FeaturedRoute | null;
}

export interface ClientPage {
  state: "page";
  kind: "client";
  clientId: string;
  /** The client's slug: the blocks of the page come from the `/d/{slug}` read of it. */
  name: string;
  verified: boolean;
  /** False when the contract ended (BR-B2B-067 item 6): the page stays, the capture does not. */
  attributes: boolean;
}

export type PublicPage =
  | CreatorPage
  | ClientPage
  | { state: "redirect"; to: string }
  | { state: "not_found" };

export const NOT_FOUND: PublicPage = { state: "not_found" };

/**
 * The longest name worth asking the database about. An @ is far shorter
 * (BR-USUARIO-050) and so is a slug; anything longer is an answer already.
 */
const NAME_MAX_LENGTH = 64;

/** The name in the URL, without the `@` in front, or null when it cannot be one. */
export function publicNameOf(raw: string): string | null {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  value = value.trim().replace(/^@/, "");
  if (!value || value.length > NAME_MAX_LENGTH || /[\s/\\]/.test(value)) return null;
  return value;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;

const measure = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
};

/** A `{ "<lang>": "<text>" }` object, keeping only the non-empty strings. */
function langMap(value: unknown): DbLangMap {
  if (!isObject(value)) return {};
  const out: DbLangMap = {};
  for (const [lang, entry] of Object.entries(value)) {
    const v = text(entry);
    if (v) out[lang] = v;
  }
  return out;
}

function lineString(value: unknown): number[][] | null {
  if (!isObject(value) || value.type !== "LineString" || !Array.isArray(value.coordinates)) return null;
  const coords = value.coordinates.filter(
    (pair): pair is number[] =>
      Array.isArray(pair) && pair.length >= 2 && pair.every((n) => typeof n === "number" && Number.isFinite(n))
  );
  return coords.length > 1 ? coords : null;
}

function featuredRouteOf(value: unknown): FeaturedRoute | null {
  if (!isObject(value)) return null;
  const id = text(value.id);
  const slug = text(value.slug);
  const names = langMap(value.names);
  if (!id || !slug || !Object.keys(names).length) return null;

  let preview: FeaturedRoutePreview | null = null;
  if (isObject(value.preview)) {
    const poiId = text(value.preview.poi_id);
    const audio = langMap(value.preview.audio);
    const previewNames = langMap(value.preview.names);
    if (poiId && Object.keys(audio).length && Object.keys(previewNames).length) {
      preview = { poiId, names: previewNames, audio };
    }
  }

  return {
    id,
    slug,
    names,
    distanceKm: measure(value.distance_km),
    stopsCount: count(value.stops_count),
    durationMin: measure(value.duration_min),
    path: lineString(value.path),
    preview,
  };
}

function listOf<T>(value: unknown, pick: (row: Json) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const item = isObject(row) ? pick(row) : null;
    return item ? [item] : [];
  });
}

/**
 * The answer of the resolver as the page reads it. A missing new field is
 * the same as `null` (DS-COMPONENTE-110: a block without content does not
 * appear), so this page works before and after the migration that adds
 * `listeners_total` and `featured_route`. An answer it cannot read throws:
 * an unknown shape taken for `not_found` would answer 404 for a real page.
 */
export function parsePublicPage(data: unknown): PublicPage {
  if (!isObject(data)) throw new Error("resolve_public_page: answer is not an object");

  if (data.state === "not_found") return NOT_FOUND;

  if (data.state === "redirect") {
    const to = text(data.to);
    if (!to) throw new Error("resolve_public_page: redirect without a target");
    return { state: "redirect", to };
  }

  if (data.state === "page") {
    const clientId = text(data.client_id);
    const name = text(data.name);
    if (!clientId || !name) throw new Error("resolve_public_page: page without client_id or name");

    if (data.kind === "client") {
      return {
        state: "page",
        kind: "client",
        clientId,
        name,
        verified: data.verified === true,
        attributes: data.attributes === true,
      };
    }

    if (data.kind === "creator") {
      return {
        state: "page",
        kind: "creator",
        clientId,
        name,
        displayName: text(data.display_name) ?? name,
        photoKey: text(data.photo_key),
        verified: data.verified === true,
        bio: text(data.bio),
        routes: listOf(data.routes, (row) => {
          const id = text(row.id);
          const slug = text(row.slug);
          const routeName = text(row.name);
          return id && slug && routeName ? { id, slug, name: routeName } : null;
        }),
        discoveredPois: listOf(data.discovered_pois, (row) => {
          const id = text(row.id);
          const poiName = text(row.name);
          return id && poiName ? { id, name: poiName } : null;
        }),
        listenersTotal: count(data.listeners_total),
        featuredRoute: featuredRouteOf(data.featured_route),
      };
    }
  }

  throw new Error(`resolve_public_page: unknown answer ${String(data.state)}/${String(data.kind)}`);
}

/**
 * What a name is. Throws when the database could not answer: a failure is
 * never served as "no page" (that would be a 404 for a real partner).
 */
export const resolvePublicPage = cache(async (rawName: string): Promise<PublicPage> => {
  const name = publicNameOf(rawName);
  if (!name) return NOT_FOUND;
  const { data, error } = await getSupabaseClient("serviceRole")
    .schema("partner")
    .rpc("resolve_public_page", { p_name: name });
  if (error) throw new Error(`partner.resolve_public_page: ${error.code} ${error.message}`);
  return parsePublicPage(data);
});

/**
 * The text of a `{ "<lang>": "<text>" }` map in the visitor's language: the
 * same order the welcome audio of `/d/{slug}` follows (`fetchLocalizedWelcome`
 * in src/lib/partner.ts), the exact dialect first and `en-us` after it, and
 * then the first one there is.
 */
export function pickLang(map: DbLangMap, dbLang: string): { lang: string; value: string } | null {
  for (const lang of [dbLang, "en-us"]) {
    if (map[lang]) return { lang, value: map[lang] };
  }
  const first = Object.keys(map)[0];
  return first ? { lang: first, value: map[first] } : null;
}

/**
 * WHERE THE CREATOR'S PHOTO IS READ FROM: a path of this site, and never a
 * storage address (BR-B2B-067 item 2.b). The key of the moderated copy
 * (`<user id>/<file>.jpg` in the private `profile-photos` bucket) carries the
 * account id, which is also the purchase system's id of that person; a signed
 * URL carries the key twice, in the path and in its token, and a page a robot
 * indexed cannot take it back. The page names the photo by the public @ and
 * the route below serves the bytes.
 *
 * `v` changes when the photo does, so a new photo is fetched at once instead
 * of waiting for the browser's copy to expire. It is a digest of the key and
 * says nothing about it: the file part is random.
 */
export function creatorPhotoSrc(page: CreatorPage): string | null {
  if (!page.photoKey) return null;
  const version = createHash("sha256").update(page.photoKey, "utf8").digest("base64url").slice(0, 12);
  return `/@${encodeURIComponent(page.name)}/photo?v=${version}`;
}

/** The image types the moderated copy can be. Anything else is not served. */
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface CreatorPhoto {
  bytes: ArrayBuffer;
  contentType: string;
}

/**
 * The bytes of the creator's moderated photo, read with service_role on this
 * server (BR-B2B-067 item 2.b, BR-USUARIO-052 item 2.e). Null when there is
 * none to serve; the log never names the key, which carries the account id.
 */
export async function fetchCreatorPhoto(page: CreatorPage): Promise<CreatorPhoto | null> {
  if (!page.photoKey) return null;
  const { data, error } = await getSupabaseClient("serviceRole")
    .storage.from("profile-photos")
    .download(page.photoKey);
  if (error || !data) {
    console.error("profile-photos: could not read the creator photo", error?.message ?? "no data");
    return null;
  }
  const contentType = data.type.split(";")[0].trim().toLowerCase();
  if (!PHOTO_TYPES.has(contentType)) {
    console.error("profile-photos: the creator photo is not an image type the page serves", contentType || "none");
    return null;
  }
  return { bytes: await data.arrayBuffer(), contentType };
}

/**
 * A user agent that says it is a robot: a search crawler, a link preview
 * (WhatsApp, Facebook, Slack, Telegram…) or a page measurer. An empty one
 * counts too: a person's browser always sends one.
 */
const DECLARED_ROBOT =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp|embedly|preview|lighthouse|pagespeed|headless|python-requests|curl\/|wget/i;

export function isDeclaredRobot(userAgent: string | null | undefined): boolean {
  const ua = userAgent?.trim();
  return !ua || DECLARED_ROBOT.test(ua);
}

export type PageVisitVia = "at_name" | "d_slug";

export const PAGE_VISIT_BUCKET = "page-visit";
export const PAGE_VISIT_WINDOW_SECONDS = 60 * 60;
/**
 * Openings of one page counted per address per hour (BR-B2B-068 item 2.e).
 * The same ceiling as a kit scan: a hotel Wi-Fi full of guests opening the
 * hotel's page stays under it, a script reloading a page to inflate it does
 * not. Above it the page opens as always and the opening is not counted.
 */
export const PAGE_VISIT_LIMIT_PER_WINDOW = 30;

/**
 * Counts one opening of the page, for "visitaram o perfil" (BR-B2B-067 item 7,
 * BR-B2B-068 item 2.e): every render, never a robot, and at most
 * `PAGE_VISIT_LIMIT_PER_WINDOW` per address and page in the window. The bucket
 * names the page, so browsing many pages spends nobody's budget. Nothing
 * about the person is sent (contract: no person, IP or user agent; the
 * counter keeps only a keyed digest of the address). A failure costs one
 * count and never the page.
 */
export async function recordPageVisit(
  clientId: string,
  via: PageVisitVia,
  requestHeaders: Headers
): Promise<void> {
  if (isDeclaredRobot(requestHeaders.get("user-agent"))) return;
  try {
    const decision = await registerAttempt({
      bucket: `${PAGE_VISIT_BUCKET}:${clientId}`,
      clientAddress: clientAddressOf(requestHeaders),
      windowSeconds: PAGE_VISIT_WINDOW_SECONDS,
      maxAttempts: PAGE_VISIT_LIMIT_PER_WINDOW,
    });
    if (!decision.allowed) return;

    const { error } = await getSupabaseClient("serviceRole")
      .schema("partner")
      .rpc("record_page_visit", { p_client_id: clientId, p_via: via });
    if (error) console.error("partner.record_page_visit:", error.code, error.message);
  } catch (err) {
    console.error("partner.record_page_visit failed:", err);
  }
}

/**
 * What a visitor can report on a creator's page (BR-USUARIO-051 item 5): the
 * three fields the database knows, `nickname` being the @. The function
 * refuses anything else with 22023.
 */
export const PAGE_REPORT_FIELDS = ["display_name", "nickname", "bio"] as const;
export type PageReportField = (typeof PAGE_REPORT_FIELDS)[number];

export const isPageReportField = (value: unknown): value is PageReportField =>
  typeof value === "string" && (PAGE_REPORT_FIELDS as readonly string[]).includes(value);

export const PAGE_REPORT_BUCKET = "page-report";
export const PAGE_REPORT_WINDOW_SECONDS = 60 * 60;
/**
 * Reports of one page sent per address per hour. A repeated report adds to
 * the count of the open one (contract `identidade-publica.md`, "Denúncia"),
 * so the ceiling is what keeps one address from pushing a page up the queue
 * of the CMS. Ten is more than a hotel Wi-Fi of guests reporting the same
 * page in one hour; a script reposting the form meets it at once.
 */
export const PAGE_REPORT_LIMIT_PER_WINDOW = 10;

/**
 * What the visitor is told. `received` for every answer about the name
 * (reported, no page, an empty field, the ceiling), so the form never says
 * whether a name has an account (BR-B2B-067 item 5); `failed` only when
 * nothing could be recorded and trying again can work.
 */
export type PageReportOutcome = "received" | "failed";

/**
 * Sends a report of the page named in the URL to the CMS queue
 * (`partner.report_public_page_as`, BR-USUARIO-051 item 5). The report
 * changes nothing on the page; a curator decides. Nothing about the person
 * is sent, and the report id and count stay on this server. The name is the
 * one the page showed: the function does not follow a redirect.
 */
export async function reportPublicPage(
  rawName: string,
  field: PageReportField,
  requestHeaders: Headers
): Promise<PageReportOutcome> {
  const name = publicNameOf(rawName);
  if (!name) return "received";
  try {
    const decision = await registerAttempt({
      bucket: `${PAGE_REPORT_BUCKET}:${name.toLowerCase()}`,
      clientAddress: clientAddressOf(requestHeaders),
      windowSeconds: PAGE_REPORT_WINDOW_SECONDS,
      maxAttempts: PAGE_REPORT_LIMIT_PER_WINDOW,
    });
    // The ceiling answers like a report taken. A counter that could not
    // count is the server failing, and waiting works.
    if (!decision.allowed) return decision.reason === "limit" ? "received" : "failed";

    const { data, error } = await getSupabaseClient("serviceRole")
      .schema("partner")
      .rpc("report_public_page_as", { p_name: name, p_field: field });
    if (error) {
      // 22023: a field the page has not got, an empty bio. Same answer as a name without a page.
      if (error.code === "22023") return "received";
      console.error("partner.report_public_page_as:", error.code || error.message);
      return "failed";
    }
    if (isObject(data) && (data.state === "reported" || data.state === "not_found")) return "received";
    console.error("partner.report_public_page_as: unknown answer");
    return "failed";
  } catch (err) {
    console.error("partner.report_public_page_as failed:", err instanceof Error ? err.message : "unknown");
    return "failed";
  }
}
