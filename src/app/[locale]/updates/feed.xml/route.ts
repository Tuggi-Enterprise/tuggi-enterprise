/**
 * The RSS feed of the editorial section.
 *
 * **One feed per locale**, and that is a decision this card took: the spec
 * fixes the slug of the section per language and says nothing about a feed, and
 * the four locales are four listings — an article exists in a language only if
 * the file of that language exists (`DS-COPY-047`). A single feed would have to
 * pick one language for a reader who already told us his in the URL.
 *
 * **The address is the INTERNAL path, `/{locale}/updates/feed.xml`, and the
 * section word is not translated in it** — measured, not chosen: the
 * middleware matcher is `/((?!api|_next|_vercel|.*\\..*).*)`, so any path
 * carrying a dot never reaches next-intl and is never rewritten.
 * `/pt/novidades/feed.xml` therefore 404s, and would have 404'd silently in
 * three of the four languages. It puts the feed alongside `/sitemap.xml`,
 * `/robots.txt` and `/llms.txt`, none of which is localized either — every
 * machine-readable file of this site lives at one untranslated address.
 *
 * Static, like everything else here: the content is files in the repository.
 */
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { SiteLocale } from "@/i18n/locales";
import { buildLeafUrl, buildUrl } from "@/lib/seo";
import { UPDATES_SECTION, listUpdates, updatesFeedPath } from "@/lib/updates";
import { SITE_URL } from "@/lib/app-meta";

export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The five characters XML reserves. A title with an ampersand in it is not an
 *  edge case; it is the first apostrophe someone types. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Updates.seo" });

  const sectionUrl = buildUrl(locale, UPDATES_SECTION);
  const selfUrl = `${SITE_URL}${updatesFeedPath(locale)}`;
  const documents = listUpdates(locale as SiteLocale);

  const items = documents
    .map((document) => {
      const url = buildLeafUrl(document.locale, UPDATES_SECTION, document.slug);
      return [
        "    <item>",
        `      <title>${escapeXml(document.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        // The URL is the identifier: an article's address is stable, and the
        // internal id is deliberately never public.
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${new Date(`${document.publishedAt}T00:00:00Z`).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(document.summary)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(t("title"))}</title>`,
    `    <link>${escapeXml(sectionUrl)}</link>`,
    `    <description>${escapeXml(t("description"))}</description>`,
    `    <language>${escapeXml(locale)}</language>`,
    `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
