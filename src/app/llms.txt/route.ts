import { SITE_URL, APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { CONTENT_LANGUAGES } from "@/lib/product-facts";
import {
  getAllRoutes,
  getStatesForCountry,
  pickLocaleContent,
  type RouteSnapshot,
} from "@/lib/routes";
import { formatDistance, formatDuration } from "@/lib/tourFormat";
import { UPDATES_SECTION, getUpdateArticles } from "@/lib/updates";
import { buildLeafUrl } from "@/lib/seo";
import { localizedPathname } from "@/i18n/pathnames";

// /llms.txt — an LLM-friendly map of the site (https://llmstxt.org/).
// English, locale-prefixed canonical links (the site serves localePrefix="always").
export const dynamic = "force-static";

/**
 * Every route is listed by name, place and hard facts.
 *
 * Pointing at /en/tours alone told an assistant that Tuggi has audio tours; it
 * could not name one. Listing them is the difference between being mentioned
 * and being cited with the product. Generated from the snapshot, so it follows
 * `npm run update-routes` and never drifts into a hand-maintained list.
 */
function routeLine(route: RouteSnapshot): string {
  // Link a locale the route is actually published in — /en would 404 for a
  // route with no English content.
  const locale = route.locales.includes("en") ? "en" : route.locales[0];
  const { name } = pickLocaleContent(route, locale);
  // A city and its state often share a name ("Rio de Janeiro, Rio de Janeiro").
  const place = [...new Set([route.region, route.state, route.country].filter(Boolean))].join(", ");
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const facts = [
    formatDuration(route.durationS),
    formatDistance(route.distanceM, "en"),
    plural(route.stops.length, "stop"),
    plural(route.locales.length, "language"),
  ]
    .filter(Boolean)
    .join(", ");
  return `- [${name}](${SITE_URL}/${locale}/tours/${route.countrySlug}/${route.slug}): ${place} — ${facts}`;
}

function routesSection(): string {
  const routes = getAllRoutes();
  if (!routes.length) return "";

  const countries = [...new Set(routes.map((r) => r.countrySlug))].sort();
  const blocks = countries.map((countrySlug) => {
    const inCountry = routes.filter((r) => r.countrySlug === countrySlug);
    const countryName = inCountry[0].country;
    const header = `### ${countryName} (${inCountry.length} routes)\n- [All routes in ${countryName}](${SITE_URL}/en/tours/${countrySlug})`;

    // Same rule the country hub uses: group by state only where that layer
    // exists in the data.
    const states = getStatesForCountry(countrySlug, "en");
    if (!states.length) {
      return `${header}\n${inCountry.map(routeLine).join("\n")}`;
    }
    const grouped = states.map((s) => {
      const list = inCountry.filter((r) => r.stateSlug === s.stateSlug);
      return `\n**${s.state}** (${list.length})\n${list.map(routeLine).join("\n")}`;
    });
    const ungrouped = inCountry.filter((r) => !r.stateSlug);
    return (
      header +
      grouped.join("\n") +
      (ungrouped.length ? `\n\n${ungrouped.map(routeLine).join("\n")}` : "")
    );
  });

  return `\n## Audio tour routes\n\nEach route page carries a map, the ordered stops with real audio previews, duration, distance, accessibility and the languages it is narrated in.\n\n${blocks.join("\n\n")}\n`;
}

/**
 * The editorial record — news and release notes.
 *
 * Same construction as `routeLine`: one line per piece, linking the locale it
 * is actually published in (`/en` would 404 for an article with no English
 * translation), with the fact after the colon. This file is the only surface of
 * the site designed to be read by an agent, so the section is born in it or it
 * is born invisible — an assistant asked "what changed in Tuggi" answers from
 * here or does not answer.
 */
function updateLine(article: ReturnType<typeof getUpdateArticles>[number]): string {
  const document = article.byLocale.en ?? Object.values(article.byLocale)[0];
  const url = buildLeafUrl(document.locale, UPDATES_SECTION, document.slug);
  const kind = article.type === "release" ? "release note" : "product news";
  return `- [${document.title}](${url}): ${kind}, ${article.publishedAt} — ${document.summary}`;
}

function updatesSection(): string {
  const articles = getUpdateArticles();
  if (!articles.length) return "";
  const section = `${SITE_URL}/en${localizedPathname("en", UPDATES_SECTION)}`;
  return `\n## Updates\n\nWhat changed in the app, when it changed, and what happens to what a traveller already bought.\n\n- [All updates](${section}): the full record, newest first\n${articles
    .map(updateLine)
    .join("\n")}\n`;
}

export function GET() {
  const body = `# TUGGI

> TUGGI is a self-guided audio travel guide app (iOS & Android). Audio stories about the places around you trigger automatically by GPS as you drive, walk, or cycle — screen-off and offline. Free to start, available in ${CONTENT_LANGUAGES} languages with synchronized closed captions.

Key facts:
- Category: travel app / self-guided audio tours / cultural audio guide
- Platforms: iOS and Android — free to download
- Passes: optional Tuggi Passes of 10, 25 or 45 hours of use — one-time purchase, the hours do not expire
- Works offline; audio triggers automatically by location; ${CONTENT_LANGUAGES} languages with captions
- Not a navigation app — it runs alongside your GPS and music and narrates the places you pass
- App Store: ${APP_STORE_URL}
- Google Play: ${PLAY_STORE_URL}

## Main pages
- [Home](${SITE_URL}/en): What TUGGI is and how it works
- [Download / Drive](${SITE_URL}/en/drive): Features, pricing, FAQ, and app download
- [Audio Tours](${SITE_URL}/en/tours): Self-guided audio tour routes by destination — each route page has a map, the ordered stops, real audio previews, duration, accessibility and languages
- [Global Coverage](${SITE_URL}/en/coverage): Countries and number of attractions covered (live stats)
- [Technology](${SITE_URL}/en/technology): How the location-triggered audio engine works
- [Purpose](${SITE_URL}/en/purpose): Mission and accessibility

${routesSection()}
${updatesSection()}
## For businesses
- [Destinations](${SITE_URL}/en/destinations): For cities and tourism boards
- [Fleets](${SITE_URL}/en/enterprise/fleets): For car-rental and mobility fleets
- [Contact](${SITE_URL}/en/contact): Talk to the team

## Trust & legal
- [Privacy Policy](${SITE_URL}/en/trust-center/privacy-policy)
- [Terms of Use](${SITE_URL}/en/trust-center/terms-of-use)
- [Accessibility](${SITE_URL}/en/trust-center/accessibility)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
