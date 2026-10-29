"use client";

import Image from "next/image";
import { buildPlayStoreUrl } from "@/lib/app-meta";
import {
  useAttributionClickId,
  useAttributionClipboardWrite,
  useStoreCampaign,
} from "@/lib/conversionHooks";

/**
 * Footer store badges with placement-tagged analytics (`click_store`).
 *
 * The Play badge carries the install referrer of this visitor's first touch
 * and the App Store badge writes the same token to the pasteboard inside the
 * tap (BR-B2B-002, contract §5): the footer is on every page, so it is a real
 * way out of the site for someone who scanned a QR and then browsed — and a
 * way out with no token is a commission the partner never sees.
 */
export function FooterStoreBadges() {
  const clickId = useAttributionClickId();
  const writeClipboardToken = useAttributionClipboardWrite();
  const { appStoreUrl, trackStoreClick } = useStoreCampaign();

  return (
    <div className="flex flex-col gap-3 mt-6">
      <a
        href={appStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void writeClipboardToken();
          trackStoreClick("app_store", "footer");
        }}
        className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg w-max"
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
        href={buildPlayStoreUrl(clickId)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackStoreClick("play_store", "footer")}
        className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg w-max"
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
