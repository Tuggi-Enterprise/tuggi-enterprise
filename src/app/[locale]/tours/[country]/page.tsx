import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import { countryName, getCountriesForLocale, getRoutesByCountry } from "@/lib/routes";
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
