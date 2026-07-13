"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

interface SampleCardProps {
  title: string;
  location: string;
  src: string;
  playLabel: string;
  pauseLabel: string;
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
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? pauseLabel : playLabel}
        className="w-14 h-14 rounded-full bg-tuggi-primary text-white flex items-center justify-center hover:bg-[#0090c9] transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6" aria-hidden="true" />
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
 * accessible label and stays in sync via play/pause/ended events.
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
