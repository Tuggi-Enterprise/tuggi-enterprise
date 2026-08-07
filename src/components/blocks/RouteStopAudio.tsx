"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, Volume2 } from "lucide-react";

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
 * One clip plays at a time across the whole page. A route can carry a dozen
 * previews, and two of them talking over each other is the worst thing this
 * page can do.
 */
let playingAudio: HTMLAudioElement | null = null;

/** Seconds → "1:07". Returns "--:--" while the duration is still unknown. */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Audio preview with a language switcher. Shows ALL available audio languages
 * for the stop (e.g. EN · ES · PT-BR · PT-PT · IT) — the page's language is
 * pre-selected; tapping a chip swaps the clip and remounts the player.
 */
export function RouteStopAudio({ audios, defaultLang, stopName }: RouteStopAudioProps) {
  const t = useTranslations("Tours");
  const initial = audios.find((a) => a.lang === defaultLang) ?? audios[0];
  const [active, setActive] = useState(initial.lang);
  const current = audios.find((a) => a.lang === active) ?? initial;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-tuggi-primary-text">
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

      <AudioPlayer key={current.lang} src={current.audioUrl} stopName={stopName} />
    </div>
  );
}

/**
 * Player built on a real <audio> element with the native chrome turned off.
 *
 * The browser's default controls look different in every browser and nothing
 * like the rest of the site — and this page shows up to a dozen of them. The
 * element still does the work (and keeps `preload="none"`, so opening a route
 * downloads no audio at all); the seek bar is a range input, which is keyboard
 * and screen-reader operable for free.
 */
function AudioPlayer({ src, stopName }: { src: string; stopName: string }) {
  const t = useTranslations("Tours");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => {
      if (playingAudio && playingAudio !== el) playingAudio.pause();
      playingAudio = el;
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
    };
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      if (playingAudio === el) playingAudio = null;
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    // A failed play() rejects (offline, bad range request) — swallow it and
    // fall back to the paused state rather than leaving a dangling rejection.
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const known = isFinite(duration) && duration > 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("audioPause") : t("audioPreviewFor", { name: stopName })}
        className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-tuggi-primary text-tuggi-dark shadow-sm transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2"
      >
        {playing ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-px" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={known ? duration : 0}
          step={0.1}
          value={time}
          disabled={!known}
          onChange={(e) => {
            const el = audioRef.current;
            if (!el) return;
            el.currentTime = Number(e.target.value);
            setTime(el.currentTime);
          }}
          aria-label={t("audioSeek")}
          aria-valuetext={formatTime(time)}
          // accent-tuggi-primary-text, not -primary: the thumb and the filled
          // part of the track are the only visual carrier of this control's
          // value, and brand cyan on the white track is 2.70:1, under the 3:1
          // SC 1.4.11 asks of a non-text component. #007aa5 is 4.85:1.
          className="w-full h-6 accent-tuggi-primary-text cursor-pointer disabled:cursor-default"
        />
        <div className="flex justify-between text-[11px] font-semibold tabular-nums text-tuggi-slate">
          <span>{formatTime(time)}</span>
          <span>{known ? formatTime(duration) : "--:--"}</span>
        </div>
      </div>

      {playing && (
        <div className="hidden sm:flex shrink-0 items-end gap-0.5 h-5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="tuggi-eq-bar w-1 h-full rounded-full bg-tuggi-primary" />
          ))}
        </div>
      )}

      <audio ref={audioRef} preload="none" src={src} />
    </div>
  );
}
