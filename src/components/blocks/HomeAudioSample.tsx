"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Play } from "lucide-react";

interface SampleCardProps {
  title: string;
  location: string;
  src: string;
  playLabel: string;
  pauseLabel: string;
}

/** 4-bar CSS equalizer shown while a clip plays (freezes mid-height under
 *  reduced motion — see globals.css). Dark bars on the cyan play button: white
 *  on --color-tuggi-primary is 2.70:1, and this is the only thing that says the
 *  clip is running (SC 1.4.11, DS-COR-004). */
function Equalizer() {
  return (
    <span className="flex items-end gap-[3px] h-5" aria-hidden="true">
      <span className="tuggi-eq-bar w-1 h-full rounded-full bg-tuggi-dark" />
      <span className="tuggi-eq-bar w-1 h-full rounded-full bg-tuggi-dark" />
      <span className="tuggi-eq-bar w-1 h-full rounded-full bg-tuggi-dark" />
      <span className="tuggi-eq-bar w-1 h-full rounded-full bg-tuggi-dark" />
    </span>
  );
}

function SampleCard({ title, location, src, playLabel, pauseLabel }: SampleCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
  };

  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? pauseLabel : playLabel}
        className="w-14 h-14 rounded-full bg-tuggi-primary text-tuggi-dark flex items-center justify-center hover:bg-tuggi-primary-text transition-[background-color,transform] duration-150 active:scale-95 motion-reduce:active:scale-100 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2"
      >
        {isPlaying ? (
          <Equalizer />
        ) : (
          <Play className="w-6 h-6 ml-0.5" aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0">
        <p className="font-bold text-tuggi-dark truncate">{title}</p>
        <p className="text-sm text-tuggi-slate truncate">{location}</p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}

/**
 * "Hear a sample" — a minimal, accessible player with two real story clips
 * reused from public/audio/. Native <audio> under the hood; the button owns the
 * accessible label and stays in sync via play/pause/ended events. While a clip
 * plays, its play icon becomes a live equalizer.
 */
export function HomeAudioSample() {
  const t = useTranslations("Home.AudioSample");

  return (
    <section className="bg-white py-20 lg:py-24 border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-3">
          {t("title")}
        </h2>
        <p className="text-lg text-tuggi-slate mb-10">{t("subtitle")}</p>

        <div className="grid sm:grid-cols-2 gap-4 text-left">
          <SampleCard
            title={t("sample1Title")}
            location={t("sample1Loc")}
            src="/audio/sample1-desc.mp3"
            playLabel={t("play")}
            pauseLabel={t("pause")}
          />
          <SampleCard
            title={t("sample2Title")}
            location={t("sample2Loc")}
            src="/audio/sample2-desc.mp3"
            playLabel={t("play")}
            pauseLabel={t("pause")}
          />
        </div>
      </div>
    </section>
  );
}
