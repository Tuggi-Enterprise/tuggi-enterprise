"use client";

import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import Image from "next/image";

export function DriveConversion() {
  const t = useTranslations("Drive.Conversion");

  return (
    <section className="bg-tuggi-primary py-24 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <Compass className="w-16 h-16 text-white mx-auto mb-8 animate-pulse" aria-hidden="true" />
        
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-12">
          {t("title")}
        </h2>
        
        <div className="flex flex-row justify-center items-center gap-4 sm:gap-8">
          <a 
            href="https://apps.apple.com/app/tuggi-drive/id6744379818"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sendGAEvent({ event: 'click_download', value: 'app_store' })}
            className="hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl shrink-0"
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
            className="hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl shrink-0"
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
    </section>
  );
}
