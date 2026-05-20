import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { buildUrl, buildSitemapAlternates } from "@/lib/seo";

/**
 * XML Sitemap
 *
 * URL strategy mirrors the canonical rules in src/lib/seo.ts:
 *   - "en" (defaultLocale) → no prefix  → https://www.tuggi.app/drive
 *   - other locales         → prefixed   → https://www.tuggi.app/es/drive
 *
 * Each entry includes <xhtml:link rel="alternate" hreflang="..."> for all
 * 4 locales + x-default, so Google can map translations from any entry.
 */

const routes = [
  "",                          // home
  "drive",
  "enterprise/city-os",
  "enterprise/fleets",
  "technology",
  "purpose",
  "contact",
  "trust-center/accessibility",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    const alternates = { languages: buildSitemapAlternates(route) };

    for (const locale of routing.locales) {
      entries.push({
        url: buildUrl(locale, route),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: route === "" ? 1 : 0.8,
        alternates,
      });
    }
  }

  return entries;
}
