"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, buildPlayStoreUrl } from "@/lib/app-meta";
import {
  useAttributionClickId,
  useAttributionClipboardWrite,
} from "@/lib/conversionHooks";
import { PhoneFrame } from "./PhoneFrame";
import { PRODUCT_FACTS } from "@/lib/product-facts";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

// Store-badge hover/press micro-interaction (transform + opacity only; disabled
// under reduced motion via Tailwind's motion-reduce variant).
const BADGE_LINK =
  "hover:-translate-y-0.5 hover:opacity-90 active:scale-[0.97] transition-[transform,opacity] duration-150 " +
  "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2 rounded-xl shrink-0";

/**
 * B2C homepage hero: copy on the left, a real app screenshot in a phone frame
 * on the right, with a GPS radar pulse looping behind it.
 *
 * **The screenshot is the point card, not the map** — spec §6.4, card #194. The
 * card is *drawn over* the map, so the frame keeps the container and gains the
 * product on top of it: the name of the place, the distance, the first
 * paragraph of the story and the two actions, "Ouvir a história" and "Ler
 * transcrição". The hero goes from "we have a map" to "this is what you get",
 * and the same pair of actions is what the player two screens down repeats
 * (Nielsen, consistency and standards).
 *
 * **The simulated "now playing" pill went with it.** It existed to say that a
 * story arrives on its own, over a map that showed no point at all; over the
 * card it reprinted the name of the place that is already printed in the
 * screenshot, 200 px away in the same viewport. What it said is now said by the
 * screenshot and by "Comece a ouvir em um minuto", which the new order puts
 * directly below. The GPS rings stay: they carry the location trigger without
 * text. Gone with it: a `useState` and a 1.8 s `setTimeout` in the fold that
 * decides LCP and CLS.
 *
 * LCP is protected: the H1, subtitle, trust line and store badges are NOT
 * animation-gated (they paint immediately). Only the phone animates.
 */
export function HomeHero() {
  const t = useTranslations("Home.Hero");
  // The Play link carries this visitor's first touch when there is one, and the
  // App Store badge writes the same token to the pasteboard inside the tap —
  // iOS has no install-referrer equivalent (BR-B2B-002, contract §5). With no
  // first touch both are the bare store URL and nothing is written.
  const clickId = useAttributionClickId();
  const writeClipboardToken = useAttributionClipboardWrite();

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
                onClick={() => {
                  void writeClipboardToken();
                  sendGAEvent({ event: "click_store_badge", value: "app_store" });
                }}
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
                href={buildPlayStoreUrl(clickId)}
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

            {/* The audio-language count is a product fact, not copy: the
                sentence lives in Home.Hero.trustLine and the number comes
                from lib/product-facts (BR-IDIOMA-001, DS-COPY-005). */}
            <p className="mt-6 text-sm font-medium text-tuggi-slate">
              {t("trustLine", PRODUCT_FACTS)}
            </p>
          </div>

          {/* Phone + overlays. The wrapper is sized to the phone so the
              absolute GPS rings align to it. */}
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

              {/* Phone rises into place on mount. The screenshot keeps
                  `priority`; the H1 (not this) is the LCP element.
                  Transform only: it used to fade from opacity 0, which meant
                  the product screenshot in the first fold did not exist for a
                  reader without JavaScript (#191). */}
              <motion.div
                initial={{ y: 24 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                className="relative"
              >
                <PhoneFrame
                  src="/images/app/poi-story.jpg"
                  alt={t("phoneAlt")}
                  priority
                  sizes="(max-width: 1024px) 70vw, 320px"
                  className="max-w-none w-full"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
