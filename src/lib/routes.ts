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
import { localizedCountryName } from "@/lib/countryNames";

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

/** Routes within one country eligible for `locale`. */
export function getRoutesByCountry(
  countrySlug: string,
  locale: string
): RouteSnapshot[] {
  return getRoutesForLocale(locale).filter((r) => r.countrySlug === countrySlug);
}

/** Other routes in the same country (then region) eligible for `locale`. */
export function relatedRoutes(
  route: RouteSnapshot,
  locale: string,
  n = 3
): RouteSnapshot[] {
  const sameCountry = getRoutesByCountry(route.countrySlug, locale).filter(
    (r) => r.slug !== route.slug
  );
  const sameRegion = sameCountry.filter((r) => r.region === route.region);
  const rest = sameCountry.filter((r) => r.region !== route.region);
  return [...sameRegion, ...rest].slice(0, n);
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
