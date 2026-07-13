"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { PhoneFrame } from "./PhoneFrame";

/**
 * B2C homepage hero: copy on the left, the real app map screenshot on the
 * right (stacked on mobile). CTAs are the official store badges — no
 * "Contact Sales" here. The hero screenshot is the LCP image, so it loads with
 * `priority`.
 */
export function HomeHero() {
  const t = useTranslations("Home.Hero");

  return (
    <section className="bg-tuggi-bg pt-28 pb-20 lg:pt-32 lg:pb-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          {/* Copy */}
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
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2 rounded-xl shrink-0"
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
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2 rounded-xl shrink-0"
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

          {/* Phone */}
          <div className="flex justify-center lg:justify-end">
            <PhoneFrame
              src="/images/app/home-map.jpg"
              alt={t("phoneAlt")}
              priority
              sizes="(max-width: 1024px) 70vw, 320px"
              className="max-w-[280px] sm:max-w-[300px] lg:max-w-[320px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
