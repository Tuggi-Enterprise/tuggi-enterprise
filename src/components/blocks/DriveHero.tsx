"use client";

import { useTranslations } from "next-intl";
import { DriveHeroAnimator } from "./DriveHeroAnimator";
import Image from "next/image";
import { buildPlayStoreUrl } from "@/lib/app-meta";
import {
  useAttributionClickId,
  useAttributionClipboardWrite,
  useStoreCampaign,
} from "@/lib/conversionHooks";

export function DriveHero() {
  const t = useTranslations("Drive.Hero");
  // Both badges had their store URL typed into the JSX, outside the SSOT of
  // lib/app-meta — so this was the one section that could not carry a token
  // even after every other one did (BR-B2B-002). The Play half was brought
  // back into `buildPlayStoreUrl` first; the App Store half is here, and with
  // it the pasteboard write iOS depends on (contract §5).
  const clickId = useAttributionClickId();
  const writeClipboardToken = useAttributionClipboardWrite();
  const { appStoreUrl, trackStoreClick } = useStoreCampaign();

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
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void writeClipboardToken();
                  trackStoreClick("app_store", "drive_hero");
                }}
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-xl shrink-0"
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
                href={buildPlayStoreUrl(clickId)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackStoreClick("play_store", "drive_hero")}
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-xl shrink-0"
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
