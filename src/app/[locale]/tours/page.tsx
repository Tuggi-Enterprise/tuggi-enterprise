import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routing } from "@/i18n/routing";
import { getCountriesForLocale, getRoutesByCountry } from "@/lib/routes";
import {
  buildAlternatesFor,
  buildOpenGraph,
  buildTwitterCard,
  buildUrl,
  defaultRobots,
} from "@/lib/seo";
import { countryHref, toRouteCardVM } from "@/lib/tourView";
import { RouteCard } from "@/components/blocks/RouteCard";

type Params = { locale: string };

/** Locales in which the global hub has ≥1 route. */
function hubLocales(): string[] {
  return routing.locales.filter((loc) => getCountriesForLocale(loc).length > 0);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tours" });
  const hasContent = getCountriesForLocale(locale).length > 0;

  return {
    title: t("hubMetaTitle"),
    description: t("hubMetaDesc"),
    alternates: buildAlternatesFor(locale, "tours", hubLocales()),
    // Don't index an empty hub for a locale without routes yet.
    robots: hasContent ? defaultRobots : { index: false, follow: true },
    openGraph: buildOpenGraph({
      title: t("hubMetaTitle"),
      description: t("hubMetaDesc"),
      locale,
      pagePath: "tours",
    }),
    twitter: buildTwitterCard({ title: t("hubMetaTitle"), description: t("hubMetaDesc") }),
  };
}

export default async function ToursHubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Tours" });
  const countries = getCountriesForLocale(locale);
  const pageUrl = buildUrl(locale, "tours");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: t("hubMetaTitle"),
        inLanguage: locale,
      },
      {
        "@type": "ItemList",
        numberOfItems: countries.length,
        itemListElement: countries.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://www.tuggi.app${countryHref(locale, c.countrySlug)}`,
          name: c.country,
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
        <div className="page-shell text-center">
          <span className="inline-block px-4 py-1.5 mb-5 text-sm font-bold tracking-wider text-tuggi-primary-text uppercase bg-tuggi-primary/5 rounded-full">
            {t("heroTag")}
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-tuggi-dark mb-4">
            {t("hubTitle")}
          </h1>
          <p className="text-lg text-tuggi-slate max-w-2xl mx-auto">{t("hubSubtitle")}</p>
        </div>
      </section>

      {countries.length === 0 ? (
        <section className="pb-24 bg-white">
          <div className="page-shell max-w-2xl text-center text-tuggi-slate">
            {t("hubEmpty")}
          </div>
        </section>
      ) : (
        <section className="pb-24 bg-white">
          <div className="page-shell space-y-16">
            {countries.map((c) => {
              const routes = getRoutesByCountry(c.countrySlug, locale).slice(0, 8);
              const vms = routes.map((r) => toRouteCardVM(r, locale));
              return (
                <div key={c.countrySlug}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl md:text-3xl font-black text-tuggi-dark">
                      {c.country}
                    </h2>
                    <Link
                      href={countryHref(locale, c.countrySlug)}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-tuggi-primary-text hover:gap-2.5 transition-all"
                    >
                      {t("viewAllInCountry", { count: c.count })}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {vms.map((vm) => (
                      <RouteCard key={vm.href} vm={vm} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
