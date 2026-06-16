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

/** Countries that have ≥1 route eligible for `locale`, with counts. */
export function getCountriesForLocale(locale: string): CountrySummary[] {
  const byCountry = new Map<string, CountrySummary>();
  for (const r of getRoutesForLocale(locale)) {
    const existing = byCountry.get(r.countrySlug);
    if (existing) existing.count += 1;
    else
      byCountry.set(r.countrySlug, {
        countrySlug: r.countrySlug,
        country: r.country,
        count: 1,
      });
  }
  return [...byCountry.values()].sort((a, b) =>
    a.country.localeCompare(b.country)
  );
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
 * Stop content for a locale. Falls back ONLY within the same language family
 * (e.g. pt-pt ↔ pt-br) — never across languages, so an English page never
 * shows Portuguese audio/description. Returns null when the page locale's
 * language has no content (the stop then renders as name-only).
 */
export function pickStopContent(
  stop: RouteStop,
  locale: string
): RouteStopLocaleContent | null {
  if (stop.i18n[locale]) return stop.i18n[locale];
  const base = locale.split("-")[0];
  const sameFamily = Object.keys(stop.i18n).find(
    (k) => k.split("-")[0] === base
  );
  return sameFamily ? stop.i18n[sameFamily] : null;
}
