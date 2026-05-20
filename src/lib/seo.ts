/**
 * SEO helpers — single source of truth for hreflang, canonical and OpenGraph.
 *
 * Locale strategy (next-intl "as-needed" prefix):
 *   - "en" (defaultLocale) → served at root, no prefix → canonical "/"
 *   - every other locale   → served at "/{locale}"      → canonical "/{locale}"
 */
import { routing } from "@/i18n/routing";

const BASE_URL = "https://tuggi.app";

/**
 * Returns the canonical path for a given locale + page path.
 *
 * @example
 *   localePath("en",    "")               // "/"
 *   localePath("es",    "")               // "/es"
 *   localePath("en",    "drive")          // "/drive"
 *   localePath("pt-br", "enterprise/city-os") // "/pt-br/enterprise/city-os"
 */
function localePath(locale: string, pagePath: string): string {
  const clean = pagePath.replace(/^\//, "").replace(/\/$/, "");
  const isDefault = locale === routing.defaultLocale;

  if (isDefault) {
    return clean ? `/${clean}` : "/";
  }
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
