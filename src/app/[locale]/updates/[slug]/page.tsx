import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { SiteLocale } from "@/i18n/locales";
import { localizedPathname } from "@/i18n/pathnames";
import {
  buildAlternatesForLeaf,
  buildLeafPath,
  buildLeafUrl,
  buildOpenGraph,
  buildTwitterCard,
  defaultRobots,
} from "@/lib/seo";
import {
  UPDATES_SECTION,
  findUpdate,
  formatUpdateDate,
  listUpdates,
  pagerFor,
  slugsByLocale,
} from "@/lib/updates";
import { ArticleBody } from "@/components/blocks/article/ArticleBody";
import { ArticlePager } from "@/components/blocks/article/ArticlePager";
import { AppDownloadButton } from "@/components/blocks/AppDownloadButton";
import { UpdateCover } from "@/components/blocks/UpdateCover";
import { UpdateTypeBadge } from "@/components/blocks/UpdateTypeBadge";

/**
 * An editorial article — spec §5.
 *
 * The `[slug]` this page receives is the **public leaf of this locale**:
 * next-intl rewrites `/pt/novidades/passes-por-hora` to the internal
 * `/pt/updates/passes-por-hora` and carries the leaf through untranslated. So
 * the article is resolved from the registry by the pair (locale, slug), and
 * `dynamicParams = false` makes every other pair a 404 — which is how
 * `/pt/novidades/hour-passes` (an English leaf under the Portuguese section)
 * fails loudly instead of rendering the piece at an address nothing links to.
 */
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return listUpdates(params.locale as SiteLocale).map((document) => ({ slug: document.slug }));
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = findUpdate(locale as SiteLocale, slug);
  if (!article) return {};

  // THE hreflang OF AN ARTICLE COMES FROM THE REGISTRY — DS-COMPONENTE-057.
  // `buildAlternates(locale, "updates/" + slug)` would look right and be
  // wrong: `localizedPathname` translates the ancestor and carries the leaf,
  // so the Portuguese alternate of the English piece would be
  // `/pt/novidades/hour-passes`, a URL that 404s — published on all four
  // language versions at once.
  const alternates = buildAlternatesForLeaf(locale, UPDATES_SECTION, slugsByLocale(article.id));

  // The internal path, not the localized one: the generated route lives at
  // `[locale]/updates/[slug]/opengraph-image`, and the localized pattern
  // `/novidades/[slug]` matches one segment, not two.
  const cardUrl = `/${locale}/updates/${slug}/opengraph-image`;

  return {
    // The root template appends "| TUGGI"; the frontmatter title never names
    // the brand, or the served <title> would carry it twice.
    title: article.title,
    description: article.summary,
    alternates,
    robots: defaultRobots,
    openGraph: {
      ...buildOpenGraph({
        title: article.title,
        description: article.summary,
        locale,
        image: cardUrl,
        // The `alt` export of an `opengraph-image.tsx` is a static string and
        // never sees `params`, so keeping `openGraph.images` pointed at the
        // route URL is what lets the alt follow the locale (DS-COMPONENTE-056).
        imageAlt: article.ogAlt,
      }),
      url: buildLeafUrl(locale, UPDATES_SECTION, slug),
      type: "article",
      publishedTime: article.publishedAt,
    },
    twitter: buildTwitterCard({
      title: article.title,
      description: article.summary,
      image: cardUrl,
    }),
  };
}

export default async function UpdateArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = findUpdate(locale as SiteLocale, slug);
  if (!article) notFound();

  const t = await getTranslations({ locale, namespace: "Updates" });
  const listing = listUpdates(locale as SiteLocale);
  const { previous, next } = pagerFor(listing, slug);

  const sectionHref = `/${locale}${localizedPathname(locale, UPDATES_SECTION)}`;
  const pageUrl = buildLeafUrl(locale, UPDATES_SECTION, slug);
  const toLink = (neighbour: typeof previous) =>
    neighbour
      ? {
          href: buildLeafPath(neighbour.locale, UPDATES_SECTION, neighbour.slug),
          title: neighbour.title,
        }
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${pageUrl}#article`,
    "headline": article.title,
    "description": article.summary,
    "url": pageUrl,
    "mainEntityOfPage": { "@type": "WebPage", "@id": pageUrl },
    "datePublished": article.publishedAt,
    "dateModified": article.publishedAt,
    "inLanguage": locale,
    // The site speaks with one voice and signs with one entity — the same
    // `#organization` node the root layout already publishes. A per-article
    // `Person` author would be a claim about a byline the section does not have.
    "author": { "@id": "https://www.tuggi.app/#organization" },
    "publisher": { "@id": "https://www.tuggi.app/#organization" },
    "isPartOf": { "@id": "https://www.tuggi.app/#website" },
    "image": [`https://www.tuggi.app/${locale}/updates/${slug}/opengraph-image`],
  };

  return (
    <div className="page-shell py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* A `<article>`, not a `<main>`: the root layout already opens
          `<main id="main-content">`, and a second landmark of the same role
          inside it is the defect trust-center/layout.tsx corrected. */}
      <article>
        <header className="mx-auto max-w-3xl">
          {/* One link back, with the name of the section. Not a `Home ›`
              breadcrumb: the site has none anywhere, and a two-level trail is
              noise (§5.1). */}
          <Link
            href={sectionHref}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-tuggi-primary-text focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t("backToSection")}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1">
            <UpdateTypeBadge type={article.type} />
            <span className="text-xs text-tuggi-slate" aria-hidden="true">
              ·
            </span>
            <time dateTime={article.publishedAt} className="text-xs text-tuggi-slate">
              {formatUpdateDate(article.publishedAt, locale)}
            </time>
          </div>

          <h1 className="mt-3 text-4xl md:text-5xl font-black tracking-tight text-tuggi-dark">
            {article.title}
          </h1>

          {/* The dek is the SAME string the card carried: a summary that
              differs from the one the reader clicked is a promise broken in
              two clicks (§5.1). */}
          <p className="mt-4 text-lg leading-relaxed text-tuggi-slate">{article.summary}</p>

          <figure className="mt-8">
            <UpdateCover
              cover={article.cover}
              coverAlt={article.coverAlt}
              slug={article.slug}
              sizes="(min-width: 768px) 768px, 100vw"
              priority
            />
          </figure>
        </header>

        <div className="mt-10">
          <ArticleBody blocks={article.blocks} />
        </div>

        {/* Three things end an article, in this order, and nothing else
            (DS-COMPONENTE-058): one CTA — the one the site already publishes —,
            the pager, and no third-party share widget. The share of this
            section is the OG card plus a correct canonical, which is what makes
            the link look right in WhatsApp, where it is actually shared. */}
        <div className="mx-auto max-w-3xl">
          <div className="mt-16 rounded-3xl border border-gray-100 bg-tuggi-bg p-8 text-center">
            <AppDownloadButton
              eventLabel="updates_article"
              className="inline-block px-8 py-4 bg-tuggi-primary text-tuggi-dark font-black rounded-2xl shadow-xl shadow-tuggi-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              {t("cta.button")}
            </AppDownloadButton>
          </div>

          <ArticlePager previous={toLink(previous)} next={toLink(next)} />
        </div>
      </article>
    </div>
  );
}
