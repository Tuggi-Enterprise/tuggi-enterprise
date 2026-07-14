"use client";

import Image from "next/image";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";

/** Footer store badges with placement-tagged analytics (`click_store`). */
export function FooterStoreBadges() {
  return (
    <div className="flex flex-col gap-3 mt-6">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => sendGAEvent({ event: "click_store", placement: "footer", store: "app_store" })}
        className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-lg w-max"
      >
        <Image
          src="/images/badges/app-store-badge.svg"
          alt="Download on the App Store"
          width={120}
          height={35}
          className="h-9 w-auto"
        />
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => sendGAEvent({ event: "click_store", placement: "footer", store: "play_store" })}
        className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-lg w-max"
      >
        <Image
          src="/images/badges/google-play-badge.svg"
          alt="Get it on Google Play"
          width={120}
          height={35}
          className="h-9 w-auto"
        />
      </a>
    </div>
  );
}
