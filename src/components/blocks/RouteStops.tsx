"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { RouteStopAudio, type StopAudioOption } from "@/components/blocks/RouteStopAudio";

export interface RouteStopView {
  /** 1-based position used for the #stop-N anchor and the marker number. */
  position: number;
  /**
   * Extra positions folded into this entry (consecutive duplicates). Their
   * anchors still resolve here, so every map pin has a destination.
   */
  alsoPositions: number[];
  name: string;
  description: string;
  /** All available audio languages for this stop (multi-language player). */
  audios: StopAudioOption[];
  /** Audio language pre-selected for this page (the page locale's dialect). */
  defaultLang: string;
  /** Has a description and/or audio — drives the card vs. compact-line split. */
  hasContent: boolean;
}

interface RouteStopsProps {
  stops: RouteStopView[];
  /** Stop currently being read, mirrored on the map. */
  activeStop: number | null;
  /** Reports the stop that scrolled into the reading band. */
  onActiveChange: (position: number) => void;
}

/**
 * Vertical numbered itinerary.
 *
 * A stop with a description and/or audio gets a full card. A stop with neither
 * — half of them across the catalogue — is a single quiet line instead, so the
 * page stops spending a card-sized block on a bare name. Either way the
 * numbering matches the map pins exactly.
 *
 * Scrolling drives the map: an IntersectionObserver reports whichever stop sits
 * in the upper third of the viewport, which is the one the reader is on.
 */
export function RouteStops({ stops, activeStop, onActiveChange }: RouteStopsProps) {
  const t = useTranslations("Tours");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLElement>("li[data-position]");
    if (!items?.length) return;

    // The band is the top third of the viewport: what you are reading, not what
    // is merely on screen. Without it, the last stop would win on every scroll.
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const position = Number(entry.target.getAttribute("data-position"));
          if (entry.isIntersecting) visible.add(position);
          else visible.delete(position);
        }
        if (visible.size) onActiveChange(Math.min(...visible));
      },
      { rootMargin: "-12% 0px -66% 0px", threshold: 0 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [stops, onActiveChange]);

  return (
    <ol ref={listRef} className="relative border-l-2 border-tuggi-primary/20 ml-3">
      {stops.map((stop) => {
        const isActive =
          activeStop === stop.position || stop.alsoPositions.includes(activeStop ?? -1);

        return (
          <li
            key={stop.position}
            id={`stop-${stop.position}`}
            data-position={stop.position}
            className={`ml-8 scroll-mt-28 ${stop.hasContent ? "mb-10" : "mb-5"}`}
          >
            {/* Anchors for the positions merged into this entry, so clicking
                either map pin still lands on the right block. */}
            {stop.alsoPositions.map((p) => (
              <span key={p} id={`stop-${p}`} className="block scroll-mt-28" aria-hidden />
            ))}

            <span
              // Filled vs outlined, mirroring the map pins — the two states
              // must differ without relying on colour (WCAG 1.4.1).
              className={`absolute -left-[15px] flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ring-4 ring-white transition-transform motion-reduce:transition-none ${
                stop.hasContent
                  ? "bg-tuggi-primary text-tuggi-dark"
                  : "bg-white text-tuggi-slate border-2 border-tuggi-slate"
              } ${isActive ? "scale-125" : ""}`}
              aria-hidden="true"
            >
              {stop.position}
            </span>

            {stop.hasContent ? (
              <div
                className={`rounded-2xl border bg-tuggi-bg p-5 shadow-sm transition-colors motion-reduce:transition-none ${
                  isActive ? "border-tuggi-primary" : "border-gray-100"
                }`}
              >
                <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-tuggi-dark">
                  <MapPin className="w-4 h-4 text-tuggi-primary shrink-0" />
                  {stop.name}
                  {stop.alsoPositions.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white text-tuggi-slate">
                      {t("stopsMerged", {
                        from: stop.position,
                        to: stop.alsoPositions[stop.alsoPositions.length - 1],
                      })}
                    </span>
                  )}
                </h3>

                {stop.description && (
                  <p className="mt-2 text-tuggi-slate leading-relaxed">{stop.description}</p>
                )}

                {stop.audios.length > 0 && (
                  <RouteStopAudio
                    audios={stop.audios}
                    defaultLang={stop.defaultLang}
                    stopName={stop.name}
                  />
                )}
              </div>
            ) : (
              <h3
                className={`flex items-center gap-2 py-1 font-semibold ${
                  isActive ? "text-tuggi-primary-text" : "text-tuggi-dark"
                }`}
              >
                <MapPin className="w-4 h-4 text-tuggi-slate/60 shrink-0" />
                {stop.name}
              </h3>
            )}
          </li>
        );
      })}
    </ol>
  );
}
