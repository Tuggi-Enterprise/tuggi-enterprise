"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { resolvePricing, type CountryPricing } from "@/lib/pricing";

export type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || (navigator as unknown as { vendor?: string }).vendor || "";
  if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

const noopSubscribe = () => () => {};
const serverPlatform = (): Platform => "desktop";

/**
 * Device platform from the UA. Via useSyncExternalStore so the server snapshot
 * is "desktop" (renders the both-stores variant) and the client resolves the
 * real platform on hydration — no setState-in-effect, no hydration mismatch.
 * Layout must reserve space so the desktop→mobile switch never shifts height.
 */
export function usePlatform(): Platform {
  return useSyncExternalStore(noopSubscribe, detectPlatform, serverPlatform);
}

/**
 * Fetch the visitor's country once (from the edge /api/geo route) and resolve
 * the local pricing. Returns null until resolved so the UI can reserve space
 * and show a skeleton. Failure falls back to the global (US) tier — the card
 * never breaks.
 */
export function useGeoPricing(): CountryPricing | null {
  const [pricing, setPricing] = useState<CountryPricing | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("geo failed"))))
      .then((data: { country?: string }) => {
        if (alive) setPricing(resolvePricing(data?.country));
      })
      .catch(() => {
        if (alive) setPricing(resolvePricing(null));
      });
    return () => {
      alive = false;
    };
  }, []);

  return pricing;
}
