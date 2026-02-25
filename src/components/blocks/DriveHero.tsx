"use client";

import { useTranslations } from "next-intl";
import { DriveHeroAnimator } from "./DriveHeroAnimator";
import { sendGAEvent } from "@next/third-parties/google";
import Image from "next/image";

export function DriveHero() {
  const t = useTranslations("Drive.Hero");

  return (
    <section className="bg-tuggi-bg pt-32 pb-24 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-tuggi-dark tracking-tight mb-8 leading-tight">
              {t("title")}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed font-medium">
              {t("subtitle")}
            </p>
            
            <div className="flex flex-row gap-4 items-center">
              <a 
                href="https://apps.apple.com/app/tuggi-drive/id6744379818"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sendGAEvent({ event: 'click_download', value: 'app_store' })}
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-xl shrink-0"
              >
                <Image 
                  src="/images/badges/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={140}
                  height={42}
                  className="h-10 w-auto"
                />
              </a>
              
              <a 
                href="https://play.google.com/store/apps/details?id=com.tuggidrive.app"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sendGAEvent({ event: 'click_download', value: 'google_play' })}
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-xl shrink-0"
              >
                <Image 
                  src="/images/badges/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={140}
                  height={42}
                  className="h-10 w-auto"
                />
              </a>
            </div>
          </div>

          {/* Phone Mockup with Live Animation */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-[320px] h-[640px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden">
              <DriveHeroAnimator />
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
