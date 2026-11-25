import { consentGranted, storedConsent } from "@/lib/consent";

/**
 * The GA4 events of the partner page (the page view, the welcome audio, the
 * description, the contacts, the coupon). One sender for the old download
 * layout (`PartnerHero`) and the partner page frame, so both keep the same
 * event names.
 *
 * WHY IT WAITS FOR `gtag`. `GoogleAnalyticsWrapper` mounts gtag.js only after
 * its own effect reads the consent, so on a fresh load `window.gtag` does not
 * exist yet when the page's first effects run. The page view used to fall back
 * to `dataLayer.push({ event })`, the Tag Manager form, which gtag.js ignores
 * (`store-click.ts` says the same): `partner_download_page_view` never reached
 * GA4 from the page `@` (copy #1254, zero events with `@` in the path). With
 * consent given, the event now waits for `gtag` to exist and goes through it.
 * Without consent there is no gtag on this page load (accepting the notice
 * reloads it), and nothing is sent.
 */
export type PartnerEventParams = Record<string, unknown>;

type Gtag = (command: "event", name: string, params: PartnerEventParams) => void;

/** How long an event waits for gtag.js to be mounted, in milliseconds. */
export const GTAG_WAIT_MS = 10000;
const GTAG_POLL_MS = 100;

function gtagOf(): Gtag | null {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof gtag === "function" ? gtag : null;
}

export function sendPartnerPageEvent(
  eventName: string,
  params: PartnerEventParams,
  waitMs: number = GTAG_WAIT_MS
): void {
  if (typeof window === "undefined") return;
  const send = (gtag: Gtag) => {
    try {
      gtag("event", eventName, params);
    } catch {
      // Analytics is best effort.
    }
  };
  const ready = gtagOf();
  if (ready) {
    send(ready);
    return;
  }
  if (!consentGranted(storedConsent())) return;
  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    const gtag = gtagOf();
    if (gtag) {
      window.clearInterval(timer);
      send(gtag);
    } else if (Date.now() - startedAt >= waitMs) {
      window.clearInterval(timer);
    }
  }, GTAG_POLL_MS);
}
