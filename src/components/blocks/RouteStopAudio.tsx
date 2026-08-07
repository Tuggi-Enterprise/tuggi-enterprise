"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";
import { AudioSampleCard } from "./AudioSampleCard";

export interface StopAudioOption {
  lang: string;
  label: string;
  audioUrl: string;
}

interface RouteStopAudioProps {
  audios: StopAudioOption[];
  /** Language pre-selected for this page (the page locale's dialect). */
  defaultLang: string;
  stopName: string;
}

/**
 * The language switcher for a route stop — a layer *around* the shared player,
 * not a player of its own (spec §1.9, card #193).
 *
 * This file used to hold the best of the site's three players, and it is the
 * one the global card was built from: a real `<audio>`, a range input for the
 * seek, `preload="none"` and a colour pair that passes. What is left here is
 * the part that only a route stop needs — every clip of the stop, in every
 * language, with the page's own dialect selected.
 *
 * `preload="none"` stays, and it is the reason the card takes that prop: a
 * route can carry a dozen stops, and a dozen metadata requests on a phone
 * abroad buys a duration nobody asked for.
 */
export function RouteStopAudio({ audios, defaultLang, stopName }: RouteStopAudioProps) {
  const t = useTranslations("Tours");
  const initial = audios.find((a) => a.lang === defaultLang) ?? audios[0];
  const [active, setActive] = useState(initial.lang);
  const current = audios.find((a) => a.lang === active) ?? initial;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-tuggi-primary-text">
        <Volume2 className="w-4 h-4" aria-hidden="true" />
        {t("audioPreview")}
      </div>

      {audios.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label={t("audioLanguages")}>
          {audios.map((a) => (
            <button
              key={a.lang}
              type="button"
              onClick={() => setActive(a.lang)}
              aria-pressed={a.lang === active}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                a.lang === active
                  ? "bg-tuggi-primary text-tuggi-dark border-tuggi-primary"
                  : "bg-tuggi-bg text-tuggi-slate border-gray-200 hover:border-tuggi-primary"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Remounted per language: swapping the src under a playing element
          leaves the position and the duration of the previous clip on screen.
          The clip's URL is the sample id — stable, never translated, and the
          only thing that identifies one recording of one stop. */}
      <AudioSampleCard
        key={current.lang}
        preload="none"
        sample={{
          id: current.audioUrl,
          placeName: stopName,
          src: current.audioUrl,
          audioLang: current.lang,
          transcript: null,
        }}
      />
    </div>
  );
}
