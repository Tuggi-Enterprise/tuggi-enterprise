"use client";

import { type ReactNode } from "react";
import { buildPlayStoreUrl } from "@/lib/app-meta";
import {
  useAttributionClickId,
  useAttributionClipboardWrite,
  usePlatform,
  useStoreCampaign,
} from "@/lib/conversionHooks";

/**
 * Locale-agnostic Tuggi landing (middleware resolves the language per request).
 * Used as the desktop / no-JS fallback so the page plays our own welcome audio
 * and is attributed as Tuggi (slug "tuggi" → the Tuggi client).
 */
const TUGGI_LANDING = "/d/tuggi";

interface AppDownloadButtonProps {
  className?: string;
  children: ReactNode;
  /** Optional label sent with the GA event, to tell CTAs apart. */
  eventLabel?: string;
}

/**
 * One-tap "get the app" CTA. Sends mobile users STRAIGHT to the correct store
 * (App Store on iOS, Play Store on Android); desktop / no-JS users fall back to
 * the Tuggi landing /d/tuggi (which plays our welcome audio and hands off to the
 * store).
 *
 * Renders a real <a> so it's crawlable, keyboard-accessible and openable in a
 * new tab. The href starts as /d/tuggi (safe SSR default) and is upgraded to
 * the platform store after mount.
 */
export function AppDownloadButton({
  className,
  children,
  eventLabel,
}: AppDownloadButtonProps) {
  // `usePlatform` and not a fourth copy of the UA sniff: its server snapshot is
  // "desktop", so the SSR href stays the /d/tuggi landing and the store URL is
  // resolved on hydration — same behaviour as the effect this replaced, without
  // the setState-in-effect the linter was flagging.
  const platform = usePlatform();
  // The Android leg carries this visitor's first touch in the Play referrer;
  // the iOS leg has no such channel and carries it in the pasteboard, written
  // inside the tap below (BR-B2B-002, contract §5).
  const clickId = useAttributionClickId();
  const writeClipboardToken = useAttributionClipboardWrite();
  const { appStoreUrl, trackStoreClick } = useStoreCampaign();

  const href =
    platform === "ios"
      ? appStoreUrl
      : platform === "android"
        ? buildPlayStoreUrl(clickId)
        : TUGGI_LANDING;

  const isStore = href.startsWith("http");

  const handleClick = () => {
    // Started before the analytics call, and never awaited: this handler is the
    // user gesture WebKit requires, and the badge opens a new tab, so the write
    // settles with this document still alive.
    if (platform === "ios") void writeClipboardToken();
    // A store leg is a store click of the site, counted as `click_store` like
    // every other badge (#1060). The desktop leg goes to the Tuggi landing,
    // which counts the store tap there; only this leg keeps the tour event.
    if (isStore) {
      const extra = eventLabel ? { label: eventLabel } : undefined;
      trackStoreClick(platform === "ios" ? "app_store" : "play_store", "tour_download", extra);
      return;
    }
    try {
      (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
        "event",
        "tour_download_cta_click",
        { target: "tuggi_landing", label: eventLabel }
      );
    } catch {
      /* analytics is best-effort */
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      {...(isStore ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
