"use client";

import { useTranslations } from "next-intl";
import { MapPin, Volume2 } from "lucide-react";

export interface RouteStopView {
  /** 1-based position used for the #stop-N anchor and the marker number. */
  position: number;
  name: string;
  description: string;
  audioUrl: string | null;
  isGeneric: boolean;
}

interface RouteStopsProps {
  stops: RouteStopView[];
}

/**
 * Vertical numbered itinerary. Each stop shows its name, a short description,
 * and — when available — a native audio preview (the 30s clip). Native
 * <audio> keeps it accessible and adds no custom JS. Generic stops (no linked
 * POI) appear in sequence with a lighter style and no player.
 */
export function RouteStops({ stops }: RouteStopsProps) {
  const t = useTranslations("Tours");

  return (
    <section className="py-16 bg-white" aria-labelledby="itinerary-heading">
      <div className="container mx-auto px-6 max-w-3xl">
        <h2
          id="itinerary-heading"
          className="text-3xl md:text-4xl font-black text-tuggi-dark mb-3"
        >
          {t("itineraryTitle")}
        </h2>
        <p className="text-tuggi-slate mb-10">{t("itinerarySubtitle")}</p>

        <ol className="relative border-l-2 border-tuggi-primary/20 ml-3">
          {stops.map((stop) => (
            <li
              key={stop.position}
              id={`stop-${stop.position}`}
              className="mb-10 ml-8 scroll-mt-28"
            >
              <span
                className={`absolute -left-[15px] flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-black ring-4 ring-white ${
                  stop.isGeneric ? "bg-tuggi-slate" : "bg-tuggi-primary"
                }`}
                aria-hidden="true"
              >
                {stop.position}
              </span>

              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  stop.isGeneric
                    ? "border-gray-100 bg-tuggi-bg/40"
                    : "border-gray-100 bg-tuggi-bg"
                }`}
              >
                <h3 className="flex items-center gap-2 text-lg font-bold text-tuggi-dark">
                  <MapPin className="w-4 h-4 text-tuggi-primary shrink-0" />
                  {stop.name}
                </h3>

                {stop.description && (
                  <p className="mt-2 text-tuggi-slate leading-relaxed">
                    {stop.description}
                  </p>
                )}

                {stop.audioUrl ? (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-tuggi-primary">
                      <Volume2 className="w-4 h-4" />
                      {t("audioPreview")}
                    </div>
                    <audio
                      controls
                      preload="none"
                      className="w-full"
                      aria-label={t("audioPreviewFor", { name: stop.name })}
                    >
                      <source src={stop.audioUrl} type="audio/mpeg" />
                    </audio>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
