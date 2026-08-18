"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { resolvePricing, type BaseMarketPricing } from "@/lib/pricing";
import { readStoredAttribution } from "@/lib/attribution";

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
 * the base-market price — BR-MONETIZACAO-069.
 *
 * `null` is the resting answer and it means one thing on purpose: **no price to
 * publish**. Not resolved yet, geo down, response malformed, country outside
 * the three base markets — the card renders the same store note for all of
 * them, so the caller has one branch and no state to distinguish. Until
 * 2026-08-16 the failure path called `resolvePricing(null)` and landed on a US
 * tier, which is the fallback the rule now forbids: no error path may end in a
 * number.
 */
export function useGeoPricing(): BaseMarketPricing | null {
  const [pricing, setPricing] = useState<BaseMarketPricing | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("geo failed"))))
      .then((data: unknown) => {
        // Shape-checked, not trusted: a 200 carrying HTML, a number or a
        // missing field must reach the store note, not `resolvePricing`.
        const country = (data as { country?: unknown } | null)?.country;
        if (alive) setPricing(typeof country === "string" ? resolvePricing(country) : null);
      })
      .catch(() => {
        if (alive) setPricing(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return pricing;
}

/**
 * The click id of this browser's FIRST partner touch, or null — BR-B2B-002.
 *
 * Read from the `tuggi_attr` cookie, in the browser and never on the server,
 * for a reason that is not style: every page that carries a store CTA is
 * cached by the CDN, and resolving the referrer while rendering would either
 * serve one visitor's click id to the next or make the whole site
 * uncacheable. The server snapshot is therefore null — the bare store URL,
 * which is also what a visitor with no first touch gets — and the link gains
 * the referrer on hydration.
 *
 * `useSyncExternalStore` and not `useState` + `useEffect`: same reason as
 * `usePlatform` above, and the snapshot is a string, so the identity check
 * React runs on every render is stable.
 */
export function useAttributionClickId(): string | null {
  return useSyncExternalStore(noopSubscribe, clientClickId, serverClickId);
}

const clientClickId = (): string | null => readStoredAttribution()?.click_id ?? null;
const serverClickId = (): string | null => null;
