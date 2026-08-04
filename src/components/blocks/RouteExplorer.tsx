"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Headphones } from "lucide-react";
import { RouteMap, type RouteMapStop } from "@/components/blocks/RouteMap";
import { RouteStops, type RouteStopView } from "@/components/blocks/RouteStops";
import { AppDownloadButton } from "@/components/blocks/AppDownloadButton";

interface RouteExplorerProps {
  /** GeoJSON LineString coordinates: [lng, lat][]. */
  line: number[][] | null;
  mapStops: RouteMapStop[];
  stops: RouteStopView[];
}

/**
 * Map + itinerary as one instrument.
 *
 * On desktop the map sticks beside the itinerary instead of scrolling away, so
 * the reader never loses the spatial reference: scrolling the list highlights
 * the matching pin (and pans to it if it drifted off), and tapping a pin scrolls
 * the list. On mobile the two simply stack, map first.
 *
 * The map column also carries the CTA, which gives the desktop page a permanent
 * way out to the app — the itinerary can run well past a screen and a half.
 */
export function RouteExplorer({ line, mapStops, stops }: RouteExplorerProps) {
  const t = useTranslations("Tours");
  const [activeStop, setActiveStop] = useState<number | null>(null);

  const selectStop = useCallback((position: number) => {
    setActiveStop(position);
    const target = document.getElementById(`stop-${position}`);
    if (!target) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    history.replaceState(null, "", `#stop-${position}`);
  }, []);

  // Only explain the muted pin when the route actually has one.
  const hasPassThrough = mapStops.some((s) => !s.hasContent);

  return (
    <section id="route-map" className="py-16 bg-white" aria-labelledby="itinerary-heading">
      <div className="page-shell">
        <h2
          id="itinerary-heading"
          className="text-3xl md:text-4xl font-black text-tuggi-dark mb-3"
        >
          {t("itineraryTitle")}
        </h2>
        <p className="text-tuggi-slate">{t("itinerarySubtitle")}</p>

        {/* The map column needs real width: too narrow and the labels have
            nowhere to go, which leaves a map of bare numbers. */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-12 lg:items-start">
          <div className="lg:order-2 lg:sticky lg:top-24">
            <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm h-[340px] sm:h-[420px] lg:h-[min(30rem,calc(100vh-16rem))]">
              <RouteMap
                line={line}
                stops={mapStops}
                activeStop={activeStop}
                onSelectStop={selectStop}
              />
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-tuggi-slate">
              <li className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tuggi-primary shadow-sm" />
                {t("legendWithAudio")}
              </li>
              {hasPassThrough && (
                <li className="inline-flex items-center gap-2">
                  {/* Outlined, like the pin it explains. */}
                  <span className="w-3 h-3 rounded-full bg-white border-2 border-tuggi-slate" />
                  {t("legendPassThrough")}
                </li>
              )}
            </ul>

            <AppDownloadButton
              eventLabel="route_map"
              // From `md` up: the mobile sticky bar stops there, and a tablet
              // would otherwise have no way out to the app mid-page.
              className="hidden md:inline-flex items-center gap-2 mt-6 px-6 py-3.5 bg-tuggi-primary text-tuggi-dark font-black rounded-2xl shadow-lg shadow-tuggi-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Headphones className="w-5 h-5" />
              {t("heroCtaPrimary")}
            </AppDownloadButton>
          </div>

          <div className="lg:order-1">
            <RouteStops
              stops={stops}
              activeStop={activeStop}
              onActiveChange={setActiveStop}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
