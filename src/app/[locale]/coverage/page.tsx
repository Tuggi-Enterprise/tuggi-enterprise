import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCoverageData } from "@/lib/coverage";
import { MAPPED_POINT_MILLIONS, PRODUCT_FACTS } from "@/lib/product-facts";
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
  const t = await getTranslations({ locale, namespace: "SEO_COVERAGE" });

  // Both figures come from lib/product-facts, which reads the rule rather than
  // the snapshot: the description used to publish an exact archive count off a
  // snapshot frozen weeks earlier, and the ogTitle used to call two million
  // mapped points "histórias prontas" — BR-COMUNICACAO-002 items 8 and 9.
  const title       = t("title");
  const description = t("description", PRODUCT_FACTS);
  const ogTitle     = t("ogTitle", PRODUCT_FACTS);

  return {
    title,
    description,
    alternates: buildAlternates(locale, "coverage"),
    robots: defaultRobots,
    // The share card is the one this page generates, with the coverage figures
    // in it — not the generic brand image. Whoever receives a link to /coverage
    // is deciding one thing in seconds ("is where I'm going covered?"), and the
    // preview is where that gets answered.
    //
    // The URL of the route is named here on purpose: dropping `images` to let
    // the App Router file convention take over would also drop `imageAlt`, and
    // the route's `alt` export is a static string that never sees `params` —
    // partner-claims.spec.ts requires og:image:alt to come from i18n in all
    // four locales. Twitter needs the same URL or it stays on the generic one.
    openGraph: buildOpenGraph({
      title: ogTitle,
      description,
      locale,
      pagePath: "coverage",
      image: `/${locale}/coverage/opengraph-image`,
      imageAlt: t("ogImageAlt"),
    }),
    twitter: buildTwitterCard({
      title: ogTitle,
      description,
      image: `/${locale}/coverage/opengraph-image`,
    }),
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
        "description": tSeo("description", PRODUCT_FACTS),
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
        // Mapped points, as the published floor — structured data is a
        // published surface too (BR-COMUNICACAO-002, "a régua vale para
        // qualquer superfície"), and this used to be the exact snapshot count.
        "numberOfItems": MAPPED_POINT_MILLIONS * 1_000_000,
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

      <CoverageHero />

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
