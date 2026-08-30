import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { SiteLocale } from "@/i18n/locales";
import { localizedPathname } from "@/i18n/pathnames";
import {
  buildAlternates,
  buildLeafPath,
  buildOpenGraph,
  buildTwitterCard,
  buildUrl,
  defaultRobots,
} from "@/lib/seo";
import {
  UPDATES_SECTION,
  formatUpdateDate,
  listUpdates,
  updatesFeedPath,
} from "@/lib/updates";
import { UpdateGrid } from "@/components/blocks/UpdateGrid";
import type { UpdateCardVM } from "@/components/blocks/UpdateCard";

/**
 * The editorial listing — spec §4.
 *
 * `force-static`, like `trust-center/layout.tsx`: the content is files in the
 * repository, so there is no fetch at request time, no loading state and no
 * skeleton. An invalid frontmatter does not produce an error page — it stops
 * the build (`src/lib/updates.ts`).
 *
 * Nothing sits below the grid. The download CTA lives at the end of an
 * **article**, where the reader has just been given something; a listing is not
 * a conversion surface (§4.1, `DS-COMPONENTE-058`).
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Updates.seo" });

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: {
      ...buildAlternates(locale, UPDATES_SECTION),
      // The feed is per locale, so it is discovered from the listing of that
      // locale and nowhere else — a `<link>` in the head is the only way a
      // reader's client finds it.
      types: { "application/rss+xml": [{ url: updatesFeedPath(locale), title }] },
    },
    robots: defaultRobots,
    openGraph: buildOpenGraph({
      title,
      description,
      locale,
      pagePath: UPDATES_SECTION,
      imageAlt: t("ogImageAlt"),
    }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function UpdatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Updates" });
  const listing = listUpdates(locale as SiteLocale);

  const items: UpdateCardVM[] = listing.map((document) => ({
    href: buildLeafPath(document.locale, UPDATES_SECTION, document.slug),
    slug: document.slug,
    title: document.title,
    summary: document.summary,
    type: document.type,
    publishedAt: document.publishedAt,
    publishedLabel: formatUpdateDate(document.publishedAt, document.locale),
    cover: document.cover,
    coverAlt: document.coverAlt,
  }));

  // The way out of an empty locale is the section in English — and only when
  // English actually has something, because a link to a second empty page is
  // worse than no link.
  const fallbackHref =
    !items.length && listUpdates(routing.defaultLocale).length
      ? `/${routing.defaultLocale}${localizedPathname(routing.defaultLocale, UPDATES_SECTION)}`
      : null;

  const pageUrl = buildUrl(locale, UPDATES_SECTION);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#webpage`,
        "url": pageUrl,
        "name": t("seo.title"),
        "description": t("seo.description"),
        "inLanguage": locale,
        "isPartOf": { "@id": "https://www.tuggi.app/#website" },
        "publisher": { "@id": "https://www.tuggi.app/#organization" },
        "breadcrumb": { "@id": `${pageUrl}#breadcrumb` },
        // Only what this locale publishes: the listing is per locale, and a
        // graph that named the Portuguese pieces on the Italian page would be
        // structured data contradicting the page it describes.
        "hasPart": items.map((item) => ({
          "@type": "BlogPosting",
          "@id": `https://www.tuggi.app${item.href}#article`,
          "headline": item.title,
          "url": `https://www.tuggi.app${item.href}`,
          "datePublished": item.publishedAt,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "TUGGI", "item": "https://www.tuggi.app" },
          { "@type": "ListItem", "position": 2, "name": t("title"), "item": pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="page-shell py-16 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* No eyebrow pill above the `h1`: the pill, the heading and the subtitle
          would say the same thing three times, which is the defect the /tours
          hub already has (§4.1). */}
      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-black text-tuggi-dark tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-tuggi-slate">{t("subtitle")}</p>
      </header>

      <UpdateGrid items={items} fallbackHref={fallbackHref} />
    </div>
  );
}
