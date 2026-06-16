/**
 * View helpers for tour pages — build hrefs, language labels and card
 * view-models from a RouteSnapshot. Keeps the page components declarative.
 */
import type { RouteCardVM } from "@/components/blocks/RouteCard";
import { pickLocaleContent, type RouteSnapshot } from "@/lib/routes";
import { formatDistance, formatDuration } from "@/lib/tourFormat";

/**
 * Autonyms — language names shown in their own language.
 * Includes both site locales (en/es/pt/it, used for route-card language chips)
 * and audio dialects (pt-br/pt-pt, used by the multi-language audio player).
 */
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  it: "Italiano",
  "pt-br": "Português (BR)",
  "pt-pt": "Português (PT)",
};

export function languageLabelsFor(locales: string[]): string[] {
  return locales.map((l) => LANGUAGE_LABELS[l] ?? l.toUpperCase());
}

/** Locale-prefixed path to a route detail page. */
export function routeHref(locale: string, route: RouteSnapshot): string {
  return `/${locale}/tours/${route.countrySlug}/${route.slug}`;
}

/** Locale-prefixed path to a country hub. */
export function countryHref(locale: string, countrySlug: string): string {
  return `/${locale}/tours/${countrySlug}`;
}

export function toRouteCardVM(route: RouteSnapshot, locale: string): RouteCardVM {
  const content = pickLocaleContent(route, locale);
  return {
    href: routeHref(locale, route),
    name: content.name,
    region: route.region,
    country: route.country,
    stopsCount: route.stops.length,
    durationStr: formatDuration(route.durationS),
    languageLabels: languageLabelsFor(route.locales),
  };
}

/** Localised distance + duration for a route (re-exported convenience). */
export function routeFacts(route: RouteSnapshot, locale: string) {
  return {
    distanceStr: formatDistance(route.distanceM, locale),
    durationStr: formatDuration(route.durationS),
  };
}
