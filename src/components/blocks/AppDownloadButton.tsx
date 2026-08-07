"use client";

import { useEffect, useState, type ReactNode } from "react";
import { APP_STORE_URL, PLAY_STORE_URL, TUGGI_CLIENT_SLUG } from "@/lib/app-meta";

/**
 * Locale-agnostic Tuggi landing (middleware resolves the language per request).
 * Used as the desktop / no-JS fallback so the page plays our own welcome audio
 * and is attributed as Tuggi (slug "tuggi" → the Tuggi client).
 *
 * Written bare rather than through the typed `Link`, unlike the header and
 * footer CTAs, because this href is swapped for a store URL after mount.
 */
const TUGGI_LANDING = `/d/${TUGGI_CLIENT_SLUG}`;

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
  const [href, setHref] = useState(TUGGI_LANDING);

  useEffect(() => {
    const ua =
      navigator.userAgent || (navigator as unknown as { vendor?: string }).vendor || "";
    if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
      setHref(APP_STORE_URL);
    } else if (/android/i.test(ua)) {
      setHref(PLAY_STORE_URL);
    }
    // desktop: keep the /d/tuggi landing fallback
  }, []);

  const isStore = href.startsWith("http");

  const handleClick = () => {
    try {
      const target = !isStore
        ? "tuggi_landing"
        : href === APP_STORE_URL
          ? "app_store"
          : "play_store";
      (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
        "event",
        "tour_download_cta_click",
        { target, label: eventLabel }
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
