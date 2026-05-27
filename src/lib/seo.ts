/**
 * SEO helpers — single source of truth for hreflang, canonical and OpenGraph.
 *
 * Locale strategy (next-intl localePrefix="always"):
 *   - every locale, INCLUDING the default "en", is served under its prefix
 *   - canonical for "en" is "/en", for "pt-br" is "/pt-br", etc.
 *   - non-prefixed paths (e.g. "/drive") 404, so every emitted URL is prefixed
 */
import { routing } from "@/i18n/routing";

const BASE_URL = "https://www.tuggi.app";

/**
 * Returns the canonical path for a given locale + page path.
 *
 * Every locale is prefixed (localePrefix="always"), including the default,
 * because non-prefixed paths 404.
 *
 * @example
 *   localePath("en",    "")               // "/en"
 *   localePath("es",    "")               // "/es"
 *   localePath("en",    "drive")          // "/en/drive"
 *   localePath("pt-br", "enterprise/city-os") // "/pt-br/enterprise/city-os"
 */
function localePath(locale: string, pagePath: string): string {
  const clean = pagePath.replace(/^\//, "").replace(/\/$/, "");
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

/**
 * Builds the `alternates` object for Next.js Metadata.
 *
 * @param locale   - Current page locale (e.g. "en", "pt-br")
 * @param pagePath - Path WITHOUT locale prefix (e.g. "", "drive", "trust-center/privacy-policy")
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
 * @param pagePath - Path WITHOUT locale prefix (e.g. "", "drive", "enterprise/city-os")
 *
 * @example
 *   buildSitemapAlternates("drive")
 *   // {
 *   //   "en":        "https://www.tuggi.app/en/drive",
 *   //   "es":        "https://www.tuggi.app/es/drive",
 *   //   "pt-br":     "https://www.tuggi.app/pt-br/drive",
 *   //   "pt-pt":     "https://www.tuggi.app/pt-pt/drive",
 *   //   "x-default": "https://www.tuggi.app/en/drive",
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
