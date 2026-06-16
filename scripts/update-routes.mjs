/**
 * update-routes.mjs
 *
 * Fetches public, active curated routes from core.custom_routes, resolves each
 * route's linked POIs (waypoints[].metadata.attraction_id) and their localized
 * audio previews, decodes the route geometry (EWKB → GeoJSON), and writes a
 * static snapshot to src/data/routes-snapshot.json.
 *
 * Mirrors the coverage snapshot model: the script runs at build time with the
 * SERVICE ROLE key (server-only, never bundled). The snapshot is committed to
 * the repo, so the site renders SSG with ZERO runtime DB access.
 *
 * Rules:
 *   - Source: core.custom_routes WHERE is_active=true AND visibility='public'
 *             (NOT filtered by client_id — routes may have client_id=null)
 *   - Stops:  waypoints[] in order; attraction_id lives in waypoint.metadata.
 *             Generic stops (is_generic / attraction_id=null) keep their name
 *             but have no per-POI audio.
 *   - i18n:   a route is published in a locale only when that locale has
 *             genuine content (a 'ready' custom_route_descriptions row, OR the
 *             Portuguese base name/description for pt-pt). No filler, no dup.
 *
 * Usage:
 *   npm run update-routes
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env / .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import wkx from "wkx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Two layers (see plan): site locales (unified UI) vs audio dialects ─────────
// SITE_LOCALES drive which page is published (route.locales) and the page's
// primary text. For "pt" the dialect is chosen by the route's country.
const SITE_LOCALES = ["en", "es", "pt", "it"];

// AUDIO_LANGS are dialect-level and key stop/route audio in the snapshot — the
// multi-language audio player shows all of these. pt-br and pt-pt stay SEPARATE.
const AUDIO_LANGS = ["en", "es", "pt-br", "pt-pt", "it"];
const AUDIO_LANG_TO_DBLANG = {
  "en": "en-us",
  "es": "es-es",
  "pt-br": "pt-br",
  "pt-pt": "pt-pt",
  "it": "it-it",
};

/** Site locale → DB language for a route's PRIMARY text (pt → country dialect). */
function siteLocaleToDbLang(locale, countrySlug) {
  switch (locale) {
    case "en": return "en-us";
    case "es": return "es-es";
    case "it": return "it-it";
    case "pt": return countrySlug === "portugal" ? "pt-pt" : "pt-br";
    default: return "en-us";
  }
}

// ── Load .env.local / .env (same loader as update-coverage.mjs) ────────────────
function loadEnvFile(p) {
  try {
    readFileSync(p, "utf-8").split("\n").forEach(l => {
      const t = l.trim(); if (!t || t.startsWith("#")) return;
      const i = t.indexOf("="); if (i < 0) return;
      const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    });
  } catch {}
}
loadEnvFile(join(ROOT, ".env.local"));
loadEnvFile(join(ROOT, ".env"));

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "core" },
});

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Lowercase, strip accents, keep [a-z0-9-], collapse separators to single hyphen. */
function slugify(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // drop diacritics
    .replace(/[''`]/g, "")             // drop apostrophes
    .replace(/[^a-z0-9]+/g, "-")       // anything else (em-dash, punctuation, spaces) → hyphen
    .replace(/^-+|-+$/g, "")           // trim leading/trailing hyphens
    .replace(/-{2,}/g, "-");           // collapse repeats
}

/** Normalise the country label into a stable, English-ish slug used in the URL. */
function countrySlugOf(rawCountry) {
  const s = slugify(rawCountry);
  const MAP = {
    "brasil": "brazil",
    "espanha": "spain", "espana": "spain",
    "estados-unidos": "united-states", "usa": "united-states", "us": "united-states",
    "reino-unido": "united-kingdom", "uk": "united-kingdom",
    "italia": "italy",
    "franca": "france",
  };
  return MAP[s] || s;
}

/** Parse a possibly-stringified jsonb column into an object/array. */
function parseJson(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

const round5 = n => (typeof n === "number" ? Math.round(n * 1e5) / 1e5 : n);

/** Recursively round all coordinates in a GeoJSON geometry to 5 decimals (~1 m). */
function roundCoords(c) {
  if (typeof c === "number") return round5(c);
  if (Array.isArray(c)) return c.map(roundCoords);
  return c;
}

/**
 * Radial-distance simplification: drop points closer than `tol` degrees to the
 * last kept point (always keeps first/last). ~0.00015° ≈ 15 m — plenty for a
 * page-scale map and cuts geometry weight by ~5–10×.
 */
function simplifyLine(coords, tol = 0.00015) {
  if (!Array.isArray(coords) || coords.length <= 2) return coords;
  const out = [coords[0]];
  let [px, py] = coords[0];
  for (let i = 1; i < coords.length - 1; i++) {
    const [x, y] = coords[i];
    if (Math.abs(x - px) > tol || Math.abs(y - py) > tol) {
      out.push(coords[i]);
      px = x; py = y;
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}

/** EWKB/WKB hex → GeoJSON LineString (simplified, coords rounded to ~1 m), or null. */
function geometryToGeoJSON(hex) {
  if (!hex || typeof hex !== "string") return null;
  try {
    const geo = wkx.Geometry.parse(Buffer.from(hex, "hex")).toGeoJSON();
    if (geo && geo.type === "LineString" && Array.isArray(geo.coordinates)) {
      geo.coordinates = roundCoords(simplifyLine(geo.coordinates));
    } else if (geo && geo.coordinates) {
      geo.coordinates = roundCoords(geo.coordinates);
    }
    return geo;
  } catch (err) {
    return null;
  }
}

// ── Fetch routes ────────────────────────────────────────────────────────────────
async function fetchRoutes() {
  const { data, error } = await sb
    .from("custom_routes")
    .select(
      "id, name, description, geometry, waypoints, metadata, country, region, stops_count, " +
      "accessibility, drivability, scenic_profile, best_time, road_conditions, photogenic_rating, resources, updated_at"
    )
    .eq("is_active", true)
    .eq("visibility", "public");
  if (error) throw new Error("custom_routes fetch error: " + error.message);
  return data ?? [];
}

/** route_id → { [dbLang]: { name, description, audio_url } } for status='ready'. */
async function fetchRouteDescriptions(routeIds) {
  const byRoute = new Map();
  if (!routeIds.length) return byRoute;
  const { data, error } = await sb
    .from("custom_route_descriptions")
    .select("route_id, language, gender, name, description, audio_url, status")
    .in("route_id", routeIds)
    .eq("status", "ready");
  if (error) throw new Error("custom_route_descriptions fetch error: " + error.message);
  for (const row of data ?? []) {
    if (!byRoute.has(row.route_id)) byRoute.set(row.route_id, {});
    const lang = (row.language || "").toLowerCase();
    // Keep the first gender encountered per language (default voice).
    if (!byRoute.get(row.route_id)[lang]) {
      byRoute.get(row.route_id)[lang] = {
        name: row.name,
        description: row.description,
        audioUrl: row.audio_url,
      };
    }
  }
  return byRoute;
}

/** attraction_id → { name, city, state, country, image_url, thumbnail_url } */
async function fetchAttractions(ids) {
  const map = new Map();
  if (!ids.length) return map;
  const CHUNK = 300;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await sb
      .from("attractions")
      .select("id, name, city, state, country, image_url, thumbnail_url")
      .in("id", slice);
    if (error) throw new Error("attractions fetch error: " + error.message);
    for (const a of data ?? []) map.set(a.id, a);
  }
  return map;
}

/**
 * attraction_id → { [dbLang]: { description, audioUrl } }.
 * attraction_descriptions has no `status` column — a row counts as content when
 * it carries a description and/or an audio_url.
 */
async function fetchAttractionDescriptions(ids) {
  const byAttraction = new Map();
  if (!ids.length) return byAttraction;
  const CHUNK = 300;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await sb
      .from("attraction_descriptions")
      .select("attraction_id, language, description, audio_url")
      .in("attraction_id", slice);
    if (error) throw new Error("attraction_descriptions fetch error: " + error.message);
    for (const row of data ?? []) {
      if (!byAttraction.has(row.attraction_id)) byAttraction.set(row.attraction_id, {});
      const lang = (row.language || "").toLowerCase();
      if (!byAttraction.get(row.attraction_id)[lang]) {
        byAttraction.get(row.attraction_id)[lang] = {
          description: row.description,
          audioUrl: row.audio_url,
        };
      }
    }
  }
  return byAttraction;
}

// ── Build per-locale i18n maps, applying the "genuine content only" rule ───────
/**
 * Returns { locales: string[], i18n: {siteLocale: {name, description, audioUrl}} }.
 * Keyed by SITE locale (en/es/pt/it). For "pt" the dialect text is chosen by the
 * route's country (Portugal → pt-pt, else pt-br). A locale is included when a
 * 'ready' route description exists for its dbLang; the Portuguese base text is
 * always also published under "pt" (covers routes without ready translations).
 */
function buildRouteI18n(route, readyByLang, countrySlug) {
  const i18n = {};
  const ready = readyByLang || {};

  for (const locale of SITE_LOCALES) {
    const dbLang = siteLocaleToDbLang(locale, countrySlug);
    const content = ready[dbLang] || ready[dbLang.split("-")[0]];
    if (content && (content.name || content.description)) {
      i18n[locale] = {
        name: content.name || route.name,
        description: content.description || "",
        audioUrl: content.audioUrl || null,
      };
    }
  }

  // Always also publish the Portuguese base content under "pt" (the base text is
  // already in the route's country dialect), unless a ready pt translation exists.
  if (!i18n["pt"] && (route.name || route.description)) {
    i18n["pt"] = {
      name: route.name || "",
      description: route.description || "",
      audioUrl: null,
    };
  }

  return { locales: Object.keys(i18n), i18n };
}

// ── Build the per-AUDIO-LANG content map for a stop (dialect-level, for the ─────
// multi-language audio player). Keys: en, es, pt-br, pt-pt, it (pt-br/pt-pt
// stay separate so the player can showcase both).
function buildStopI18n(attractionDescByLang) {
  const i18n = {};
  const ready = attractionDescByLang || {};
  for (const lang of AUDIO_LANGS) {
    const dbLang = AUDIO_LANG_TO_DBLANG[lang];
    const content = ready[dbLang] || ready[dbLang.split("-")[0]];
    if (content && (content.description || content.audioUrl)) {
      i18n[lang] = {
        description: content.description || "",
        audioUrl: content.audioUrl || null,
      };
    }
  }
  return i18n;
}

// ── Main ────────────────────────────────────────────────────────────────────────
console.log("🧭  Tuggi Routes Snapshot");
console.log("────────────────────────────");

const rawRoutes = await fetchRoutes();
console.log(`   Fetched ${rawRoutes.length} public+active routes`);

// Collect all linked attraction ids across all routes (dedup) for batch fetch.
const allAttractionIds = new Set();
const parsedRoutes = rawRoutes.map(r => {
  const waypoints = parseJson(r.waypoints, []);
  const metadata = parseJson(r.metadata, {});
  for (const w of waypoints) {
    const aid = w?.metadata?.attraction_id ?? w?.attraction_id ?? null;
    if (aid) allAttractionIds.add(aid);
  }
  return { row: r, waypoints, metadata };
});

const attractionIds = [...allAttractionIds];
console.log(`   Resolving ${attractionIds.length} linked attractions…`);

const [routeDescByRoute, attractionById, attractionDescById] = await Promise.all([
  fetchRouteDescriptions(rawRoutes.map(r => r.id)),
  fetchAttractions(attractionIds),
  fetchAttractionDescriptions(attractionIds),
]);

// Log a sample waypoint so the data shape is visible on each run.
const sampleWp = parsedRoutes.find(p => p.waypoints.length)?.waypoints?.[0];
if (sampleWp) console.log("   Sample waypoint:", JSON.stringify(sampleWp).slice(0, 200));

const routes = [];
const slugsByCountry = new Map(); // countrySlug → Set(slug) for uniqueness

for (const { row, waypoints, metadata } of parsedRoutes) {
  const country = row.country ?? metadata.country ?? null;
  const region = row.region ?? metadata.region ?? null;
  if (!country) {
    console.warn(`   ⚠ skip "${row.name}" — no country`);
    continue;
  }
  const countrySlug = countrySlugOf(country);

  // i18n + locale eligibility (genuine content only)
  const { locales, i18n } = buildRouteI18n(row, routeDescByRoute.get(row.id), countrySlug);
  if (locales.length === 0) {
    console.warn(`   ⚠ skip "${row.name}" — no eligible content`);
    continue;
  }

  // Stable, country-scoped unique slug
  let slug = slugify(row.name) || `route-${String(row.id).slice(0, 6)}`;
  if (!slugsByCountry.has(countrySlug)) slugsByCountry.set(countrySlug, new Set());
  const used = slugsByCountry.get(countrySlug);
  if (used.has(slug)) slug = `${slug}-${String(row.id).slice(0, 6)}`;
  used.add(slug);

  // Stops in waypoint order
  const stops = waypoints.map(w => {
    const wm = w?.metadata || {};
    const attractionId = wm.attraction_id ?? w?.attraction_id ?? null;
    const attraction = attractionId ? attractionById.get(attractionId) : null;
    const name = (attraction?.name) || wm.name || w?.name || "";
    const lat = round5(w?.lat ?? null);
    const lng = round5(w?.lng ?? null);
    const isGeneric = !attractionId || wm.is_generic === true;
    return {
      attractionId: attractionId || null,
      isGeneric,
      name,
      lat,
      lng,
      imageUrl: attraction?.image_url || attraction?.thumbnail_url || null,
      photogenicRating: wm.photogenic_rating ?? null,
      i18n: attractionId ? buildStopI18n(attractionDescById.get(attractionId)) : {},
    };
  }).filter(s => s.name || (s.lat != null && s.lng != null));

  routes.push({
    id: row.id,
    slug,
    country,
    countrySlug,
    region,
    updatedAt: row.updated_at ?? null,
    distanceM: typeof metadata.distance === "number" ? metadata.distance : null,
    durationS: typeof metadata.duration === "number" ? metadata.duration : null,
    stopsCount: row.stops_count ?? stops.length,
    accessibility: row.accessibility ?? "unknown",
    drivability: row.drivability ?? "unknown",
    scenicProfile: row.scenic_profile ?? [],
    bestTime: row.best_time ?? [],
    roadConditions: row.road_conditions ?? [],
    photogenicRating: row.photogenic_rating ?? "unknown",
    resources: parseJson(row.resources, {}),
    geometry: geometryToGeoJSON(row.geometry),
    locales,
    i18n,
    stops,
  });
}

routes.sort((a, b) => (a.country || "").localeCompare(b.country || "") || a.slug.localeCompare(b.slug));

const snapshot = {
  generatedAt: new Date().toISOString(),
  totalRoutes: routes.length,
  routes,
};

// Minified: this is a generated artifact (high-resolution geometry would bloat
// a pretty-printed file by ~3×). Regenerate via `npm run update-routes`.
const outPath = join(ROOT, "src/data/routes-snapshot.json");
writeFileSync(outPath, JSON.stringify(snapshot) + "\n", "utf-8");

console.log("");
console.log(`✅  Snapshot saved → src/data/routes-snapshot.json (${routes.length} routes)`);
const byCountry = {};
routes.forEach(r => { byCountry[r.country] = (byCountry[r.country] || 0) + 1; });
Object.entries(byCountry).forEach(([c, n]) => console.log(`     ${String(n).padStart(3)}  ${c}`));
console.log("");
console.log("👉  Commit src/data/routes-snapshot.json and push to deploy.");
