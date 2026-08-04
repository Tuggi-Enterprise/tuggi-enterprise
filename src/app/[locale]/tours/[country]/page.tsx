import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import {
  countryName,
  getCountriesForLocale,
  getRoutesByCountry,
  getRoutesByState,
  getStatesForCountry,
} from "@/lib/routes";
import { countryCodeOf } from "@/lib/countryNames";
import {
  buildAlternatesFor,
  buildOpenGraph,
  buildTwitterCard,
  buildUrl,
  defaultRobots,
} from "@/lib/seo";
import { toRouteCardVM } from "@/lib/tourView";
import { RouteCard } from "@/components/blocks/RouteCard";

type Params = { locale: string; country: string };

/** Locales in which this country hub has ≥1 eligible route. */
function localesForCountry(countrySlug: string): string[] {
  return routing.locales.filter(
    (loc) => getRoutesByCountry(countrySlug, loc).length > 0
  );
}

/** Display country name, written in `locale`, from any eligible route. */
function countryNameOf(countrySlug: string, locale: string): string | null {
  for (const loc of routing.locales) {
    const r = getRoutesByCountry(countrySlug, loc)[0];
    if (r) return countryName(r, locale);
  }
  return null;
}

type Translator = Awaited<ReturnType<typeof getTranslations<"Tours">>>;

/**
 * "in <country>" as one translated phrase — "no Brasil", "negli Stati Uniti".
 * Falls back to the bare name for a country with no phrase yet.
 */
function countryInPhrase(t: Translator, countrySlug: string, fallback: string): string {
  const code = countryCodeOf(countrySlug);
  if (!code) return fallback;
  const key = `countryIn.${code}` as Parameters<typeof t.has>[0];
  return t.has(key) ? t(key) : fallback;
}

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  const params: Params[] = [];
  for (const locale of routing.locales) {
    for (const c of getCountriesForLocale(locale)) {
      params.push({ locale, country: c.countrySlug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, country } = await params;
  const countryLabel = countryNameOf(country, locale);
  if (!countryLabel) return { robots: { index: false, follow: false } };

  const t = await getTranslations({ locale, namespace: "Tours" });
  const pagePath = `tours/${country}`;
  const inCountry = countryInPhrase(t, country, countryLabel);
  const title = t("countryMetaTitle", { inCountry });
  const description = t("countryMetaDesc", { inCountry });

  return {
    title,
    description,
    alternates: buildAlternatesFor(locale, pagePath, localesForCountry(country)),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function CountryHubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, country } = await params;
  setRequestLocale(locale);

  const routes = getRoutesByCountry(country, locale);
  if (!routes.length) notFound();

  const countryLabel = countryName(routes[0], locale);
  const t = await getTranslations({ locale, namespace: "Tours" });
  const inCountry = countryInPhrase(t, country, countryLabel);
  const pageUrl = buildUrl(locale, `tours/${country}`);
  const vms = routes.map((r) => toRouteCardVM(r, locale));
  const states = getStatesForCountry(country, locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: t("countryMetaTitle", { inCountry }),
        inLanguage: locale,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TUGGI", item: "https://www.tuggi.app" },
          { "@type": "ListItem", position: 2, name: t("breadcrumbTours"), item: buildUrl(locale, "tours") },
          { "@type": "ListItem", position: 3, name: countryLabel, item: pageUrl },
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
          <nav aria-label="Breadcrumb" className="text-sm text-tuggi-slate flex gap-2 mb-6">
            <Link href={`/${locale}/tours`} className="hover:text-tuggi-primary-text">
              {t("breadcrumbTours")}
            </Link>
            <span aria-hidden>›</span>
            <span className="text-tuggi-dark font-semibold">{countryLabel}</span>
          </nav>

          <h1 className="text-4xl md:text-6xl font-black text-tuggi-dark mb-4">
            {t("countryTitle", { inCountry })}
          </h1>
          <p className="text-lg text-tuggi-slate max-w-2xl">
            {t("countrySubtitle", { inCountry, count: routes.length })}
          </p>
        </div>
      </section>

      {/* Grouped by state where the country has that layer, flat where it does
          not (Portugal's POIs carry no state — see resolveState in
          scripts/update-routes.mjs). One grid of 25 identical cards was the
          problem this page had; four labelled blocks with a jump nav is the fix. */}
      {states.length > 0 ? (
        <>
          <nav
            aria-label={t("statesNavLabel")}
            className="sticky top-20 z-20 bg-white/95 backdrop-blur border-b border-gray-100"
          >
            <div className="page-shell flex flex-wrap gap-2 py-3">
              {states.map((s) => (
                <a
                  key={s.stateSlug}
                  href={`#estado-${s.stateSlug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-tuggi-dark hover:border-tuggi-primary transition-colors"
                >
                  {s.state}
                  <span className="text-xs font-bold text-tuggi-slate">{s.count}</span>
                </a>
              ))}
            </div>
          </nav>

          <section className="pb-20 bg-white">
            <div className="page-shell space-y-14 pt-10">
              {states.map((s) => (
                <div key={s.stateSlug} id={`estado-${s.stateSlug}`} className="scroll-mt-36">
                  <h2 className="text-2xl md:text-3xl font-black text-tuggi-dark">
                    {s.state}
                  </h2>
                  {s.regions.length > 0 && (
                    <p className="mt-1 mb-6 text-sm text-tuggi-slate">
                      {s.regions.join(" · ")}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {getRoutesByState(country, s.stateSlug, locale).map((r) => (
                      <RouteCard key={r.slug} vm={toRouteCardVM(r, locale)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="pb-20 bg-white">
          <div className="page-shell">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vms.map((vm) => (
                <RouteCard key={vm.href} vm={vm} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
