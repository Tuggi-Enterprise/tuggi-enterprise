import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import {
  countryName,
  getAllRoutes,
  getRoutesByState,
  getStatesForCountry,
  type StateSummary,
} from "@/lib/routes";
import {
  buildAlternatesFor,
  buildOpenGraph,
  buildTwitterCard,
  buildUrl,
  defaultRobots,
} from "@/lib/seo";
import { toRouteCardVM } from "@/lib/tourView";
import { RouteCard } from "@/components/blocks/RouteCard";

/**
 * State hub — /tours/<country>/state/<state>.
 *
 * The state layer exists only where the data has it (Portugal's POIs carry no
 * state), so these pages are generated per state that actually has routes.
 *
 * The route URLs deliberately did NOT move under this segment. The SEO win is
 * these landing pages existing and being linked — "roteiros de áudio no Rio de
 * Janeiro" is the query with volume, not "Brazil" — and URL depth is a weak
 * signal next to the breadcrumb and the internal linking, neither of which
 * needs the routes to move. Not moving them also avoids a second layer of 301s
 * on slugs that already changed twice.
 */

type Params = { locale: string; country: string; state: string };

/** Locales in which this state hub has ≥1 eligible route. */
function localesForState(countrySlug: string, stateSlug: string): string[] {
  return routing.locales.filter(
    (loc) => getRoutesByState(countrySlug, stateSlug, loc).length > 0
  );
}

function findState(
  countrySlug: string,
  stateSlug: string,
  locale: string
): StateSummary | undefined {
  return getStatesForCountry(countrySlug, locale).find((s) => s.stateSlug === stateSlug);
}

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  const params: Params[] = [];
  const countries = [...new Set(getAllRoutes().map((r) => r.countrySlug))];
  for (const locale of routing.locales) {
    for (const country of countries) {
      for (const state of getStatesForCountry(country, locale)) {
        params.push({ locale, country, state: state.stateSlug });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, country, state } = await params;
  const summary = findState(country, state, locale);
  if (!summary) return { robots: { index: false, follow: false } };

  const t = await getTranslations({ locale, namespace: "Tours" });
  const routes = getRoutesByState(country, state, locale);
  const countryLabel = countryName(routes[0], locale);
  const pagePath = `tours/${country}/state/${state}`;

  // The title leads with the state and avoids a preposition on purpose: state
  // names come from the database, and "em Rio de Janeiro" / "em Portugal" need
  // different articles that no template can pick for an open set of names.
  const title = t("stateMetaTitle", { state: summary.state });
  const description = t("stateMetaDesc", {
    state: summary.state,
    country: countryLabel,
    count: routes.length,
  });

  return {
    title,
    description,
    alternates: buildAlternatesFor(locale, pagePath, localesForState(country, state)),
    // A hub holding a single route is thin — navigable, but not worth indexing.
    // Same rule the global hub already applies when it has no content.
    robots: routes.length > 1 ? defaultRobots : { index: false, follow: true },
    openGraph: buildOpenGraph({ title, description, locale, pagePath }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function StateHubPage({ params }: { params: Promise<Params> }) {
  const { locale, country, state } = await params;
  setRequestLocale(locale);

  const routes = getRoutesByState(country, state, locale);
  if (!routes.length) notFound();

  const summary = findState(country, state, locale);
  const stateLabel = summary?.state ?? routes[0].state ?? state;
  const countryLabel = countryName(routes[0], locale);
  const t = await getTranslations({ locale, namespace: "Tours" });
  const pageUrl = buildUrl(locale, `tours/${country}/state/${state}`);
  const vms = routes.map((r) => toRouteCardVM(r, locale));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: t("stateMetaTitle", { state: stateLabel }),
        inLanguage: locale,
        about: { "@type": "Place", name: `${stateLabel}, ${countryLabel}` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TUGGI", item: "https://www.tuggi.app" },
          {
            "@type": "ListItem",
            position: 2,
            name: t("breadcrumbTours"),
            item: buildUrl(locale, "tours"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: countryLabel,
            item: buildUrl(locale, `tours/${country}`),
          },
          { "@type": "ListItem", position: 4, name: stateLabel, item: pageUrl },
        ],
      },
      {
        "@type": "ItemList",
        numberOfItems: vms.length,
        itemListElement: vms.map((v, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://www.tuggi.app${v.href}`,
          name: v.name,
        })),
      },
    ],
  };

  return (
    <article className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="pt-10 lg:pt-28 pb-10 bg-white">
        <div className="page-shell">
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-tuggi-slate flex flex-wrap gap-2 mb-6"
          >
            <Link href={`/${locale}/tours`} className="hover:text-tuggi-primary-text">
              {t("breadcrumbTours")}
            </Link>
            <span aria-hidden>›</span>
            <Link
              href={`/${locale}/tours/${country}`}
              className="hover:text-tuggi-primary-text"
            >
              {countryLabel}
            </Link>
            <span aria-hidden>›</span>
            <span className="text-tuggi-dark font-semibold">{stateLabel}</span>
          </nav>

          <h1 className="text-4xl md:text-6xl font-black text-tuggi-dark mb-4">
            {t("stateTitle", { state: stateLabel })}
          </h1>
          <p className="text-lg text-tuggi-slate max-w-2xl">
            {t("stateSubtitle", { count: routes.length, country: countryLabel })}
          </p>

          {summary && summary.regions.length > 0 && (
            <p className="mt-3 text-sm text-tuggi-slate">{summary.regions.join(" · ")}</p>
          )}
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="page-shell">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vms.map((vm) => (
              <RouteCard key={vm.href} vm={vm} />
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
