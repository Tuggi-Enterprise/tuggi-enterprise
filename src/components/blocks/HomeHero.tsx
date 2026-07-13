"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { PhoneFrame } from "./PhoneFrame";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

// Store-badge hover/press micro-interaction (transform + opacity only; disabled
// under reduced motion via Tailwind's motion-reduce variant).
const BADGE_LINK =
  "hover:-translate-y-0.5 hover:opacity-90 active:scale-[0.97] transition-[transform,opacity] duration-150 " +
  "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2 rounded-xl shrink-0";

/**
 * B2C homepage hero: copy on the left, the real app map screenshot in a phone
 * frame on the right. The hero "moment": the phone rises in, a GPS radar pulse
 * loops behind it, and ~1.8s in a simulated "now playing" pill drops in near the
 * top of the screen — communicating that stories trigger by location.
 *
 * LCP is protected: the H1, subtitle, trust line and store badges are NOT
 * animation-gated (they paint immediately). Only the phone and the pill animate.
 */
export function HomeHero() {
  const t = useTranslations("Home.Hero");
  const [showPill, setShowPill] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShowPill(true), 1800);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section className="bg-tuggi-bg pt-28 pb-20 lg:pt-32 lg:pb-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          {/* Copy — intentionally NOT wrapped in any entrance animation (LCP). */}
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-tuggi-dark tracking-tight mb-6 leading-[1.1]">
              {t("title")}
            </h1>
            <p className="text-lg sm:text-xl text-tuggi-slate mb-8 leading-relaxed">
              {t("subtitle")}
            </p>

            <div className="flex flex-row flex-wrap gap-4 items-center justify-center lg:justify-start">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sendGAEvent({ event: "click_store_badge", value: "app_store" })}
                className={BADGE_LINK}
              >
                <Image
                  src="/images/badges/app-store-badge.svg"
                  alt={t("appStoreAlt")}
                  width={140}
                  height={42}
                  className="h-11 w-auto"
                />
              </a>

              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sendGAEvent({ event: "click_store_badge", value: "play_store" })}
                className={BADGE_LINK}
              >
                <Image
                  src="/images/badges/google-play-badge.svg"
                  alt={t("playStoreAlt")}
                  width={140}
                  height={42}
                  className="h-11 w-auto"
                />
              </a>
            </div>

            {/* Language count lives in Home.Hero.trustLine ("8+"); bump to "10"
                if KO/ZH TTS is confirmed live. */}
            <p className="mt-6 text-sm font-medium text-tuggi-slate">{t("trustLine")}</p>
          </div>

          {/* Phone + overlays. The wrapper is sized to the phone so the absolute
              overlays (GPS rings, pill) align to it. */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[320px]">
              {/* GPS radar pings (CSS loop; hidden under reduced motion). The
                  keyframe owns transform, so the pings stay centred as they scale. */}
              <span
                aria-hidden="true"
                className="tuggi-gps-ring pointer-events-none absolute left-1/2 top-[42%] h-28 w-28 rounded-full border border-tuggi-primary/40"
              />
              <span
                aria-hidden="true"
                className="tuggi-gps-ring tuggi-gps-ring--delayed pointer-events-none absolute left-1/2 top-[42%] h-28 w-28 rounded-full border border-tuggi-primary/40"
              />

              {/* Phone rises + fades in on mount. The screenshot keeps `priority`;
                  the H1 (not this) is the LCP element. */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                className="relative"
              >
                <PhoneFrame
                  src="/images/app/home-map.jpg"
                  alt={t("phoneAlt")}
                  priority
                  sizes="(max-width: 1024px) 70vw, 320px"
                  className="max-w-none w-full"
                />
              </motion.div>

              {/* Simulated "now playing" trigger pill (visual demo → aria-hidden).
                  Drops in from the top + one soft pulse; reduced motion just fades in. */}
              {showPill && (
                <motion.div
                  aria-hidden="true"
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0, scale: [1, 1.02, 1] }}
                  transition={{
                    duration: 0.4,
                    ease: EASE,
                    scale: { delay: 0.4, duration: 0.45, ease: EASE },
                  }}
                  className="absolute left-1/2 top-[18%] w-[84%] -translate-x-1/2"
                >
                  <div className="flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tuggi-primary text-white">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold leading-snug text-tuggi-dark">
                      {t("nowPlaying")}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
