import { Fragment } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Link as LocalizedLink } from "@/i18n/routing";
import type { StateCoverage } from "@/lib/coverage";
import { DENSITY_STEPS, DENSITY_STROKE, groupCoverage } from "@/lib/coverage-density";
import { CoverageDensityCanvas } from "./CoverageDensityCanvas";

interface Props {
  states: StateCoverage[];
  /** "<country>|<region>" → route hub path, built on the server. */
  tourHubs?: Record<string, string>;
  /**
   * How far the served alternative goes — and it is one prop, not two, because
   * the shortened list is only honest while it points at the complete one.
   *
   * `"regions"` is /coverage: every active region of every country, which is
   * what makes the page worth indexing.
   *
   * `"countries"` is the home (#194). Every region of every country printed on
   * the highest-traffic page of the site would be the whole of /coverage
   * published twice — near-duplicate content between the two pages that most
   * need to rank, and several thousand words between the cold visitor and the
   * three blocks below, one of which is the only B2B entrance the site has. The
   * question the home is asked is "is my destination in it?", and the country
   * is the granularity that answers it: spec §3.9 item 1 asks the served HTML
   * of the home for the names of the countries, and that is what this renders.
   */
  detail?: "regions" | "countries";
}

/**
 * Coverage, as density and as text — components 4.3 of the repagination spec.
 *
 * Two things are load-bearing here and neither is the drawing.
 *
 * **The list is not a caption, it is the content.** The map is a client
 * component that needs JavaScript, a `fetch` and 4,700 SVG paths to say
 * anything; the list below says the same thing in the HTML the server sends,
 * with no hydration and no `opacity` waiting on an observer
 * (DS-COMPONENTE-006). Cobertura is the cold visitor's first objection — "is my
 * destination in it?" — and it may not depend on our bundle arriving.
 *
 * **No number on this page comes from the snapshot.** `coverage-snapshot.json`
 * is frozen at 2026-07-13 and counts regions by a rendering threshold of its
 * own; BR-COMUNICACAO-002 lets it feed navigation (which countries, which
 * regions, how dense relative to each other) and forbids it from feeding a
 * figure presented as a claim, while item 5 keeps even a figure inside a
 * listing waiting on a snapshot regenerated in the same delivery (#207). So the
 * region count, the point count per country and the per-region total that this
 * block used to print are gone, and the density is an ordinal with a word next
 * to it. Published coverage figures live in `lib/product-facts.ts`.
 */
export async function CoverageDensityMap({
  states,
  tourHubs = {},
  detail = "regions",
}: Props) {
  const t = await getTranslations("Coverage.Density");
  const groups = groupCoverage(states, tourHubs);

  if (!groups.length) return null;

  return (
    <>
      <section data-block="coverage-density" className="py-20 bg-tuggi-dark relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(var(--color-tuggi-slate) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-3">
              {t("sectionTitle")}
            </h2>
            <p className="text-gray-300 text-base max-w-xl mx-auto">{t("sectionSubtitle")}</p>
          </div>

          <CoverageDensityCanvas states={states} />

          {/* The legend is server-rendered on purpose: the four steps are the
              only key to a drawing that says nothing without it, and colour
              alone would carry the whole scale (SC 1.4.1, DS-A11Y-003). */}
          <div className="mt-6">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 text-center">
              {t("legendTitle")}
            </h3>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {DENSITY_STEPS.map((step, index) => (
                <li key={step.id} className="flex items-center gap-2">
                  <span
                    data-density-swatch={index}
                    aria-hidden="true"
                    className="w-4 h-3 rounded-[3px] shrink-0"
                    style={{ backgroundColor: step.fill, outline: `1px solid ${DENSITY_STROKE}` }}
                  />
                  <span className="text-xs font-semibold text-gray-300">
                    {t(`legend.${step.id}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section data-block="coverage-list" className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-black text-tuggi-dark mb-4">
              {t(detail === "countries" ? "countryListTitle" : "listTitle")}
            </h3>
            <p className="text-tuggi-slate text-lg max-w-2xl mx-auto">
              {t(detail === "countries" ? "countryListIntro" : "listIntro")}
            </p>
          </div>

          {detail === "countries" ? (
            <>
              {groups.map((group) => (
                <div key={group.id} className="mb-10 last:mb-0">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-tuggi-slate mb-5 pb-2 border-b border-gray-200">
                    {t(`group.${group.id}`)}
                  </h4>
                  {/* Plain text in the served HTML, like the long form: the
                      names are the answer, and they may not wait for a bundle
                      (DS-COMPONENTE-006). */}
                  <ul className="flex flex-wrap gap-2">
                    {group.countries.map((country) => (
                      <li
                        key={country.country}
                        className="rounded-full border border-gray-200 bg-tuggi-bg px-4 py-2 text-sm font-semibold text-tuggi-dark"
                      >
                        {country.displayName}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="mt-10 text-center">
                <LocalizedLink
                  href="/coverage"
                  className="inline-flex items-center gap-2 font-semibold text-tuggi-primary-text hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2 rounded"
                >
                  {t("countryListCta")}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </LocalizedLink>
              </div>
            </>
          ) : (
            groups.map((group) => (
            <div key={group.id} className="mb-12 last:mb-0">
              <h4 className="text-xs font-bold uppercase tracking-widest text-tuggi-slate mb-5 pb-2 border-b border-gray-200">
                {t(`group.${group.id}`)}
              </h4>
              <ul className="columns-1 sm:columns-2 lg:columns-3 gap-8">
                {group.countries.map((country) => (
                  <li key={country.country} className="break-inside-avoid mb-6">
                    <span className="block text-base font-black text-tuggi-dark leading-tight">
                      {country.displayName}
                    </span>
                    <p className="text-sm text-tuggi-slate leading-relaxed">
                      {country.regions.map((region, index) => (
                        <Fragment key={region.name}>
                          {index > 0 && ", "}
                          {region.href ? (
                            <Link
                              href={region.href}
                              className="text-tuggi-primary-text font-semibold underline decoration-tuggi-primary/40 underline-offset-2 hover:decoration-tuggi-primary"
                            >
                              {region.name}
                            </Link>
                          ) : (
                            region.name
                          )}
                        </Fragment>
                      ))}
                    </p>
                    {country.outOfFrame.length > 0 && (
                      <p className="mt-1 text-xs text-tuggi-slate italic">
                        {t("outOfFrame", { regions: country.outOfFrame.join(", ") })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
