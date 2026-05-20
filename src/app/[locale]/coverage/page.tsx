import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCoverageData } from "@/lib/coverage";
import { CoverageHero } from "@/components/blocks/CoverageHero";
import { CoverageMap } from "@/components/blocks/CoverageMap";
import { CoverageCountryList } from "@/components/blocks/CoverageCountryList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: "Cobertura Global | TUGGI",
    description: "Explore as cidades e regiões onde o copiloto cultural Tuggi já está presente.",
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

  return (
    <article className="min-h-screen">
      <CoverageHero
        totalCountries={coverageData.totalActiveCountries}
        totalAttractions={coverageData.totalActiveRaw}
        totalActiveRegions={coverageData.totalActiveRegions}
      />

      <CoverageMap states={coverageData.states} />

      <CoverageCountryList states={coverageData.states} />

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
            className="inline-block px-10 py-5 bg-tuggi-primary text-white font-black rounded-2xl shadow-xl shadow-tuggi-primary/20 hover:shadow-2xl hover:shadow-tuggi-primary/30 hover:-translate-y-1 transition-all"
          >
            {t("CTA.button")}
          </a>
        </div>
      </section>
    </article>
  );
}
