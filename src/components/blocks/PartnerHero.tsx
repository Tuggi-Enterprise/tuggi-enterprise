"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Check, Copy, Gift, Loader2, Pause, Play } from "lucide-react";

interface CouponPreview {
  code: string;
  days: number;
}

interface PartnerHeroProps {
  partnerId?: string;
  partnerData?: {
    name: string | null;
    description?: string;
    audioUrl?: string;
    isTuggi?: boolean;
  } | null;
  /** When present, render the gift-card style redeem block. */
  coupon?: CouponPreview;
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

export function PartnerHero({ partnerId, partnerData, coupon }: PartnerHeroProps) {
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

  const isTuggi = partnerData?.isTuggi;
  const MAIN_AUDIO_MAX_DURATION = isTuggi ? 9999 : 12;

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
      if (!trackToPlay.paused) {
        document.removeEventListener("click", playOnInteraction, true);
        document.removeEventListener("touchstart", playOnInteraction, true);
        return;
      }
      
      const playPromise = trackToPlay.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsAudioPlaying(true);
          setAutoplayBlocked(false);
          setAudioReady(true);

          // Prime the secondary track synchronously so iOS unlocks it
          if (currentTrack === "main") {
            callAudio.play().then(() => {
              callAudio.pause();
              callAudio.currentTime = 0;
            }).catch(() => {});
          }

          // Dispara tag de auto-play engatado
          trackEvent("download_page_audio_auto_played");

          // Only remove listeners after successful playback
          document.removeEventListener("click", playOnInteraction, true);
          document.removeEventListener("touchstart", playOnInteraction, true);
        }).catch((e) => {
          console.warn("Autoplay still blocked on this interaction:", e);
        });
      }
    };

    document.addEventListener("click", playOnInteraction, { capture: true });
    document.addEventListener("touchstart", playOnInteraction, { capture: true });

    audio.addEventListener("canplaythrough", () => {
      setAudioReady(true);
      if (currentTrack === "main") tryPlay();
    });

    audio.addEventListener("ended", () => {
      if (isTuggi) {
        setIsAudioPlaying(false);
        setAudioProgress(100);
        currentTrack = "ended";
      }
    });

    audio.addEventListener("timeupdate", () => {
      // 1. Progress Bar Update (only if main track is active)
      if (currentTrack === "main") {
        const totalDur = isTuggi ? (audio.duration || 0) : 18;
        const progress = totalDur > 0 ? (audio.currentTime / totalDur) * 100 : 0;
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
      trackEvent("download_page_play_button_click", { action: "pause" });
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
        trackEvent("download_page_play_button_click", { action: "play" });
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
  
  // Helper de Tagueamento (GA4 Nativo / gtag.js)
  const trackEvent = (eventName: string, details?: any) => {
    // 1. Console log visível para auditoria local
    console.log(`[Tagueamento] ${eventName}`, details || "");
    
    // 2. Disparo oficial pro Google Analytics (gtag)
    if (typeof window !== "undefined") {
      const payload = {
        partner_id: partnerId,
        platform: platform,
        ...details
      };

      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", eventName, payload);
      } else {
        // Fallback genérico caso a gtag ainda não tenha carregado
        const dataLayer = (window as any).dataLayer || [];
        dataLayer.push({ event: eventName, ...payload });
        (window as any).dataLayer = dataLayer;
      }
    }
  };

  // Dispara um page_view dedicado desta tela para contabilizar os IDs unicamente
  useEffect(() => {
    if (partnerId) {
      trackEvent("partner_download_page_view");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  // Coupon-mode page view (separate funnel attribution from partner QR flow).
  useEffect(() => {
    if (coupon?.code) {
      trackEvent("redeem_landing_page_view", {
        code: coupon.code,
        days: coupon.days,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupon?.code]);

  const [couponCopied, setCouponCopied] = useState(false);

  const handleCopyCoupon = async () => {
    if (!coupon?.code) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCouponCopied(true);
      trackEvent("redeem_code_copied", { code: coupon.code });
      setTimeout(() => setCouponCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silent fail, the code is still visible.
    }
  };

  const handleRedeemTap = () => {
    if (!coupon?.code) return;
    trackEvent("redeem_cta_clicked", {
      code: coupon.code,
      days: coupon.days,
    });
    // Custom-scheme deep link. iOS surfaces "Open in Tuggi?" prompt when the
    // app is installed; Android prompts the disambiguation chooser. Users
    // without the app fall through to the existing store CTA below.
    window.location.href = `tuggi://redeem?code=${encodeURIComponent(coupon.code)}`;
  };

  const captureFingerprint = async (pId: string) => {
    // ✅ CLIPBOARD: Write partner_id to clipboard immediately.
    // App reads this on first launch (Layer 1 attribution).
    // Survives network changes (WiFi → 4G) unlike IP fingerprinting.
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pId);
      }
    } catch {
      // Silent fail — fingerprint fallback covers this case
    }

    // ✅ FINGERPRINT: Record click in DB for server-side matching
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
      console.warn("Fingerprint capture failed, clipboard fallback active.", err);
    }
  };

  const handleRedirect = () => {
    setIsRedirecting(true);
    trackEvent("download_page_cta_click", { target_store: platform === "ios" ? "app_store" : "play_store" });

    let targetUrl: string;
    if (platform === "ios") {
      targetUrl = APP_STORE_URL;
    } else {
      // ✅ PLAY REFERRER: Append referrer param so Android InstallReferrerClient
      // can read the partner_id on first app launch (100% reliable, survives IP changes)
      targetUrl = partnerId
        ? `${PLAY_STORE_URL}&referrer=${encodeURIComponent('partner_id_' + partnerId)}`
        : PLAY_STORE_URL;
    }

    window.location.href = targetUrl;
  };

  const t = useTranslations("Download");
  const tCoupon = useTranslations("Coupon");

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const descriptionText = partnerData?.description || t("heroSubtitle");
  const maxDescLength = 220;
  const isLongDesc = descriptionText.length > maxDescLength;

  // Inline translation pro MORE/LESS local
  const isPt = locale.includes("pt");
  const isEs = locale.includes("es");
  const tMore = isPt ? "MAIS" : isEs ? "MÁS" : "MORE";
  const tLess = isPt ? "MENOS" : isEs ? "MENOS" : "LESS";

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

      <div className="container relative z-10 mx-auto px-5 flex flex-col items-center min-h-screen pt-[12vh] pb-8">
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
              {isTuggi ? (
                <>
                  <span className="block text-3xl md:text-4xl font-extrabold text-tuggi-dark leading-tight">
                    {locale.includes("pt") ? "Bem-vindo à" : locale.includes("es") ? "Bienvenido a la" : "Welcome to the"}
                  </span>
                  <span className="block text-3xl md:text-5xl font-black text-tuggi-primary mt-1 uppercase tracking-tight">
                    Experiência Tuggi
                  </span>
                  <span className="block text-lg md:text-xl font-medium text-tuggi-slate mt-3">
                    {t("heroTitle1")} <span className="text-tuggi-secondary italic font-bold">{t("heroTitle2")}</span> {t("heroTitle3")}
                  </span>
                </>
              ) : partnerData?.name ? (
                <>
                  <span className="block text-2xl md:text-3xl font-bold text-tuggi-primary">
                    &amp;
                  </span>
                  <span className="block text-3xl md:text-4xl font-extrabold text-tuggi-dark leading-tight mt-1">
                    {partnerData.name}
                  </span>
                  <span className="block text-lg md:text-xl font-medium text-tuggi-slate mt-3">
                    {t("heroTitle1")} <span className="text-tuggi-secondary italic font-bold">{t("heroTitle2")}</span> {t("heroTitle3")}
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
                  onClick={() => {
                    const newState = !isDescExpanded;
                    setIsDescExpanded(newState);
                    trackEvent("download_page_description_toggle", { action: newState ? "expand" : "collapse" });
                  }}
                  className="ml-1.5 text-tuggi-primary font-semibold text-xs focus:outline-none uppercase tracking-wider hover:underline"
                >
                  {isDescExpanded ? tLess : tMore}
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
                <div className="relative bg-white rounded-2xl p-4 shadow-[0_8px_32px_rgba(8,17,33,0.06)] border border-slate-100/60 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {/* AVATAR / SOUNDWAVE */}
                    <div className="relative w-12 h-12 rounded-full bg-tuggi-bg flex items-center justify-center shrink-0">
                      {isAudioPlaying ? (
                        <>
                          <SoundWave isPlaying={true} dark={false} />
                          <span className="absolute inset-0 rounded-full border border-tuggi-primary animate-ping opacity-20"></span>
                        </>
                      ) : autoplayBlocked ? (
                        <Play size={20} className="text-tuggi-primary ml-1" />
                      ) : (
                        <SoundWave isPlaying={false} dark={false} />
                      )}
                    </div>

                    {/* TEXT INFO */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-tuggi-dark truncate text-sm">
                        {isTuggi ? 'TUGGI' : (partnerData.name || 'TUGGI')}
                      </p>
                      <p className="text-[11px] text-tuggi-slate flex items-center gap-1.5 mt-0.5 font-medium">
                        {isAudioPlaying ? (
                          <span className="text-tuggi-primary flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tuggi-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tuggi-primary"></span>
                            </span>
                            Playing 
                          </span>
                        ) : autoplayBlocked ? (
                          'Tap the play button'
                        ) : (
                          'Paused'
                        )}
                      </p>
                    </div>

                    {/* BIG PLAY BUTTON */}
                    <button
                      onClick={toggleAudio}
                      className="w-10 h-10 rounded-full bg-tuggi-dark text-white shadow-md flex items-center justify-center focus:outline-none hover:scale-105 active:scale-95 transition-all"
                    >
                      {isAudioPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <motion.div
                      className="h-full bg-gradient-to-r from-tuggi-secondary to-tuggi-primary"
                      style={{ width: `${audioProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Coupon redemption block — only renders when /d/<slug> resolves
                to an active coupon code. The owner attribution lives in the
                hero title above; this card is the explicit redeem CTA. */}
            {coupon && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="w-full max-w-sm mx-auto mt-6"
              >
                <div className="relative bg-white rounded-2xl p-5 shadow-[0_8px_32px_rgba(8,17,33,0.06)] border border-tuggi-secondary/20 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-tuggi-secondary text-xs font-bold uppercase tracking-[0.2em]">
                    <Gift size={14} />
                    {tCoupon("block_title")}
                  </div>

                  <p className="text-sm text-tuggi-slate text-center -mt-1">
                    {tCoupon("block_subtitle", { days: coupon.days })}
                  </p>

                  <p className="text-[10px] uppercase tracking-[0.18em] text-tuggi-slate/70 font-semibold mt-1">
                    {tCoupon("code_label")}
                  </p>

                  <button
                    onClick={handleCopyCoupon}
                    className="w-full flex items-center justify-between gap-3 bg-tuggi-bg border border-dashed border-tuggi-secondary/40 rounded-xl px-4 py-3 text-tuggi-dark font-extrabold text-xl tracking-[0.18em] hover:bg-tuggi-secondary/5 active:scale-[0.99] transition-all"
                    aria-label={tCoupon("copy")}
                  >
                    <span>{coupon.code}</span>
                    {couponCopied ? (
                      <Check size={18} className="text-tuggi-secondary" />
                    ) : (
                      <Copy size={18} className="text-tuggi-slate" />
                    )}
                  </button>
                  {couponCopied && (
                    <p className="text-[11px] text-tuggi-secondary font-semibold -mt-1">
                      {tCoupon("copied")}
                    </p>
                  )}

                  <button
                    onClick={handleRedeemTap}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-tuggi-secondary text-white font-extrabold text-sm rounded-xl shadow-[0_6px_24px_rgba(255,111,0,0.28)] hover:shadow-[0_6px_28px_rgba(255,111,0,0.4)] hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    {tCoupon("open_app")}
                    <ArrowRight size={16} />
                  </button>

                  <p className="text-[10px] text-tuggi-slate/60 text-center mt-1 leading-relaxed px-2">
                    {tCoupon("desktop_hint")}
                  </p>
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
