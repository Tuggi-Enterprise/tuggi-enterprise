"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { buildPlayStoreUrl } from "@/lib/app-meta";
import {
  usePartnerFirstTouch,
  usePlatform,
  useStoreCampaign,
  writeClickTokenToClipboard,
} from "@/lib/conversionHooks";
import type { StoreId } from "@/lib/store-click";
import type { StorePlatform } from "@/lib/store-platform";

/** Id of the full action: the sticky bar of the phone appears once it scrolls away (DS-COMPONENTE-110). */
export const PARTNER_CTA_ID = "partner-cta";

/** The full action: Tuggi blue with white ink (DS-COR-002). */
const FULL_ACTION_CLASS =
  "items-center justify-center rounded-xl bg-tuggi-primary font-bold text-white hover:bg-tuggi-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2";

interface PartnerStoreCtaProps {
  /** The partner the page credits; absent when the page does not attribute (BR-B2B-067 items 3 and 6). */
  partnerId?: string;
  label: string;
  /** Where the full action goes on a computer: the QR of the page, read with the phone. */
  desktopHref: string;
  /** GA `placement` of the store click. */
  placement: string;
  /** A quiet second link beside the full action ("see the itineraries"). */
  secondary?: { href: string; label: string };
  /**
   * The platform the server read from the request. Given, the action is the
   * one store of that phone, full width and without the badges, or, on a
   * computer, the two badges alone (spec onda 1 §1, decision 2).
   */
  only?: StorePlatform;
}

/**
 * The one full action of the partner page and the two store badges under it.
 * With `only` (a hotel's or a restaurant's page, #1254) a phone sees its own
 * store alone and a computer the two badges alone.
 *
 * This is where the page's first touch is captured (`usePartnerFirstTouch`,
 * BR-B2B-002): mounted once, on the action itself, with the same capture
 * `/d/{slug}` makes. Each store leg carries the click id the same way every
 * store button of the site does: the Play referrer, and the pasteboard written
 * inside the tap for the App Store.
 */
export function PartnerStoreCta({ partnerId, label, desktopHref, placement, secondary, only }: PartnerStoreCtaProps) {
  const tHero = useTranslations("Home.Hero");
  const clickId = usePartnerFirstTouch(partnerId);
  const platform = usePlatform();
  const { appStoreUrl, trackStoreClick } = useStoreCampaign();
  const playStoreUrl = buildPlayStoreUrl(clickId);
  const extra = partnerId ? { partner_id: partnerId } : undefined;

  const onStore = (store: StoreId) => {
    // Started before anything else and never awaited: the tap is the gesture
    // WebKit requires, and the store opens in a new tab.
    if (store === "app_store") void writeClickTokenToClipboard(clickId);
    trackStoreClick(store, placement, extra);
  };

  const shown = only ?? platform;
  const primaryStore: StoreId | null =
    shown === "ios" ? "app_store" : shown === "android" ? "play_store" : null;
  const primaryHref =
    primaryStore === "app_store" ? appStoreUrl : primaryStore === "play_store" ? playStoreUrl : desktopHref;

  const badges = (
    <div className="flex flex-wrap gap-3">
      <a
        href={appStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onStore("app_store")}
        data-testid="partner-page-app-store"
      >
        <Image
          src="/images/badges/app-store-badge.svg"
          alt={tHero("appStoreAlt")}
          width={150}
          height={45}
          className="h-11 w-auto"
        />
      </a>
      <a
        href={playStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onStore("play_store")}
        data-testid="partner-page-play-store"
      >
        <Image
          src="/images/badges/google-play-badge.svg"
          alt={tHero("playStoreAlt")}
          width={150}
          height={45}
          className="h-11 w-auto"
        />
      </a>
    </div>
  );

  if (only) {
    // A computer does not download here: the badges, and the QR beside them.
    if (!primaryStore) return <div id={PARTNER_CTA_ID}>{badges}</div>;
    return (
      <a
        id={PARTNER_CTA_ID}
        data-testid="partner-page-cta"
        href={primaryHref}
        onClick={() => onStore(primaryStore)}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex h-[52px] w-full text-base ${FULL_ACTION_CLASS}`}
      >
        {label}
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-3">
        <a
          id={PARTNER_CTA_ID}
          data-testid="partner-page-cta"
          href={primaryHref}
          onClick={primaryStore ? () => onStore(primaryStore) : undefined}
          {...(primaryStore ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={`inline-flex px-6 py-3.5 text-base ${FULL_ACTION_CLASS}`}
        >
          {label}
        </a>
        {secondary && (
          <a
            href={secondary.href}
            className="text-center sm:text-left text-base font-bold text-tuggi-primary-text underline-offset-4 hover:underline"
          >
            {secondary.label} <span aria-hidden="true">↓</span>
          </a>
        )}
      </div>
      {badges}
    </div>
  );
}
