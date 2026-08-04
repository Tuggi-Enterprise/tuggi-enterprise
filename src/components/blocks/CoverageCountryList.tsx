"use client";

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
  states: StateCoverage[];
}

const MAX_REGION_PILLS = 4;

export function CoverageCountryList({ states }: CoverageCountryListProps) {
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-tuggi-dark mb-4"
          >
            {t("CountryList.sectionTitle")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(index * 0.04, 0.5) }}
              className="bg-tuggi-bg rounded-3xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              {/* Badge + Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-tuggi-primary/10 flex items-center justify-center shrink-0">
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
                {card.topRegions.map(region => (
                  <span
                    key={region}
                    className="text-[11px] font-semibold bg-white border border-gray-200 text-tuggi-slate px-2 py-0.5 rounded-full"
                  >
                    {region}
                  </span>
                ))}
                {card.extraCount > 0 && (
                  <span className="text-[11px] font-semibold bg-tuggi-primary/10 text-tuggi-primary-text px-2 py-0.5 rounded-full">
                    +{card.extraCount} {t("CountryList.statesLabel")}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
