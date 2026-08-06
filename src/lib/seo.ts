/**
 * SEO helpers — single source of truth for hreflang, canonical and OpenGraph.
 *
 * Locale strategy (next-intl localePrefix="always"):
 *   - every locale, INCLUDING the default "en", is served under its prefix
 *   - canonical for "en" is "/en", for "pt" is "/pt", etc.
 *   - non-prefixed paths (e.g. "/drive") 404, so every emitted URL is prefixed
 *
 * Every function here takes the **internal** pathname — the key of the route
 * map in src/i18n/pathnames.ts — and resolves the public slug per locale from
 * that map. It used to build all four hreflang URLs out of one string, which
 * was correct only while every locale shared a slug: with a translated slug,
 * `buildAlternates("pt", "partners/car-rental")` would have emitted
 * `/pt/partners/car-rental`, a URL that 404s, and the four language versions
 * of every new page would have pointed at each other with the wrong address —
 * the classic way to lose all four at once.
 *
 * A pathname the map does not declare passes through unchanged, so every
 * caller that builds a path at runtime (`tours/<country>/<slug>`) keeps
 * working: those live under a route whose slug is not translated.
 */
import { routing } from "@/i18n/routing";
import { localizedPathname } from "@/i18n/pathnames";

const BASE_URL = "https://www.tuggi.app";

/**
 * Returns the canonical path for a given locale + internal page path.
 *
 * Every locale is prefixed (localePrefix="always"), including the default,
 * because non-prefixed paths 404.
 *
 * @example
 *   localePath("en", "")             // "/en"
 *   localePath("es", "")             // "/es"
 *   localePath("en", "drive")        // "/en/drive"
 *   localePath("pt", "destinations") // "/pt/destinos"
 *   localePath("it", "technology")   // "/it/tecnologia"
 */
function localePath(locale: string, pagePath: string): string {
  const localized = localizedPathname(locale, pagePath);
  return localized === "/" ? `/${locale}` : `/${locale}${localized}`;
}

/**
 * Builds the `alternates` object for Next.js Metadata.
 *
 * @param locale   - Current page locale (e.g. "en", "pt")
 * @param pagePath - INTERNAL path, without locale prefix (e.g. "", "drive",
 *                   "destinations", "trust-center/privacy-policy")
 */
export function buildAlternates(locale: string, pagePath = "") {
  const languages: Record<string, string> = {};

  for (const loc of routing.locales) {
    languages[loc] = localePath(loc, pagePath);
  }
  // x-default → default locale (en)
  languages["x-default"] = localePath(routing.defaultLocale, pagePath);

  return {
    canonical: localePath(locale, pagePath),
    languages,
  };
}

/**
 * Like `buildAlternates`, but restricts the hreflang `languages` to the set of
 * locales that actually exist for this page (e.g. a route only translated into
 * some locales). Prevents emitting hreflang to URLs that would 404.
 *
 * - `canonical` is self-referential (the current locale's URL).
 * - `languages` lists only `availableLocales` (+ x-default → defaultLocale if
 *   present, otherwise the first available locale).
 *
 * @param locale           - Current page locale
 * @param pagePath          - INTERNAL path, without locale prefix (e.g. "tours/portugal/sintra-...")
 * @param availableLocales - Locales for which this exact page is generated
 */
export function buildAlternatesFor(
  locale: string,
  pagePath: string,
  availableLocales: string[]
) {
  const languages: Record<string, string> = {};
  for (const loc of availableLocales) {
    languages[loc] = localePath(loc, pagePath);
  }
  const xDefault = availableLocales.includes(routing.defaultLocale)
    ? routing.defaultLocale
    : availableLocales[0];
  if (xDefault) languages["x-default"] = localePath(xDefault, pagePath);

  return {
    canonical: localePath(locale, pagePath),
    languages,
  };
}

/**
 * Sitemap-flavoured variant of `buildAlternatesFor` — absolute URLs, limited to
 * `availableLocales` (+ x-default).
 */
export function buildSitemapAlternatesFor(
  pagePath: string,
  availableLocales: string[]
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of availableLocales) {
    languages[loc] = `${BASE_URL}${localePath(loc, pagePath)}`;
  }
  const xDefault = availableLocales.includes(routing.defaultLocale)
    ? routing.defaultLocale
    : availableLocales[0];
  if (xDefault) languages["x-default"] = `${BASE_URL}${localePath(xDefault, pagePath)}`;
  return languages;
}

/**
 * Builds a consistent `openGraph` metadata object.
 */
export function buildOpenGraph({
  title,
  description,
  locale,
  pagePath = "",
  siteName = "TUGGI",
  image = "/images/og-image-tuggi.jpg",
  imageAlt = "TUGGI",
}: {
  title: string;
  description: string;
  locale: string;
  pagePath?: string;
  siteName?: string;
  image?: string;
  imageAlt?: string;
}) {
  return {
    title,
    description,
    url: `${BASE_URL}${localePath(locale, pagePath)}`,
    siteName,
    type: "website" as const,
    images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
  };
}

/**
 * Builds a consistent `twitter` metadata object.
 */
export function buildTwitterCard({
  title,
  description,
  image = "/images/og-image-tuggi.jpg",
}: {
  title: string;
  description: string;
  image?: string;
}) {
  return {
    card: "summary_large_image" as const,
    title,
    description,
    images: [image],
  };
}

/** Standard robots for all indexable pages. */
export const defaultRobots = { index: true, follow: true } as const;

/**
 * Builds absolute-URL alternates for the XML sitemap.
 * Values are full URLs (unlike `buildAlternates` which uses relative paths for metadata).
 *
 * @param pagePath - INTERNAL path, without locale prefix (e.g. "", "drive",
 *                   "destinations")
 *
 * @example
 *   buildSitemapAlternates("destinations")
 *   // {
 *   //   "en":        "https://www.tuggi.app/en/destinations",
 *   //   "es":        "https://www.tuggi.app/es/destinos",
 *   //   "pt":        "https://www.tuggi.app/pt/destinos",
 *   //   "it":        "https://www.tuggi.app/it/destinazioni",
 *   //   "x-default": "https://www.tuggi.app/en/destinations",
 *   // }
 */
export function buildSitemapAlternates(pagePath = ""): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${BASE_URL}${localePath(loc, pagePath)}`;
  }
  languages["x-default"] = `${BASE_URL}${localePath(routing.defaultLocale, pagePath)}`;
  return languages;
}

/**
 * Returns the absolute URL for a given locale + page path.
 * Useful for sitemap entries.
 */
export function buildUrl(locale: string, pagePath = ""): string {
  return `${BASE_URL}${localePath(locale, pagePath)}`;
}
