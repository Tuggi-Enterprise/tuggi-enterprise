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
  type LucideIcon,
} from "lucide-react";
import { AppDownloadButton } from "@/components/blocks/AppDownloadButton";

export interface RouteHeroProps {
  name: string;
  region: string | null;
  country: string;
  /** The route's own intro copy — reads as the left column of the hero. */
  description: string;
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

/**
 * Route hero: prose on the left, an information-and-action panel on the right.
 *
 * The panel sits on the same right rail as the sticky map below it, so the page
 * reads as one grid — reading on the left, doing on the right — instead of a
 * stack of centred blocks that each stop short of the container.
 *
 * The facts are split by the question they answer. Duration, distance and stop
 * count decide "can I do this today?", so they read as three large numbers; the
 * rest — difficulty, access, best time, languages — is reference you consult
 * once, and reads as a definition list. Seven identical boxes gave all of it the
 * same weight and none of it any.
 */
export function RouteHero({
  name,
  region,
  country,
  description,
  durationStr,
  distanceStr,
  stopsCount,
  drivability,
  accessibility,
  bestTime,
  languageLabels,
}: RouteHeroProps) {
  const t = useTranslations("Tours");

  // Fixed three slots: an empty value shows a dash rather than collapsing the
  // row, so every route hero has the same shape.
  const headline: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Clock, label: t("facts.duration"), value: durationStr || "—" },
    { icon: Ruler, label: t("facts.distance"), value: distanceStr || "—" },
    { icon: MapPin, label: t("facts.stops"), value: String(stopsCount) },
  ];

  const details: { icon: LucideIcon; label: string; value: string }[] = [];
  if (drivability && drivability !== "unknown")
    details.push({
      icon: Car,
      label: t("facts.drivability"),
      value: t(`drivability.${drivability}`),
    });
  if (accessibility && accessibility !== "unknown")
    details.push({
      icon: Accessibility,
      label: t("facts.accessibility"),
      value: t(`accessibility.${accessibility}`),
    });
  if (bestTime.length)
    details.push({
      icon: Sun,
      label: t("facts.bestTime"),
      value: bestTime.map((b) => t(`bestTime.${b}`)).join(" · "),
    });
  if (languageLabels.length)
    details.push({
      icon: Globe,
      label: t("facts.languages"),
      value: languageLabels.join(" · "),
    });

  const panel = (
    // Capped below `lg`, where the panel is not yet in the sidebar column:
    // stretched across a tablet it puts each label and its value at opposite
    // ends of 650px, which stops reading as a pair.
    <div className="max-w-lg lg:max-w-none rounded-3xl border border-gray-100 bg-tuggi-bg p-6 shadow-sm">
      <dl className="grid grid-cols-3 gap-4">
        {headline.map((f) => (
          // Reversed so the value reads first while the DOM keeps
          // term-then-definition — a screen reader says "Duration, 49 min".
          <div key={f.label} className="flex flex-col-reverse">
            <dt className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tuggi-slate">
              {f.label}
            </dt>
            <dd className="text-xl font-black text-tuggi-dark leading-none">{f.value}</dd>
          </div>
        ))}
      </dl>

      {details.length > 0 && (
        <dl className="mt-5 border-t border-gray-200/70">
          {details.map((d) => (
            <div
              key={d.label}
              className="flex items-baseline justify-between gap-4 border-b border-gray-200/70 py-2.5 last:border-b-0"
            >
              <dt className="inline-flex items-center gap-2 shrink-0 text-sm text-tuggi-slate">
                <d.icon className="w-4 h-4 text-tuggi-slate/70 shrink-0" aria-hidden="true" />
                {d.label}
              </dt>
              <dd className="text-sm font-semibold text-tuggi-dark text-right">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <AppDownloadButton
          eventLabel="route_hero"
          className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-tuggi-primary text-tuggi-dark font-black rounded-2xl shadow-lg shadow-tuggi-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Headphones className="w-5 h-5" />
          {t("heroCtaPrimary")}
        </AppDownloadButton>
        <a
          href="#route-map"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-tuggi-dark font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all"
        >
          <MapPin className="w-5 h-5 text-tuggi-primary" />
          {t("heroCtaSecondary")}
        </a>
      </div>
    </div>
  );

  return (
    <section id="route-hero" className="relative pt-8 lg:pt-28 pb-12 bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-tuggi-primary blur-[120px]" />
      </div>

      <div className="page-shell relative z-10">
        <span className="inline-block px-4 py-1.5 mb-5 text-sm font-bold tracking-wider text-tuggi-primary-text uppercase bg-tuggi-primary/5 rounded-full">
          {t("heroTag")}
        </span>

        <h1 className="text-4xl md:text-6xl font-black text-tuggi-dark mb-4 leading-tight">
          {name}
        </h1>

        <p className="text-lg text-tuggi-slate">
          {t("heroSubtitle", { place: region || country })}
        </p>

        {/* Same column split as the map section below, so the right rail runs
            unbroken down the page. The panel comes first on mobile: facts and
            the CTA belong above a seven-line intro, not under it. */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-12 lg:items-start">
          <div className="order-1 lg:order-2">{panel}</div>

          {description && (
            <p className="order-2 lg:order-1 text-lg text-tuggi-slate leading-relaxed whitespace-pre-line">
              {description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
