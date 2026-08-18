"use client";

import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import Image from "next/image";
import { APP_STORE_URL, buildPlayStoreUrl } from "@/lib/app-meta";
import { useAttributionClickId } from "@/lib/conversionHooks";

export function DriveConversion() {
  const t = useTranslations("Drive.Conversion");
  // The Play link carries this visitor's first touch when there is one
  // (BR-B2B-002); with no cookie it is the bare store URL, as before.
  const clickId = useAttributionClickId();

  const onStore = (store: "app_store" | "play_store") => {
    // Preserve the legacy event; add the new placement-tagged one.
    sendGAEvent({ event: "click_download", value: store === "play_store" ? "google_play" : "app_store" });
    sendGAEvent({ event: "click_store", placement: "final", store });
  };

  return (
    <section id="drive-final-cta" className="bg-tuggi-primary py-24 relative overflow-hidden">

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
        <Compass className="w-16 h-16 text-white mx-auto mb-8 animate-pulse motion-reduce:animate-none" aria-hidden="true" />

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-12">
          {t("title")}
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
          <div className="flex flex-row items-center gap-4 sm:gap-8">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onStore("app_store")}
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
              href={buildPlayStoreUrl(clickId)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onStore("play_store")}
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

          {/* Desktop-only QR to /download (scan-to-phone handoff). */}
          <div className="hidden md:flex flex-col items-center gap-2">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg">
              <Image
                src="/images/qr-download.svg"
                alt=""
                width={104}
                height={104}
                className="w-[104px] h-[104px]"
              />
            </div>
            <span className="text-white/90 text-xs font-medium max-w-[8rem]">{t("qrCaption")}</span>
          </div>
        </div>

      </div>
    </section>
  );
}
