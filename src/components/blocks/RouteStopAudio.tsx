"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";

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
 * Audio preview with a language switcher. Shows ALL available audio languages
 * for the stop (e.g. EN · ES · PT-BR · PT-PT · IT) — the page's language is
 * pre-selected; tapping a chip swaps the clip. Showcases Tuggi's translation
 * coverage. Native <audio> keeps it accessible; remounting on language change
 * (via `key`) loads the new source.
 */
export function RouteStopAudio({ audios, defaultLang, stopName }: RouteStopAudioProps) {
  const t = useTranslations("Tours");
  const initial = audios.find((a) => a.lang === defaultLang) ?? audios[0];
  const [active, setActive] = useState(initial.lang);
  const current = audios.find((a) => a.lang === active) ?? initial;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-tuggi-primary">
        <Volume2 className="w-4 h-4" />
        {t("audioPreview")}
      </div>

      {audios.length > 1 && (
        <div
          className="flex flex-wrap gap-1.5 mb-2"
          role="group"
          aria-label={t("audioLanguages")}
        >
          {audios.map((a) => (
            <button
              key={a.lang}
              type="button"
              onClick={() => setActive(a.lang)}
              aria-pressed={a.lang === active}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-full border transition-colors ${
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

      <audio
        key={current.lang}
        controls
        preload="none"
        className="w-full"
        aria-label={t("audioPreviewFor", { name: stopName })}
      >
        <source src={current.audioUrl} type="audio/mpeg" />
      </audio>
    </div>
  );
}
