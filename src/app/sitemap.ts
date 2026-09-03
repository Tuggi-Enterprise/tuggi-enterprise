import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import type { StaticAppPathname } from "@/i18n/pathnames";
import {
  buildUrl,
  buildLeafUrl,
  buildSitemapAlternates,
  buildSitemapAlternatesFor,
  buildSitemapAlternatesForLeaf,
} from "@/lib/seo";
import { UPDATES_SECTION, getUpdateArticles, slugsByLocale } from "@/lib/updates";
import { listApprovedPartners } from "@/lib/partner";
import {
  getAllRoutes,
  getCountriesForLocale,
  getGeneratedAt,
  getRoutesByCountry,
  getRoutesByState,
} from "@/lib/routes";

/**
 * XML Sitemap
 *
 * URL strategy mirrors the canonical rules in src/lib/seo.ts (localePrefix="always"):
 *   - every locale is prefixed, incl. the default → https://www.tuggi.app/en/drive
 *   - other locales                               → https://www.tuggi.app/es/drive
 *
 * Each entry includes <xhtml:link rel="alternate" hreflang="..."> for all
 * 4 locales + x-default, so Google can map translations from any entry.
 *
 * Exception: partner pages (/d/<slug>) are intentionally locale-agnostic
 * (resolved via a middleware rewrite), so they get a single clean URL.
 */

/**
 * The static pages that are indexed, as **internal** pathnames.
 *
 * The list stays explicit because which pages we ask Google to index is an
 * editorial decision, not a consequence of a route existing — the reserved
 * segment routes have their word decided and no page, and the trust-center
 * pages we deliberately do not all list. What is no longer written twice is
 * the URL: `buildUrl` and `buildSitemapAlternates` resolve the slug per locale
 * from src/i18n/pathnames.ts, so a translated slug reaches the sitemap without
 * anybody retyping it. The type makes a route that left the map a compile
 * error, and tests/e2e/routing.spec.ts asserts none of these 404.
 *
 * `/partners` joined with #195. It is the entrance for the audience that
 * arrives from a search for a partner program rather than for a destination,
 * and leaving a published page out of the sitemap is how it stays unfound.
 */
const routes: StaticAppPathname[] = [
  "/",
  "/drive",
  "/destinations",
  "/partners",
  "/enterprise/fleets",
  "/technology",
  "/purpose",
  "/contact",
  "/trust-center/accessibility",
  // The editorial section. It is deliberately out of the main menu
  // (DS-LAYOUT-011), so the sitemap and /llms.txt are two of its four doors —
  // leaving it out is how a published section stays unfound.
  "/updates",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    const alternates = { languages: buildSitemapAlternates(route) };

    for (const locale of routing.locales) {
      entries.push({
        url: buildUrl(locale, route),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: route === "/" ? 1 : 0.8,
        alternates,
      });
    }
  }

  // ── Editorial articles ────────────────────────────────────────────────────
  // One entry per (article × locale the article exists in), and the hreflang
  // set comes from the registry, never from `buildSitemapAlternates`: the leaf
  // is translated and the route map only knows the section, so a path built as
  // `updates/<slug>` would list one language's leaf under all four prefixes
  // (DS-COMPONENTE-057). A locale with no translation is simply absent — an
  // alternate pointing at a piece that is not there is the same loss.
  for (const article of getUpdateArticles()) {
    const leaves = slugsByLocale(article.id);
    const alternates = { languages: buildSitemapAlternatesForLeaf(UPDATES_SECTION, leaves) };
    for (const [locale, leaf] of Object.entries(leaves)) {
      entries.push({
        url: buildLeafUrl(locale, UPDATES_SECTION, leaf),
        lastModified: new Date(`${article.publishedAt}T00:00:00Z`),
        changeFrequency: "yearly",
        priority: 0.6,
        alternates,
      });
    }
  }

  // ── Self-guided audio tour pages (from the static snapshot, no DB) ─────────
  const snapshotDate = (() => {
    const d = new Date(getGeneratedAt());
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  // Global hub — emitted only for locales that actually have routes; hreflang
  // limited to those locales (so we never point to an empty/noindex hub).
  const hubLocales = routing.locales.filter(
    (loc) => getCountriesForLocale(loc).length > 0
  );
  const hubAlternates = { languages: buildSitemapAlternatesFor("tours", hubLocales) };
  for (const locale of hubLocales) {
    entries.push({
      url: buildUrl(locale, "tours"),
      lastModified: snapshotDate,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: hubAlternates,
    });
  }

  // Country hubs — one per (country × locale-with-routes), hreflang limited.
  const countrySlugs = new Set(getAllRoutes().map((r) => r.countrySlug));
  for (const countrySlug of countrySlugs) {
    const localesForCountry = routing.locales.filter(
      (loc) => getRoutesByCountry(countrySlug, loc).length > 0
    );
    const alternates = {
      languages: buildSitemapAlternatesFor(`tours/${countrySlug}`, localesForCountry),
    };
    for (const locale of localesForCountry) {
      entries.push({
        url: buildUrl(locale, `tours/${countrySlug}`),
        lastModified: snapshotDate,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates,
      });
    }
  }

  // State hubs — /tours/<country>/state/<state>, only where the data has a state
  // layer at all. A hub holding one route is noindex on the page itself, so it
  // stays out of here too.
  const stateKeys = new Set(
    getAllRoutes()
      .filter((r) => r.stateSlug)
      .map((r) => `${r.countrySlug}|${r.stateSlug}`)
  );
  for (const key of stateKeys) {
    const [countrySlug, stateSlug] = key.split("|");
    const localesForState = routing.locales.filter(
      (loc) => getRoutesByState(countrySlug, stateSlug, loc).length > 1
    );
    if (!localesForState.length) continue;
    const pagePath = `tours/${countrySlug}/state/${stateSlug}`;
    const alternates = { languages: buildSitemapAlternatesFor(pagePath, localesForState) };
    for (const locale of localesForState) {
      entries.push({
        url: buildUrl(locale, pagePath),
        lastModified: snapshotDate,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates,
      });
    }
  }

  // Route detail pages — one per (route × eligible locale), hreflang limited to
  // the route's available locales.
  for (const route of getAllRoutes()) {
    const pagePath = `tours/${route.countrySlug}/${route.slug}`;
    const alternates = { languages: buildSitemapAlternatesFor(pagePath, route.locales) };
    const routeDate = route.updatedAt ? new Date(route.updatedAt) : snapshotDate;
    const lastModified = isNaN(routeDate.getTime()) ? snapshotDate : routeDate;
    for (const locale of route.locales) {
      entries.push({
        url: buildUrl(locale, pagePath),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates,
      });
    }
  }

  // Partner download pages: one clean, locale-agnostic URL per approved partner.
  // The list itself is `listApprovedPartners()` (src/lib/partner.ts) — the same
  // one `/d/[slug]/opengraph-image` pre-renders its share cards from, so a URL
  // submitted here always has a card built for it. It answers `[]` rather than
  // throwing when the DB is unreachable: a hiccup costs this section, never the
  // build.
  for (const partner of await listApprovedPartners()) {
    entries.push({
      // Clean, locale-agnostic URL (matches the page's self-canonical) —
      // NOT buildUrl(), which would prefix it with a locale.
      url: `https://www.tuggi.app/d/${partner.slug}`,
      lastModified: partner.updatedAt ? new Date(partner.updatedAt) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
