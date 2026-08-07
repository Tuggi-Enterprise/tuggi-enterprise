import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCoverageData } from "@/lib/coverage";
import { activeCountries, activePoints } from "@/lib/product-facts";
import {
  buildAlternates,
  buildOpenGraph,
  buildTwitterCard,
  defaultRobots,
  buildUrl,
} from "@/lib/seo";
import { CoverageHero } from "@/components/blocks/CoverageHero";
import { CoverageMap } from "@/components/blocks/CoverageMap";
import { CoverageCountryList } from "@/components/blocks/CoverageCountryList";
import { getCountryDisplayName } from "@/lib/countryNames";
import { getStateHubPaths } from "@/lib/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, points, countries] = await Promise.all([
    getTranslations({ locale, namespace: "SEO_COVERAGE" }),
    activePoints(),
    activeCountries(),
  ]);

  // Both figures, and the floor they are rounded to, come from
  // lib/product-facts — the rounding rule used to be written out three
  // times over the same snapshot (BR-COMUNICACAO-002 item 4).
  const countRounded = points.value.toLocaleString(
    locale === "en" ? "en-US" : locale,
  );

  const title       = t("title");
  const description = t("description", {
    count: countRounded,
  });
  const ogTitle     = t("ogTitle", {
    count: countRounded,
    countries: countries.value,
  });

  return {
    title,
    description,
    alternates: buildAlternates(locale, "coverage"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({
      title: ogTitle,
      description,
      locale,
      pagePath: "coverage",
      imageAlt: t("ogImageAlt"),
    }),
    twitter: buildTwitterCard({ title: ogTitle, description }),
  };
}

export default async function CoveragePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const coverageData = await getCoverageData();
  const t = await getTranslations({ locale, namespace: "Coverage" });
  const tSeo = await getTranslations({ locale, namespace: "SEO_COVERAGE" });

  // ── Unique countries for JSON-LD areaServed ───────────────────────────────
  const uniqueCountries = [
    ...new Set(coverageData.states.map(s => getCountryDisplayName(s.country))),
  ].sort();

  const pageUrl = buildUrl(locale, "coverage");

  // Shared interpolation values for SEO strings with {count}/{countries}
  const [points, countries] = await Promise.all([activePoints(), activeCountries()]);
  const countRounded = points.value.toLocaleString(
    locale === "en" ? "en-US" : locale,
  );
  const seoVars = { count: countRounded, countries: countries.value };

  // ── JSON-LD structured data ───────────────────────────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      // 1. WebPage — describes this page to Google
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        "url": pageUrl,
        "name": tSeo("title"),
        "description": tSeo("description", seoVars),
        "inLanguage": locale,
        "isPartOf": {
          "@type": "WebSite",
          "@id": "https://www.tuggi.app/#website",
          "name": "TUGGI",
          "url": "https://www.tuggi.app",
        },
        "breadcrumb": { "@id": `${pageUrl}#breadcrumb` },
      },

      // 2. BreadcrumbList — shows breadcrumb trail in Google search results
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "TUGGI",
            "item": "https://www.tuggi.app",
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": locale === "en" ? "Global Coverage" :
                    locale === "es" ? "Cobertura Global" :
                    locale === "it" ? "Copertura Globale" :
                    "Cobertura Global",
            "item": pageUrl,
          },
        ],
      },

      // 3. MobileApplication — describes the TUGGI app and where it operates.
      // The areaServed list helps Google index the page for local searches like
      // "audio guide Italy" or "self-guided tour Spain".
      {
        "@type": "MobileApplication",
        "@id": "https://www.tuggi.app/#app",
        "name": "TUGGI",
        "description":
          "Self-guided audio cultural guide that automatically plays stories as you drive, walk, or explore destinations around the world.",
        "applicationCategory": "TravelApplication",
        "operatingSystem": "iOS, Android",
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
          "price": "0",
          "priceCurrency": "USD",
        },
        // Dynamic list derived from actual snapshot data — stays up to date
        "areaServed": uniqueCountries.map(name => ({
          "@type": "Country",
          "name": name,
        })),
        // Total attractions as a quantitative value
        "numberOfItems": coverageData.totalActiveRaw,
      },
    ],
  };

  return (
    <article className="min-h-screen">
      {/* JSON-LD — injected in <head> by Next.js */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <CoverageHero
        totalCountries={countries.value}
        totalAttractions={coverageData.totalActiveRaw}
        totalActiveRegions={coverageData.totalActiveRegions}
      />

      <CoverageMap states={coverageData.states} />

      <CoverageCountryList states={coverageData.states} tourHubs={getStateHubPaths(locale)} />

      {/* CTA */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-tuggi-dark mb-8">
            {t("CTA.title")}
          </h2>
          <p className="text-tuggi-slate text-xl mb-10 max-w-2xl mx-auto">
            {t("CTA.description")}
          </p>
          <a
            href={`/${locale}/contact`}
            className="inline-block px-10 py-5 bg-tuggi-primary text-tuggi-dark font-black rounded-2xl shadow-xl shadow-tuggi-primary/20 hover:shadow-2xl hover:shadow-tuggi-primary/30 hover:-translate-y-1 transition-all"
          >
            {t("CTA.button")}
          </a>
        </div>
      </section>
    </article>
  );
}
