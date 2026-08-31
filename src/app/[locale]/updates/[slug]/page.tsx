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
import { ARTICLE_RAIL_ITEMS } from "@/lib/nav";

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
  // The rail spells its links with the menu's own labels — `DS-COMPONENTE-059`
  // regra 2 — so `Header` is read here rather than a second set of keys added
  // to `Updates`.
  const tHeader = await getTranslations({ locale, namespace: "Header" });
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
      {/* Two columns from 1280 px up — `DS-LAYOUT-013`.
          The reading column is 640 px wide at most and anchored on the content
          edge of `.page-shell`, and the 496 px that remain carry a rail of
          internal navigation — never a second offer. `minmax(0, 40rem)` and not
          `40rem`: a plain track floors the grid at 640 and the row overflows the
          rail on a narrow screen, which is the horizontal scroll SC 1.4.10
          refuses.

          The track was 768 px until 2026-08-31, because the objects had a
          column of their own. Collapsing the two columns into one is what
          closed the hole the operator reported: with a 768 px track and 576 px
          of prose, 208 px of the track were dead on every paragraph row and the
          gutter to the rail read as a void instead of a gutter. Now the two
          columns touch across 80 px, and 640 + 80 + 496 is the 1216 of the
          shell.

          The rail is `row-span-2` AND `self-start`, and the pair is what makes
          `sticky` work without inflating the box: the sticky constraint
          rectangle of a grid item is its GRID AREA, so spanning both rows gives
          the travel, while `self-start` keeps the `<nav>` as tall as the three
          links it holds. Stretched, it would measure the height of the whole
          article — a landmark of 2261 px in a 1000 px window, which is what
          criterion 15-f(f) counts.

          The DOM order is the reading order and it does not change: content,
          then the rail, then the pager (`DS-COMPONENTE-058`). The rail paints at
          the top right and is still read after the article, which is what
          SC 1.3.2 asks; reordering the DOM to match the screen is the defect,
          not the fix. */}
      <article className="xl:grid xl:grid-cols-[minmax(0,40rem)_1fr] xl:gap-x-20">
        <div className="xl:col-start-1 xl:row-start-1">
          {/* The header is text — link back, badge, date, `h1` and dek — and it
              reads in the TEXT column, `DS-LAYOUT-012`. The cover is a sibling
              of the header rather than its last child, so the two never share a
              cap by accident. No negative margin anywhere: a faked bleed breaks
              below a 768 px viewport. Order in the DOM and position on screen
              are the ones the reader already sees. */}
          <header className="max-w-xl md:max-w-[40rem]">
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
            <p className="mt-4 text-lg md:text-xl leading-relaxed text-tuggi-slate">{article.summary}</p>
          </header>

          {/* The cover shares the reading column, and that is the correction of
              2026-08-31. It used to bleed to 768 px while the prose ran at 576:
              the first object of the page announced a width the text then did
              not keep, and the step read as a broken page rather than as an
              object breathing. `DS-LAYOUT-012` caps the object column, it does
              not oblige an object to fill it — and the cover is a generated
              ornament, not a figure the reader studies. The two tables still
              take the wide column, twice, deep in the piece, where a breakout
              reads as emphasis. */}
          <figure className="max-w-xl md:max-w-[40rem] mt-8">
            <UpdateCover
              cover={article.cover}
              coverAlt={article.coverAlt}
              slug={article.slug}
              sizes="(min-width: 768px) 640px, 100vw"
              priority
            />
          </figure>

          <div className="mt-10">
            <ArticleBody blocks={article.blocks} />
          </div>

          {/* Three things end an article, in this order, and nothing else
              (DS-COMPONENTE-058): one CTA — the one the site already publishes
              —, the pager, and no third-party share widget. The share of this
              section is the OG card plus a correct canonical, which is what
              makes the link look right in WhatsApp, where it is actually
              shared.

              The call lives at the END OF THE READING, not in the rail, and
              that is `DS-LAYOUT-013` regra 3: a persistent offer beside the
              text is the definition of competing with the reader's attention,
              and the site header already carries a filled download button on
              every scroll — the rail was being the SECOND filled button of the
              same act, in the same corner, in a second brand colour.

              ONE node, at every viewport: it is in the flow of the reading
              column and the grid never moves it, so the `updates_article` event
              and the tab stop exist exactly once. No `mx-auto` — the column is
              anchored on the rail (regra 1) and centring inside it would open
              the second rail this rule exists to close. No `h2` either: the
              button says the same sentence the heading used to, 2 cm apart.

              No number enters this card. The welcome grant is BR-MONETIZACAO-058
              and it has one owner; a figure typed here is a second declaration
              of it that nothing keeps in step. */}
          <div className="mt-16 max-w-xl md:max-w-[40rem] rounded-3xl border border-gray-100 bg-tuggi-bg p-8 text-center">
            <p className="max-w-lg mx-auto text-base leading-relaxed text-tuggi-slate">
              {t("cta.body")}
            </p>
            <AppDownloadButton
              eventLabel="updates_article"
              className="mt-6 inline-block px-8 py-4 bg-tuggi-primary text-tuggi-dark font-black rounded-2xl shadow-xl shadow-tuggi-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              {t("cta.button")}
            </AppDownloadButton>
          </div>
        </div>

        {/* The rail — `DS-COMPONENTE-059`. A recorte of the site map, and
            nothing else: a label, at most three links to surfaces the menu
            already publishes, and no image, icon, description, number, price,
            date, button or field.

            It is a `<nav>` and not an `<aside>` because it carries navigation,
            and it is named by its own heading, because a landmark with no
            accessible name is a landmark a screen-reader user cannot pick from
            a list.

            `hidden xl:block`, so below 1280 px it is NOT RENDERED — not hidden.
            The three destinations are already in the header and in the
            `FatFooter` at that viewport, and a stack of links glued to the
            pager, which is itself navigation, is a third menu. That is the
            second leg of `DS-LAYOUT-013` regra 4: content of the page falls
            back into the flow, navigation that the chrome already publishes
            simply does not exist below the threshold. Never two nodes with one
            hidden by CSS. */}
        <nav
          data-article-rail
          aria-labelledby="article-rail-title"
          className="hidden xl:sticky xl:top-24 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:block xl:self-start"
        >
          {/* The smallest text on the screen, and the label of the landmark: it
              names a place, it does not promise and it does not sell. Small caps
              by CSS — the JSON keeps the natural case. */}
          <h2
            id="article-rail-title"
            className="text-xs font-bold uppercase tracking-wider text-tuggi-slate"
          >
            {t("rail.title")}
          </h2>
          <ul className="mt-4">
            {ARTICLE_RAIL_ITEMS.map((item) => (
              <li key={item.href} className="border-t border-gray-200">
                {/* The label is the one the menu carries — `Header.nav*`, the
                    same registry — so the site cannot grow two names for the
                    same place, and a destination unpublished in `NAV_ITEMS`
                    disappears from both at once. No string is typed here. */}
                <Link
                  href={`/${locale}${localizedPathname(locale, item.href)}`}
                  className="block rounded-sm py-3 text-base font-bold text-tuggi-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2"
                >
                  {tHeader(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-xl md:max-w-[40rem] xl:col-start-1 xl:row-start-2">
          <ArticlePager previous={toLink(previous)} next={toLink(next)} />
        </div>
      </article>
    </div>
  );
}
