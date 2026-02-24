"use client";

import { useTranslations } from "next-intl";
import { useState, useRef } from "react";
import { Play, Pause, Volume2, Navigation } from "lucide-react";

interface AudioCardProps {
  title: string;
  location: string;
  dirSrc: string;
  descSrc: string;
}

function AudioCard({ title, location, dirSrc, descSrc }: AudioCardProps) {
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
          <h4 className="text-lg font-bold text-white mb-1">{title}</h4>
          <p className="text-sm text-slate-400 flex items-center gap-1">
            {location}
          </p>
        </div>
        <button 
          onClick={handlePlayPause}
          className="w-12 h-12 rounded-full bg-tuggi-primary text-white flex items-center justify-center hover:bg-blue-500 transition-colors flex-shrink-0 shadow-[0_0_15px_rgba(0,168,232,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5 ml-1" aria-hidden="true" />}
        </button>
      </div>

      {/* Visual Indicator of what is playing */}
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${activePart === 1 ? 'bg-tuggi-primary/20 text-tuggi-primary' : 'bg-slate-800 text-slate-500'}`}>
          <Navigation className="w-3 h-3" aria-hidden="true" />
          <span>Direcional</span>
        </div>
        <div className="w-4 h-px bg-slate-700" aria-hidden="true"></div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${activePart === 2 ? 'bg-tuggi-secondary/20 text-tuggi-secondary' : 'bg-slate-800 text-slate-500'}`}>
          <Volume2 className="w-3 h-3" aria-hidden="true" />
          <span>História</span>
        </div>
      </div>

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
          />
          <AudioCard 
            title={t("sample2Title")}
            location={t("sample2Loc")}
            dirSrc="/audio/sample2-dir.mp3"
            descSrc="/audio/sample2-desc.mp3"
          />
          <AudioCard 
            title={t("sample3Title")}
            location={t("sample3Loc")}
            dirSrc="/audio/sample3-dir.mp3"
            descSrc="/audio/sample3-desc.mp3"
          />
        </div>

        <p className="text-center text-slate-500 text-sm font-medium">
          {t("socialProof")}
        </p>

      </div>
    </section>
  );
}
