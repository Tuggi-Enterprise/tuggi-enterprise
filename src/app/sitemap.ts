import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { buildUrl, buildSitemapAlternates, buildSitemapAlternatesFor } from "@/lib/seo";
import { getSupabaseServer } from "@/lib/supabase-server";
import { TUGGI_PARTNER_ID } from "@/lib/partner";
import {
  getAllRoutes,
  getCountriesForLocale,
  getGeneratedAt,
  getRoutesByCountry,
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
  // Wrapped in try/catch so a DB hiccup never fails the sitemap (and the build).
  try {
    const supabase = getSupabaseServer();
    const { data: partners } = await supabase
      .schema("core")
      .from("clients")
      .select("slug, updated_at")
      .eq("status", "approved")
      .not("slug", "is", null)
      .neq("id", TUGGI_PARTNER_ID);

    for (const p of partners ?? []) {
      if (!p.slug) continue;
      entries.push({
        // Clean, locale-agnostic URL (matches the page's self-canonical) —
        // NOT buildUrl(), which would prefix it with a locale.
        url: `https://www.tuggi.app/d/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("sitemap: failed to load partner slugs", err);
  }

  return entries;
}
