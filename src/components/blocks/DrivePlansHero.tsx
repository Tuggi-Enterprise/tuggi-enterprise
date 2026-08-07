"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";

const BADGE_LINK =
  "hover:-translate-y-0.5 hover:opacity-90 active:scale-[0.97] transition-[transform,opacity] duration-150 " +
  "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2 rounded-xl shrink-0";

/**
 * Compact hero for the Plans & Pricing page. No product pitch (the home does
 * that) and no simulator — just the free-trial promise and the store badges,
 * same pattern as the home hero. The H1 is not animation-gated (LCP).
 */
export function DrivePlansHero() {
  const t = useTranslations("Drive.PlansHero");

  return (
    <section id="drive-hero" className="bg-tuggi-bg pt-28 pb-16 lg:pt-32 lg:pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-tuggi-dark tracking-tight mb-6 leading-[1.1]">
          {t("title")}
        </h1>
        <p className="text-lg sm:text-xl text-tuggi-slate mb-8 leading-relaxed max-w-2xl mx-auto">
          {t("subtitle")}
        </p>

        <div className="flex flex-row flex-wrap gap-4 items-center justify-center">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sendGAEvent({ event: "click_store", placement: "hero", store: "app_store" })}
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
            onClick={() => sendGAEvent({ event: "click_store", placement: "hero", store: "play_store" })}
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
      </div>
    </section>
  );
}
