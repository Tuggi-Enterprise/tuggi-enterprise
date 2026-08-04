/**
 * routes.ts
 *
 * Reads the pre-generated snapshot produced by `npm run update-routes`.
 * The snapshot is committed to the repo, so the build never needs a live
 * Supabase connection — the tour pages render fully static (SSG) with ZERO
 * runtime DB access. Same model as src/lib/coverage.ts.
 *
 * To refresh:
 *   npm run update-routes
 *   git add src/data/routes-snapshot.json && git commit -m "chore: refresh routes snapshot"
 */

import snapshot from "@/data/routes-snapshot.json";
import { getCountryDisplayName, localizedCountryName } from "@/lib/countryNames";

export interface RouteLocaleContent {
  name: string;
  description: string;
  audioUrl: string | null;
}

export interface RouteStopLocaleContent {
  description: string;
  audioUrl: string | null;
}

export interface RouteStop {
  attractionId: string | null;
  isGeneric: boolean;
  name: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  photogenicRating: string | null;
  i18n: Record<string, RouteStopLocaleContent>;
}

export interface GeoJSONLineString {
  type: string;
  coordinates: number[][];
}

export interface RouteSnapshot {
  id: string;
  slug: string;
  country: string;
  countrySlug: string;
  region: string | null;
  /**
   * State / province, when the country has that layer at all. Null is a real
   * answer — Portugal's POIs carry no state, and its routes are simply not
   * grouped. See resolveState() in scripts/update-routes.mjs.
   */
  state: string | null;
  stateSlug: string | null;
  updatedAt: string | null;
  distanceM: number | null;
  durationS: number | null;
  stopsCount: number;
  accessibility: string;
  drivability: string;
  scenicProfile: string[];
  bestTime: string[];
  roadConditions: string[];
  photogenicRating: string;
  resources: Record<string, unknown>;
  geometry: GeoJSONLineString | null;
  locales: string[];
  i18n: Record<string, RouteLocaleContent>;
  stops: RouteStop[];
}

interface RoutesSnapshotFile {
  generatedAt: string;
  totalRoutes: number;
  routes: RouteSnapshot[];
}

const data = snapshot as unknown as RoutesSnapshotFile;

export interface CountrySummary {
  countrySlug: string;
  country: string;
  count: number;
}

/** All routes in the snapshot (no locale filtering). */
export function getAllRoutes(): RouteSnapshot[] {
  return data.routes;
}

/** ISO timestamp of when the snapshot was generated (for sitemap lastmod). */
export function getGeneratedAt(): string {
  return data.generatedAt;
}

/** Routes that have genuine content for `locale` (eligible to be published). */
export function getRoutesForLocale(locale: string): RouteSnapshot[] {
  return data.routes.filter((r) => r.locales.includes(locale));
}

/** A single route by its country slug + route slug (no locale check). */
export function getRoute(
  countrySlug: string,
  slug: string
): RouteSnapshot | undefined {
  return data.routes.find(
    (r) => r.countrySlug === countrySlug && r.slug === slug
  );
}

/**
 * Countries that have ≥1 route eligible for `locale`, with counts.
 * `country` is already written in the page's language, so callers render it
 * directly and the alphabetical sort follows that language.
 */
export function getCountriesForLocale(locale: string): CountrySummary[] {
  const byCountry = new Map<string, CountrySummary>();
  for (const r of getRoutesForLocale(locale)) {
    const existing = byCountry.get(r.countrySlug);
    if (existing) existing.count += 1;
    else
      byCountry.set(r.countrySlug, {
        countrySlug: r.countrySlug,
        country: countryName(r, locale),
        count: 1,
      });
  }
  return [...byCountry.values()].sort((a, b) =>
    a.country.localeCompare(b.country, locale)
  );
}

/** A route's country written in the page's language ("Brasil" on a pt page). */
export function countryName(route: RouteSnapshot, locale: string): string {
  return localizedCountryName(route.countrySlug, locale, route.country);
}

export interface StateSummary {
  stateSlug: string;
  state: string;
  count: number;
  /** Distinct regions inside the state, in route order — a preview of what's there. */
  regions: string[];
}

/**
 * States of a country that have ≥1 route eligible for `locale`, biggest first.
 *
 * Returns an EMPTY array when the country has no state layer at all, which is
 * the signal to fall back to a flat list. State names come from the database in
 * their own language — unlike countries, `Intl` has no display names for them,
 * and a proper noun does not translate anyway.
 */
export function getStatesForCountry(
  countrySlug: string,
  locale: string
): StateSummary[] {
  const byState = new Map<string, StateSummary>();
  for (const r of getRoutesByCountry(countrySlug, locale)) {
    if (!r.state || !r.stateSlug) continue;
    const existing = byState.get(r.stateSlug);
    if (existing) {
      existing.count += 1;
      if (r.region && !existing.regions.includes(r.region)) existing.regions.push(r.region);
    } else {
      byState.set(r.stateSlug, {
        stateSlug: r.stateSlug,
        state: r.state,
        count: 1,
        regions: r.region ? [r.region] : [],
      });
    }
  }
  return [...byState.values()].sort(
    (a, b) => b.count - a.count || a.state.localeCompare(b.state, locale)
  );
}

/**
 * State name → its tours hub path, keyed by `"<country display name>|<state>"`.
 *
 * Lets the coverage page — which knows 980 states and nothing about tours —
 * link the handful that already have routes. Both sides read `attractions.state`
 * from the same database, so the raw names match exactly and no slug
 * normalisation is needed on the coverage side.
 *
 * Must be called on the SERVER and its result passed down: the coverage list is
 * a client component, and importing this module there would ship the whole route
 * snapshot to the browser.
 */
export function getStateHubPaths(locale: string): Record<string, string> {
  const paths: Record<string, string> = {};
  for (const r of getRoutesForLocale(locale)) {
    if (!r.state || !r.stateSlug) continue;
    paths[`${getCountryDisplayName(r.country)}|${r.state}`] =
      `/${locale}/tours/${r.countrySlug}/state/${r.stateSlug}`;
  }
  return paths;
}

/** Routes of one state, eligible for `locale`, richest first. */
export function getRoutesByState(
  countrySlug: string,
  stateSlug: string,
  locale: string
): RouteSnapshot[] {
  return getRoutesByCountry(countrySlug, locale)
    .filter((r) => r.stateSlug === stateSlug)
    .sort((a, b) => b.stops.length - a.stops.length);
}

/** Routes within one country eligible for `locale`. */
export function getRoutesByCountry(
  countrySlug: string,
  locale: string
): RouteSnapshot[] {
  return getRoutesForLocale(locale).filter((r) => r.countrySlug === countrySlug);
}

/**
 * Other routes near this one: same region first, then same state, then the rest
 * of the country. Region alone is too fine a net — "Conservatória" has two
 * routes — so a second ring keeps the block genuinely useful.
 */
export function relatedRoutes(
  route: RouteSnapshot,
  locale: string,
  n = 3
): RouteSnapshot[] {
  const sameCountry = getRoutesByCountry(route.countrySlug, locale).filter(
    (r) => r.slug !== route.slug
  );
  const rank = (r: RouteSnapshot) => {
    if (route.region && r.region === route.region) return 0;
    if (route.stateSlug && r.stateSlug === route.stateSlug) return 1;
    return 2;
  };
  return [...sameCountry]
    .sort((a, b) => rank(a) - rank(b) || b.stops.length - a.stops.length)
    .slice(0, n);
}

/**
 * Locale content for a route, falling back to the first available locale for
 * any missing fields. Use only AFTER confirming the route is eligible for the
 * locale (i.e. locale ∈ route.locales) — never to manufacture a page.
 */
export function pickLocaleContent(
  route: RouteSnapshot,
  locale: string
): RouteLocaleContent {
  return (
    route.i18n[locale] ??
    route.i18n[route.locales[0]] ?? {
      name: route.slug,
      description: "",
      audioUrl: null,
    }
  );
}

/**
 * Stop audio/text is keyed by DIALECT (en, es, pt-br, pt-pt, it). Map the unified
 * site locale → audio dialect: for "pt" pick the route's country dialect
 * (Portugal → pt-pt, else pt-br).
 */
export function siteLocaleToAudioLang(
  locale: string,
  countrySlug: string
): string {
  if (locale === "pt") return countrySlug === "portugal" ? "pt-pt" : "pt-br";
  return locale;
}

/** Short labels for the audio-language chips in the multi-language player. */
export const AUDIO_LANG_LABELS: Record<string, string> = {
  en: "EN",
  es: "ES",
  "pt-br": "PT-BR",
  "pt-pt": "PT-PT",
  it: "IT",
};
const AUDIO_LANG_ORDER = ["en", "es", "pt-br", "pt-pt", "it"];

export interface StopAudio {
  lang: string;
  label: string;
  audioUrl: string;
}

/**
 * Primary stop content for the page locale (its dialect), with same-family
 * fallback (pt-pt ↔ pt-br) — never across languages, so an English page never
 * shows Portuguese text. Returns null when there's no content → name-only stop.
 */
export function pickStopContent(
  stop: RouteStop,
  locale: string,
  countrySlug: string
): RouteStopLocaleContent | null {
  const audioLang = siteLocaleToAudioLang(locale, countrySlug);
  if (stop.i18n[audioLang]) return stop.i18n[audioLang];
  const base = audioLang.split("-")[0];
  const sameFamily = Object.keys(stop.i18n).find(
    (k) => k.split("-")[0] === base
  );
  return sameFamily ? stop.i18n[sameFamily] : null;
}

/** All available audio languages for a stop (for the multi-language player). */
export function stopAudios(stop: RouteStop): StopAudio[] {
  return AUDIO_LANG_ORDER.flatMap((lang) => {
    const c = stop.i18n[lang];
    return c?.audioUrl
      ? [{ lang, label: AUDIO_LANG_LABELS[lang] ?? lang.toUpperCase(), audioUrl: c.audioUrl }]
      : [];
  });
}
