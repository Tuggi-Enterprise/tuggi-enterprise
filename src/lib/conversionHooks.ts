"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { resolvePricing, type BaseMarketPricing } from "@/lib/pricing";
import { attributionIpEndpoint, clickToken, readStoredAttribution } from "@/lib/attribution";
import { useAttributionAllowed } from "@/components/global/AttributionGateProvider";

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
 *
 * AND THE READ ITSELF IS GATED — BR-USUARIO-033, items 2, 3 and 5. Reading a
 * cookie is ACCESS to information on the terminal equipment, which art. 5(3)
 * of the ePrivacy Directive reaches on its own terms; the licence the write
 * had in Brazil does not travel with the tourist to Portugal. So the snapshot
 * that touches `document.cookie` is only installed once the server has said
 * yes (`useAttributionAllowed`), and until then — and forever, in a gated
 * territory without consent — this hook answers null WITHOUT having read
 * anything. Null is the answer a visitor nobody referred already gets, so
 * every caller downstream already handles it: the Play link is the bare store
 * URL and `clickToken` has nothing to put in the pasteboard.
 *
 * THIS IS THE ONLY DOOR, AND THAT IS ITEM 6 BY CONSTRUCTION. Both channels are
 * built from this one value, so there is no second place to keep shut.
 */
export function useAttributionClickId(): string | null {
  const allowed = useAttributionAllowed();
  // Two module-level snapshots and not a closure: `useSyncExternalStore` calls
  // getSnapshot on every render and compares the result, so an unstable
  // identity here loops. These two flip only when the verdict does.
  return useSyncExternalStore(noopSubscribe, allowed ? clientClickId : serverClickId, serverClickId);
}

const clientClickId = (): string | null => readStoredAttribution()?.click_id ?? null;
const serverClickId = (): string | null => null;

/**
 * Once per page LOAD, not once per mount — a module flag and not a ref.
 *
 * The complement is fired from two call sites on purpose (see the hook below),
 * and a remount of either would otherwise send it again. It is the same defect
 * `captureStartedRef` guards against in `PartnerHero`, one level up: there a
 * piece of state was resetting on every remount and opening a second row.
 */
let ipComplementSent = false;

/**
 * Completes this browser's click row with its IPv4 — BR-B2B-002, contract §4.
 *
 * FIRE AND FORGET, AND THAT IS THE REQUIREMENT AND NOT A SHORTCUT. There is
 * already a race between the capture and the tourist tapping the store CTA
 * (`CLIPBOARD_WRITE_GRACE_MS` is what it cost), and this request may not join
 * it: nothing awaits it, nothing branches on it, and the empty `catch` is
 * deliberate. `keepalive` lets it outlive the navigation to the store
 * (fetch.spec.whatwg.org, §request); `credentials: 'omit'` because the route
 * decides from the edge header and a cookie would only be a cookie sent to
 * another host for nothing.
 *
 * NOT CONFIGURED IS "DO NOT CALL", NEVER AN ERROR. `attributionIpEndpoint()`
 * answers null until `ip4.tuggi.app` exists as a DNS-only alias of this
 * deployment; a tourist must never meet a failure for a hostname that is not
 * his problem, and the deterministic path does not depend on any of this.
 */
function sendIpComplement(clickId: string): void {
  const endpoint = attributionIpEndpoint();
  if (!endpoint || typeof fetch === "undefined") return;
  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The click id and NOTHING ELSE. The address is read from the edge on the
    // other side; a body that carried one would be the spoof contract §4
    // removed after it moved a partner's commission once.
    body: JSON.stringify({ click_id: clickId }),
    keepalive: true,
    credentials: "omit",
  }).catch(() => {});
}

/**
 * The single owner of that call, and no CTA reimplements it — the same rule
 * `writeClickTokenToClipboard` follows one screen down.
 *
 * IT FIRES FOR THE FIRST CLICK ID FROM EITHER SOURCE, and the second source is
 * the reason this is a hook and not a line inside the capture. `capturedClickId`
 * is what the capture just returned, which covers the tourist who is scanning
 * the QR right now. The echo — `useAttributionClickId`, this browser's
 * `tuggi_attr` — covers everybody captured BEFORE this deploy, whose row would
 * otherwise carry no address for the whole 30 days it lives. The write is
 * write-once on the server, so a browser that ends up sending both is inert.
 *
 * THE CONSENT GATE COMES FOR FREE ON THE ECHO SIDE — BR-USUARIO-033, item 6:
 * `useAttributionClickId` answers null until the server's verdict says yes, so
 * there is no second door to keep shut here. The captured id is the return of a
 * capture the server already allowed. And the route gates again on its own,
 * because a gate decided on the client is a gate the client edits (item 2).
 */
export function useAttributionIpComplement(capturedClickId?: string | null): void {
  const storedClickId = useAttributionClickId();
  const clickId = storedClickId ?? capturedClickId ?? null;

  useEffect(() => {
    if (!clickId || ipComplementSent) return;
    ipComplementSent = true;
    sendIpComplement(clickId);
  }, [clickId]);
}

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
 * (`attributionGateOf`, `src/lib/consent.ts`) and `useAttributionClickId`
 * answers null unless it said yes — whether the refusal happened at the
 * capture, which plants no `tuggi_attr` cookie, or on a later visit from a
 * gated territory, where the cookie is there and is not read. Either way
 * `clickToken` answers null and there is nothing to write. There is no second
 * door to keep shut, which is item 6's own argument for building it this way.
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
