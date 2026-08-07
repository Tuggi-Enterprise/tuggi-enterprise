"use client";

import Link from "next/link";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { StateCoverage } from "@/lib/coverage";
import { getCountryDisplayName } from "@/lib/countryNames";

interface CountryCard {
  country: string;
  displayName: string;
  activeRegions: number;
  totalActive: number;
  topRegions: string[];
  extraCount: number;
}

interface CoverageCountryListProps {
  /** "<país>|<estado>" → caminho do hub de roteiros, montado no servidor. */
  tourHubs?: Record<string, string>;
  states: StateCoverage[];
}

const MAX_REGION_PILLS = 4;

/**
 * Transform only, no opacity — and here that is a requirement, not taste.
 * This list is the textual alternative to the map above it, which
 * DS-COMPONENTE-006 requires to be legible in the *served* HTML, with no
 * JavaScript and no hydration. An `opacity: 0` waiting on an
 * IntersectionObserver made the alternative exist only for a browser that runs
 * our JS — see CoverageMap.tsx, and #191.
 */
const REVEAL = {
  hidden: { y: 20 },
  show: { y: 0 },
};

export function CoverageCountryList({ states, tourHubs = {} }: CoverageCountryListProps) {
  const t = useTranslations("Coverage");

  const countryCards = useMemo((): CountryCard[] => {
    const map = new Map<string, { totalActive: number; regions: { name: string; active: number }[] }>();

    states.forEach(s => {
      if (s.activeCount === 0) return;
      if (!map.has(s.country)) {
        map.set(s.country, { totalActive: 0, regions: [] });
      }
      const card = map.get(s.country)!;
      card.totalActive += s.activeCount;
      card.regions.push({ name: s.state, active: s.activeCount });
    });

    return Array.from(map.entries())
      .map(([country, data]) => {
        const sorted = data.regions.sort((a, b) => b.active - a.active);
        return {
          country,
          displayName: getCountryDisplayName(country),
          activeRegions: data.regions.length,
          totalActive: data.totalActive,
          topRegions: sorted.slice(0, MAX_REGION_PILLS).map(r => r.name),
          extraCount: Math.max(0, sorted.length - MAX_REGION_PILLS),
        };
      })
      .sort((a, b) => b.totalActive - a.totalActive);
  }, [states]);

  // Two-letter badge from display name
  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map(w => w[0])
      .join("")
      .toUpperCase();

  return (
    <section className="py-20 bg-white border-t border-gray-100">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.h2
            initial={REVEAL.hidden}
            whileInView={REVEAL.show}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-tuggi-dark mb-4"
          >
            {t("CountryList.sectionTitle")}
          </motion.h2>
          <motion.p
            initial={REVEAL.hidden}
            whileInView={REVEAL.show}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-tuggi-slate text-lg max-w-2xl mx-auto"
          >
            {t("CountryList.sectionSubtitle")}
          </motion.p>
        </div>

        {/* Country Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {countryCards.map((card, index) => (
            <motion.div
              key={card.country}
              initial={REVEAL.hidden}
              whileInView={REVEAL.show}
              viewport={{ once: true }}
              transition={{ delay: Math.min(index * 0.04, 0.5) }}
              className="bg-tuggi-bg rounded-3xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              {/* Badge + Name.
                  The badge and the "+N" pill below used to sit on
                  bg-tuggi-primary/10, which composites to #def1fa over the
                  card: #007aa5 on it is 4.18:1, under 4.5:1 at 11–12px
                  (SC 1.4.3, 34 nodes). White with the cyan hairline is the
                  treatment the region pills already use, and reads 4.85:1. */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white border border-tuggi-primary/40 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-tuggi-primary-text tracking-tight">
                    {getInitials(card.displayName)}
                  </span>
                </div>
                <span className="text-base font-black text-tuggi-dark leading-tight">
                  {card.displayName}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-tuggi-primary-text">
                  {card.totalActive.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-tuggi-slate uppercase tracking-wider">
                  {t("CountryList.attractionsLabel")}
                </span>
              </div>
              <div className="text-xs text-tuggi-slate mb-4">
                {card.activeRegions} {t("CountryList.statesLabel")}
              </div>

              {/* Region pills */}
              <div className="flex flex-wrap gap-1.5">
                {card.topRegions.map(region => {
                  // Where the state already has curated routes, the pill becomes
                  // the way in. Coverage and tours were two trees that never
                  // linked to each other.
                  const href = tourHubs[`${card.displayName}|${region}`];
                  const label = "text-[11px] font-semibold px-2 py-0.5 rounded-full border";
                  return href ? (
                    <Link
                      key={region}
                      href={href}
                      className={`${label} bg-white border-tuggi-primary/40 text-tuggi-primary-text hover:border-tuggi-primary transition-colors`}
                    >
                      {region} ›
                    </Link>
                  ) : (
                    <span
                      key={region}
                      className={`${label} bg-white border-gray-200 text-tuggi-slate`}
                    >
                      {region}
                    </span>
                  );
                })}
                {card.extraCount > 0 && (
                  <span className="text-[11px] font-semibold bg-white border border-tuggi-primary/40 text-tuggi-primary-text px-2 py-0.5 rounded-full">
                    +{card.extraCount} {t("CountryList.statesLabel")}
                  </span>
                )}
              </div>

              {/* Estados deste país que já têm roteiro. As pílulas acima listam
                  os estados com mais atrações, que raramente são os mesmos —
                  Rio de Janeiro tem 15 roteiros e não aparece entre eles. */}
              {(() => {
                const prefix = `${card.displayName}|`;
                const withTours = Object.entries(tourHubs)
                  .filter(([key]) => key.startsWith(prefix))
                  .map(([key, href]) => ({ state: key.slice(prefix.length), href }))
                  .sort((a, b) => a.state.localeCompare(b.state));
                if (!withTours.length) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200/70">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-tuggi-slate mb-2">
                      {t("CountryList.toursLabel")}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {withTours.map(({ state, href }) => (
                        <Link
                          key={state}
                          href={href}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-white border-tuggi-primary/40 text-tuggi-primary-text hover:border-tuggi-primary transition-colors"
                        >
                          {state} ›
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
