import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Globe, ArrowRight } from "lucide-react";
import { getCoverageData } from "@/lib/coverage";

// Curated flagship destinations grouped by region. Country names are localized
// at render via Intl.DisplayNames (a PT reader sees "Estados Unidos", "França"),
// so there is nothing to translate by hand. The full list lives on /coverage.
const REGIONS = [
  { key: "americas", codes: ["US", "CA", "MX", "BR", "AR", "CL"] },
  { key: "europe", codes: ["ES", "PT", "FR", "IT", "GB", "IE"] },
] as const;
const SHOWN = REGIONS.reduce((n, r) => n + r.codes.length, 0);

/**
 * Home "coverage" proof band: the flagship countries TUGGI is live in, with a
 * link to the full /coverage page. Server component with plain text (country
 * names are indexable keywords + an internal link that spreads equity to
 * /coverage). Answers the "is my destination covered?" objection before the CTA.
 */
export async function CoverageStrip() {
  const [locale, t, data] = await Promise.all([
    getLocale(),
    getTranslations("Home.Coverage"),
    getCoverageData(),
  ]);

  const countries = data.totalActiveCountries;
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const nameOf = (code: string) => regionNames.of(code) ?? code;

  return (
    <section className="bg-white py-16 lg:py-20 border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-tuggi-primary/10 text-tuggi-primary flex items-center justify-center">
          <Globe className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-tuggi-dark tracking-tight mb-3">
          {t("title", { count: countries })}
        </h2>
        <p className="text-tuggi-slate mb-10 max-w-2xl mx-auto">{t("subtitle")}</p>

        <div className="grid sm:grid-cols-2 gap-8 sm:gap-12 text-left max-w-3xl mx-auto">
          {REGIONS.map((region) => (
            <div key={region.key}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-tuggi-slate mb-4">
                {t(region.key)}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {region.codes.map((code) => (
                  <li
                    key={code}
                    className="rounded-full border border-gray-200 bg-tuggi-bg px-4 py-2 text-sm font-semibold text-tuggi-dark"
                  >
                    {nameOf(code)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-tuggi-slate">{t("more", { count: countries - SHOWN })}</p>
        <Link
          href="/coverage"
          className="mt-3 inline-flex items-center gap-2 font-semibold text-tuggi-primary-text hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2 rounded"
        >
          {t("cta")}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
