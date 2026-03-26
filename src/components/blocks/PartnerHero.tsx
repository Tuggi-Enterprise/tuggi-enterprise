"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Pause, Play } from "lucide-react";

interface PartnerHeroProps {
  partnerId?: string;
  partnerData?: {
    name: string;
    description?: string;
    audioUrl?: string;
  } | null;
}

const REDIRECT_DELAY_SECONDS = 5;
const AUDIO_MAX_DURATION = 15;
const APP_STORE_URL = "https://apps.apple.com/app/tuggi-drive/id6744379818";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.tuggidrive.app";

// Sound wave bars component
function SoundWave({ isPlaying, dark = false }: { isPlaying: boolean; dark?: boolean }) {
  const color = dark ? "bg-white" : "bg-tuggi-primary";
  return (
    <div className="flex items-end gap-[3px] h-4 w-5">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${color}`}
          animate={
            isPlaying
              ? { height: ["4px", "16px", "8px", "14px", "4px"] }
              : { height: "4px" }
          }
          transition={
            isPlaying
              ? {
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

export function PartnerHero({ partnerId, partnerData }: PartnerHeroProps) {
  const [isLogged, setIsLogged] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  const locale = useLocale();

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const MAIN_AUDIO_MAX_DURATION = 12;

  // Initialize audio element
  useEffect(() => {
    if (!partnerData?.audioUrl) return;

    const audio = new Audio(partnerData.audioUrl);
    audio.volume = 1;
    audioRef.current = audio;

    let calFilePath = 'call_en-us-male.mp3';
    const l = locale.toLowerCase();
    if (l === 'pt-br' || l === 'pt') calFilePath = 'call_pt-br-male.mp3';
    else if (l === 'pt-pt') calFilePath = 'call_pt-pt-male.mp3';
    else if (l === 'es' || l === 'es-es') calFilePath = 'call_es-es-male.mp3';
    else if (l === 'de') calFilePath = 'call_de-de-male.mp3';
    else if (l === 'it') calFilePath = 'call_it-it-male.mp3';
    else if (l === 'fr') calFilePath = 'call_fr-fr-male.mp3';

    const callAudio = new Audio(`/audio/${calFilePath}`);
    callAudio.volume = 1;
    callAudioRef.current = callAudio;

    let currentTrack = "main";

    const tryPlay = () => {
      audio.play().then(() => {
        setIsAudioPlaying(true);
        setAutoplayBlocked(false);
      }).catch(() => {
        setAutoplayBlocked(true);
      });
    };

    const playOnInteraction = () => {
      const trackToPlay = currentTrack === "main" ? audio : callAudio;
      if (!trackToPlay.paused) return; // already playing
      trackToPlay.play().then(() => {
        setIsAudioPlaying(true);
        setAutoplayBlocked(false);
        setAudioReady(true);
      }).catch((e) => console.warn(e));
      document.removeEventListener("click", playOnInteraction, true);
      document.removeEventListener("touchstart", playOnInteraction, true);
    };

    document.addEventListener("click", playOnInteraction, { once: true, capture: true });
    document.addEventListener("touchstart", playOnInteraction, { once: true, capture: true });

    audio.addEventListener("canplaythrough", () => {
      setAudioReady(true);
      if (currentTrack === "main") tryPlay();
    });

    audio.addEventListener("timeupdate", () => {
      // 1. Progress Bar Update (only if main track is active)
      if (currentTrack === "main") {
        const duration = 18; // approx total duration
        const progress = (audio.currentTime / duration) * 100;
        setAudioProgress(Math.min(progress, 100));
      }

      // 2. Smooth Fade-out logic (Starts 2.5s before the end of main track)
      const fadeStart = MAIN_AUDIO_MAX_DURATION - 2.5;
      if (audio.currentTime >= fadeStart && audio.currentTime <= MAIN_AUDIO_MAX_DURATION) {
        const remaining = MAIN_AUDIO_MAX_DURATION - audio.currentTime;
        audio.volume = Math.max(0, remaining / 2.5); // Fades from 1.0 to 0.0
      }

      // 3. Crossfade Trigger (Starts callAudio 1s before main completely stops)
      const crossfadeStart = MAIN_AUDIO_MAX_DURATION - 1;
      if (audio.currentTime >= crossfadeStart && currentTrack === "main") {
        currentTrack = "call"; // switch progress context
        callAudio.play().catch(() => {});
      }

      // 4. Final halt for main audio
      if (audio.currentTime >= MAIN_AUDIO_MAX_DURATION) {
        audio.pause();
        audio.volume = 1; // reset volume in case user replays
      }
    });

    callAudio.addEventListener("timeupdate", () => {
      if (currentTrack !== "call") return;
      const callDur = isNaN(callAudio.duration) ? 6 : callAudio.duration;
      const totalDur = MAIN_AUDIO_MAX_DURATION + callDur;
      const progress = ((MAIN_AUDIO_MAX_DURATION + callAudio.currentTime) / totalDur) * 100;
      setAudioProgress(Math.min(progress, 100));
    });

    callAudio.addEventListener("ended", () => {
      setIsAudioPlaying(false);
      setAudioProgress(100);
      currentTrack = "ended";
    });

    return () => {
      audio.pause();
      callAudio.pause();
      document.removeEventListener("click", playOnInteraction, true);
      document.removeEventListener("touchstart", playOnInteraction, true);
    };
  }, [partnerData?.audioUrl, locale]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    const callAudio = callAudioRef.current;
    if (!audio || !callAudio) return;

    let current = audio;
    if (audio.currentTime >= MAIN_AUDIO_MAX_DURATION || audio.ended) {
      current = callAudio;
    }

    if (isAudioPlaying) {
      current.pause();
      setIsAudioPlaying(false);
    } else {
      if (current === callAudio && callAudio.ended) {
        audio.currentTime = 0;
        callAudio.currentTime = 0;
        current = audio;
        setAudioProgress(0);
      }
      current.play().then(() => {
        setIsAudioPlaying(true);
        setAutoplayBlocked(false);
      }).catch((e) => {
        console.warn("Audio play failed:", e);
      });
    }
  };

  useEffect(() => {
    document.body.classList.add('no-layout');

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setPlatform("ios");
    } else if (/android/i.test(userAgent)) {
      setPlatform("android");
    }

    if (partnerId && !isLogged) {
      captureFingerprint(partnerId);
    }

    return () => {
      document.body.classList.remove('no-layout');
    };
  }, [partnerId]);

  // countdown state removed. The redirection is purely manual now to generate desire. 
  
  const captureFingerprint = async (pId: string) => {
    try {
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const { ip } = await ipResponse.json();

      const response = await fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: pId,
          client_ip: ip,
          user_agent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (response.ok) {
        setIsLogged(true);
      }
    } catch (err) {
      console.warn("Atribuição falhou, mas redirecionando mesmo assim...", err);
    }
  };

  const handleRedirect = () => {
    setIsRedirecting(true);
    const targetUrl = platform === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    window.location.href = targetUrl;
  };

  const t = useTranslations("Download");

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const descriptionText = partnerData?.description || t("heroSubtitle");
  const maxDescLength = 120;
  const isLongDesc = descriptionText.length > maxDescLength;

  return (
    <section className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-tuggi-bg text-tuggi-dark">
      {/* Soft background accents */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] rounded-full bg-tuggi-primary blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.10, 0.04] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full bg-tuggi-secondary blur-[100px]"
        />
      </div>

      <div className="container relative z-10 mx-auto px-5 flex flex-col items-center justify-center min-h-screen pt-10 pb-8">
        {/* Main Content */}
        <div className="max-w-md w-full flex flex-col items-center pb-28">
          
          {/* Logo Tuggi */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5"
          >
            <Image
              src="/images/logo_tuggi_full.png"
              alt="Tuggi"
              width={180}
              height={54}
              className="h-12 w-auto"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-center w-full"
          >
            {/* Typography Hierarchy */}
            <h1 className="mb-5">
              {partnerData?.name ? (
                <>
                  <span className="block text-2xl md:text-3xl font-bold text-tuggi-primary">
                    &amp;
                  </span>
                  <span className="block text-3xl md:text-4xl font-extrabold text-tuggi-dark leading-tight mt-1">
                    {partnerData.name}
                  </span>
                  <span className="block text-lg md:text-xl font-medium text-tuggi-slate mt-3">
                    Your <span className="text-tuggi-secondary italic font-bold">Experiences</span> start now!
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-3xl md:text-4xl font-extrabold text-tuggi-dark leading-tight">
                    {t("heroTitle1")}
                  </span>
                  <span className="block text-lg md:text-xl font-medium text-tuggi-slate mt-2">
                    <span className="text-tuggi-secondary italic font-bold">{t("heroTitle2")}</span> {t("heroTitle3")}
                  </span>
                </>
              )}
            </h1>
            
            {/* Description with collapse */}
            <p className="text-tuggi-slate text-sm md:text-base mb-6 leading-relaxed max-w-sm mx-auto">
              {isDescExpanded || !isLongDesc ? descriptionText : `${descriptionText.substring(0, maxDescLength)}...`}
              {isLongDesc && (
                <button 
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="ml-1.5 text-tuggi-primary font-semibold text-xs focus:outline-none uppercase tracking-wider hover:underline"
                >
                  {isDescExpanded ? 'LESS' : 'MORE'}
                </button>
              )}
            </p>

            {/* Audio Player */}
            {partnerData?.audioUrl && audioReady && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-sm mx-auto"
              >
                <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-tuggi-primary via-tuggi-secondary to-tuggi-primary">
                  <div className="bg-tuggi-dark rounded-2xl overflow-hidden">
                    <button
                      onClick={toggleAudio}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left focus:outline-none active:bg-white/5 transition-colors"
                    >
                      {/* Sound Wave / Play Icon */}
                      <div className="w-10 h-10 rounded-full bg-tuggi-primary/20 flex items-center justify-center flex-shrink-0">
                        {isAudioPlaying ? (
                          <SoundWave isPlaying={true} dark={true} />
                        ) : autoplayBlocked ? (
                          <Play size={16} className="text-tuggi-primary ml-0.5" />
                        ) : (
                          <SoundWave isPlaying={false} dark={true} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate leading-tight">
                          {partnerData.name || 'TUGGI'}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {isAudioPlaying ? 'Playing...' : autoplayBlocked ? 'Tap to listen' : 'Paused'}
                        </p>
                      </div>

                      {/* Play/Pause */}
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        {isAudioPlaying ? (
                          <Pause size={14} className="text-white" />
                        ) : (
                          <Play size={14} className="text-white ml-0.5" />
                        )}
                      </div>
                    </button>

                    {/* Progress Bar */}
                    <div className="w-full h-[3px] bg-white/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-tuggi-secondary to-tuggi-primary"
                        style={{ width: `${audioProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Floating CTA */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", damping: 20 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-6 pt-10 bg-gradient-to-t from-tuggi-bg via-tuggi-bg/95 to-transparent pointer-events-none"
        >
          <button 
            onClick={handleRedirect}
            className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-4 bg-tuggi-primary text-white font-black text-base rounded-2xl shadow-[0_8px_32px_rgba(0,168,232,0.3)] hover:shadow-[0_8px_40px_rgba(0,168,232,0.45)] hover:scale-[1.02] active:scale-95 transition-all pointer-events-auto"
          >
            {isRedirecting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t("openingStore")}
              </>
            ) : (
              <>
                {t("cta")}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="text-center text-tuggi-slate/50 text-[9px] uppercase tracking-[0.2em] font-bold mt-3 pointer-events-none">
            {t("trustFooter")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
