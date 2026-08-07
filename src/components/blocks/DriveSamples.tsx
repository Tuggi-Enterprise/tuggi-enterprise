"use client";

import { useTranslations } from "next-intl";
import { useState, useRef } from "react";
import { Play, Volume2, Navigation } from "lucide-react";

interface AudioCardProps {
  title: string;
  location: string;
  dirSrc: string;
  descSrc: string;
  directionalLabel: string;
  storyLabel: string;
  playLabel: string;
  pauseLabel: string;
}

/** 4-bar CSS equalizer shown while a clip plays (freezes mid-height under
 *  reduced motion — see globals.css). Matches the home audio section. */
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

function AudioCard({
  title,
  location,
  dirSrc, 
  descSrc, 
  directionalLabel, 
  storyLabel,
  playLabel,
  pauseLabel
}: AudioCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePart, setActivePart] = useState<1 | 2>(1); // 1 = Directional, 2 = Descriptive
  const dirAudioRef = useRef<HTMLAudioElement>(null);
  const descAudioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (activePart === 1) dirAudioRef.current?.pause();
      else descAudioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (activePart === 1) dirAudioRef.current?.play();
      else descAudioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleDirEnded = () => {
    setActivePart(2);
    descAudioRef.current?.play();
  };

  const handleDescEnded = () => {
    setIsPlaying(false);
    setActivePart(1); // Reset back to start
  };

  return (
    <div className="bg-[#121a28] border border-slate-800 p-6 rounded-2xl flex flex-col gap-6 hover:border-tuggi-primary/50 transition-colors shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-400 flex items-center gap-1">
            {location}
          </p>
        </div>
        <button 
          onClick={handlePlayPause}
          className="w-12 h-12 rounded-full bg-tuggi-primary text-tuggi-dark flex items-center justify-center hover:bg-tuggi-primary-text transition-colors flex-shrink-0 shadow-[0_0_15px_rgba(0,168,232,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark"
          aria-label={isPlaying ? pauseLabel : playLabel}
        >
          {isPlaying ? <Equalizer /> : <Play className="w-5 h-5 ml-1" aria-hidden="true" />}
        </button>
      </div>

      {/* Which of the two chained clips is playing.
          It used to be colour and nothing else, and the second clip starts on
          its own when the first ends (handleDirEnded) — so a screen-reader user
          got no signal that anything had changed (SC 1.3.1 / 4.1.2).
          `aria-current` carries the state into the accessibility tree, and the
          live region below announces the switch when it happens. The inactive
          chip moved from text-slate-500 (3.07:1 on slate-800, under 4.5:1 at
          12px) to text-slate-400 (5.56:1) — SC 1.4.3. */}
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider">
        <div
          aria-current={activePart === 1 ? "true" : undefined}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${activePart === 1 ? 'bg-tuggi-primary/20 text-tuggi-primary' : 'bg-slate-800 text-slate-400'}`}
        >
          <Navigation className="w-3 h-3" aria-hidden="true" />
          <span>{directionalLabel}</span>
        </div>
        <div className="w-4 h-px bg-slate-700" aria-hidden="true"></div>
        <div
          aria-current={activePart === 2 ? "true" : undefined}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${activePart === 2 ? 'bg-tuggi-secondary/20 text-tuggi-secondary' : 'bg-slate-800 text-slate-400'}`}
        >
          <Volume2 className="w-3 h-3" aria-hidden="true" />
          <span>{storyLabel}</span>
        </div>
      </div>
      <span role="status" className="sr-only">
        {isPlaying ? (activePart === 1 ? directionalLabel : storyLabel) : ""}
      </span>

      {/* Audio Elements (Hidden) */}
      <audio ref={dirAudioRef} src={dirSrc} onEnded={handleDirEnded} />
      <audio ref={descAudioRef} src={descSrc} onEnded={handleDescEnded} />
    </div>
  );
}

export function DriveSamples() {
  const t = useTranslations("Drive.Samples");

  return (
    <section className="py-24 bg-tuggi-dark text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <span className="text-tuggi-primary font-bold text-sm tracking-widest uppercase mb-4 block">
            {t("tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <AudioCard 
            title={t("sample1Title")}
            location={t("sample1Loc")}
            dirSrc="/audio/sample1-dir.mp3"
            descSrc="/audio/sample1-desc.mp3"
            directionalLabel={t("directional")}
            storyLabel={t("story")}
            playLabel={t("play")}
            pauseLabel={t("pause")}
          />
          <AudioCard 
            title={t("sample2Title")}
            location={t("sample2Loc")}
            dirSrc="/audio/sample2-dir.mp3"
            descSrc="/audio/sample2-desc.mp3"
            directionalLabel={t("directional")}
            storyLabel={t("story")}
            playLabel={t("play")}
            pauseLabel={t("pause")}
          />
          <AudioCard 
            title={t("sample3Title")}
            location={t("sample3Loc")}
            dirSrc="/audio/sample3-dir.mp3"
            descSrc="/audio/sample3-desc.mp3"
            directionalLabel={t("directional")}
            storyLabel={t("story")}
            playLabel={t("play")}
            pauseLabel={t("pause")}
          />
        </div>

        {/* A social-proof line with a five-figure play count lived here, next
            to a TODO asking whether it was accurate. It is not: BR-COMUNICACAO-003
            item 3 — drive.poi_visits held 1,653 raw plays, 201 of them from 7
            external users. Item 4 says no rounding fixes a figure with no source,
            and item 5 says nothing takes its place until question 72 closes. */}
      </div>
    </section>
  );
}
