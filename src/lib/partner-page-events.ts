/**
 * The GA4 events of the partner page (the welcome audio, the description, the
 * contacts, the coupon): `gtag` when it is loaded, the `dataLayer` queue until
 * then. One sender for the old download layout (`PartnerHero`) and the hotel
 * in the frame of the one partner page, so both keep the same event names.
 */
export type PartnerEventParams = Record<string, unknown>;

export function sendPartnerPageEvent(eventName: string, params: PartnerEventParams): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
  if (typeof w.gtag === "function") {
    w.gtag("event", eventName, params);
    return;
  }
  const dataLayer = w.dataLayer || [];
  dataLayer.push({ event: eventName, ...params });
  w.dataLayer = dataLayer;
}
