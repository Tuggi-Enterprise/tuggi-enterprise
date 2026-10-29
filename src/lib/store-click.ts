/**
 * The one analytics event of a store button (#1060). Every App Store and Play
 * badge or CTA of the site sends `click_store` through `sendStoreClick`, with
 * the store, where on the site the button sits, and the visit's UTM tags, so a
 * campaign can be followed from the visit to the store.
 *
 * Pure on purpose: no React and no Next import, so a spec can run it in Node.
 */

export const STORE_CLICK_EVENT = "click_store";

export type StoreId = "app_store" | "play_store";

/** The UTM tags of a visit that the store click carries, when present. */
export const VISIT_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

export type VisitUtm = Partial<Record<(typeof VISIT_UTM_KEYS)[number], string>>;

/** The UTM tags of a query string (`?a=b...` or `a=b...`); empty values are left out. */
export function visitUtmOf(search: string): VisitUtm {
  const params = new URLSearchParams(search);
  const utm: VisitUtm = {};
  for (const key of VISIT_UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) utm[key] = value;
  }
  return utm;
}

export interface StoreClick {
  store: StoreId;
  /** Where the button sits (`home_hero`, `footer`, `partner_cta`...). */
  placement: string;
  utm?: VisitUtm;
  /** Parameters owned by one placement, such as `route_slug` (contract link-da-rota). */
  extra?: Record<string, string>;
}

export function storeClickParams({ store, placement, utm, extra }: StoreClick): Record<string, string> {
  return { ...extra, ...utm, store, placement };
}

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

/**
 * Sends `click_store` through gtag.js, in the documented `("event", name,
 * params)` form. The object form `{ event: ... }` some buttons used is the Tag
 * Manager form (`sendGTMEvent` in the Next docs), not gtag's. Without analytics
 * consent there is no `gtag` (GoogleAnalyticsWrapper), and nothing is sent.
 */
export function sendStoreClick(click: StoreClick): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", STORE_CLICK_EVENT, storeClickParams(click));
  } catch {
    // Analytics is best effort: the store link opens either way.
  }
}
