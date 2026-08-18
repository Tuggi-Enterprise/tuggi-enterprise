"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { resolvePricing, type BaseMarketPricing } from "@/lib/pricing";
import { clickToken, readStoredAttribution } from "@/lib/attribution";

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

/**
 * How long a CTA may wait for the pasteboard before it gives up and navigates.
 *
 * A badge with `target="_blank"` needs none of it — this page stays alive and
 * the write settles on its own. It exists for the CTA that assigns
 * `window.location`: there the document is going away, and a clipboard
 * permission prompt that never gets answered would strand the visitor on a
 * spinner instead of taking him to the store.
 */
export const CLIPBOARD_WRITE_GRACE_MS = 300;

/**
 * The iOS half of the attribution: `tuggi_click_<uuid>` into the pasteboard —
 * contract §5, BR-B2B-002.
 *
 * CALL THIS FROM INSIDE THE CLICK HANDLER, never from an effect. WebKit says
 * it in so many words: "A call to clipboard.write or clipboard.writeText
 * outside the scope of a user gesture (such as click or touch event handlers)
 * will result in the immediate rejection of the promise"
 * (webkit.org/blog/10855/async-clipboard-api, consulted 2026-08-18). This ran
 * inside a mount effect until 9a96cfc, so the promise was rejected on every
 * iPhone and swallowed by the empty `catch` on every iPhone: the channel had
 * never worked once, and nothing went red.
 *
 * The write is STARTED synchronously — no `await` before it — because the
 * gesture is spent by the first suspension point.
 *
 * WHY IT IS SAFE WITHOUT A SECOND CONSENT DECISION — BR-USUARIO-033, item 5.
 * Writing to the pasteboard is writing to the device, so it may not happen in
 * a gated territory without consent. It cannot: the gate runs on the server
 * (`attributionGateOf`, `src/lib/consent.ts`), a refused capture plants no
 * `tuggi_attr` cookie, `useAttributionClickId` therefore answers null and
 * `clickToken` answers null. There is no second door to keep shut, which is
 * item 6's own argument for building it this way.
 *
 * AND NOTHING IS INVENTED WHEN THERE IS NO CLICK. Not the partner id, not the
 * slug: `clickToken` accepts a UUID or nothing, so the app can never read a
 * token that resolves to a row nobody wrote.
 */
export async function writeClickTokenToClipboard(
  clickId: string | null | undefined
): Promise<void> {
  const token = clickToken(clickId);
  if (!token || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
  const written = navigator.clipboard.writeText(token).catch(() => {});
  await Promise.race([
    written,
    new Promise((resolve) => setTimeout(resolve, CLIPBOARD_WRITE_GRACE_MS)),
  ]);
}

/**
 * The App Store CTA's half of the attribution, bound to this browser's first
 * touch — the write side of `useAttributionClickId`, and the same single owner.
 *
 * ONE RULE, AND IT FOLLOWS THE DESTINATION AND NOT THE PLATFORM: the CTA whose
 * link is the App Store writes the token, wherever it is on the site and
 * whatever the UA says. The Play badge next to it needs nothing — there the
 * token travels in the `referrer` of `buildPlayStoreUrl`.
 *
 * It reads the destination and not `usePlatform()` for a measured reason: an
 * iPad on iPadOS 13+ asks for the desktop site by default, so the UA sniff
 * calls it "desktop" while the store it can install from is the App Store.
 * Sniffing here would drop that visitor's attribution silently, which is the
 * exact class of defect this card exists to close.
 */
export function useAttributionClipboardWrite(): () => Promise<void> {
  const clickId = useAttributionClickId();
  return () => writeClickTokenToClipboard(clickId);
}
