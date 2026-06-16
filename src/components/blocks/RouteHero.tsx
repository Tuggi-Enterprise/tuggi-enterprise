"use client";

import { useTranslations } from "next-intl";
import {
  Clock,
  Ruler,
  MapPin,
  Car,
  Accessibility,
  Globe,
  Sun,
  Headphones,
} from "lucide-react";
import { AppDownloadButton } from "@/components/blocks/AppDownloadButton";

export interface RouteHeroProps {
  name: string;
  region: string | null;
  country: string;
  durationStr: string;
  distanceStr: string;
  stopsCount: number;
  /** enum keys: easy | moderate | demanding | unknown */
  drivability: string;
  /** enum keys: accessible | partial | not_accessible | unknown */
  accessibility: string;
  /** enum keys: morning | afternoon | evening | night | … */
  bestTime: string[];
  /** human language labels already resolved (e.g. ["Português", "English"]) */
  languageLabels: string[];
}

export function RouteHero({
  name,
  region,
  country,
  durationStr,
  distanceStr,
  stopsCount,
  drivability,
  accessibility,
  bestTime,
  languageLabels,
}: RouteHeroProps) {
  const t = useTranslations("Tours");

  const facts: { icon: typeof Clock; label: string; value: string }[] = [];
  if (durationStr) facts.push({ icon: Clock, label: t("facts.duration"), value: durationStr });
  if (distanceStr) facts.push({ icon: Ruler, label: t("facts.distance"), value: distanceStr });
  facts.push({ icon: MapPin, label: t("facts.stops"), value: String(stopsCount) });
  if (drivability && drivability !== "unknown")
    facts.push({ icon: Car, label: t("facts.drivability"), value: t(`drivability.${drivability}`) });
  if (accessibility && accessibility !== "unknown")
    facts.push({
      icon: Accessibility,
      label: t("facts.accessibility"),
      value: t(`accessibility.${accessibility}`),
    });
  if (bestTime.length)
    facts.push({
      icon: Sun,
      label: t("facts.bestTime"),
      value: bestTime.map((b) => t(`bestTime.${b}`)).join(", "),
    });
  if (languageLabels.length)
    facts.push({ icon: Globe, label: t("facts.languages"), value: languageLabels.join(", ") });

  return (
    <section className="relative pt-28 pb-12 bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-tuggi-primary blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 max-w-4xl">
        <span className="inline-block px-4 py-1.5 mb-5 text-sm font-bold tracking-wider text-tuggi-primary uppercase bg-tuggi-primary/10 rounded-full">
          {t("heroTag")}
        </span>

        <h1 className="text-4xl md:text-6xl font-black text-tuggi-dark mb-4 leading-tight">
          {name}
        </h1>

        <p className="text-lg text-tuggi-slate mb-8">
          {t("heroSubtitle", { place: region || country })}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {facts.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-3 bg-tuggi-bg rounded-2xl border border-gray-100 p-4"
            >
              <f.icon className="w-5 h-5 text-tuggi-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-tuggi-slate">
                  {f.label}
                </div>
                <div className="text-sm font-black text-tuggi-dark">{f.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <AppDownloadButton
            eventLabel="route_hero"
            className="inline-flex items-center gap-2 px-7 py-4 bg-tuggi-primary text-white font-black rounded-2xl shadow-xl shadow-tuggi-primary/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            <Headphones className="w-5 h-5" />
            {t("heroCtaPrimary")}
          </AppDownloadButton>
          <a
            href="#route-map"
            className="inline-flex items-center gap-2 px-7 py-4 bg-tuggi-bg text-tuggi-dark font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <MapPin className="w-5 h-5 text-tuggi-primary" />
            {t("heroCtaSecondary")}
          </a>
        </div>
      </div>
    </section>
  );
}
