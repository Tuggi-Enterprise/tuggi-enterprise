/**
 * The visitor's consent flag, and the gate the attribution capture owes to it.
 *
 * ONE FLAG, NOT A SECOND ONE. The site already had a consent mechanism —
 * `CookieBanner` writes it, `MicrosoftClarity`, `GoogleAnalyticsWrapper` and
 * `ApolloTracker` read it — and each of those four spelled the key as a string
 * literal of its own. The attribution gate is the fifth reader and the first
 * one on the server, so the name became a constant here instead of a fifth
 * copy: a second flag would mean a visitor who declined once being tracked by
 * whichever surface asked the other question.
 *
 * WHAT THIS FLAG STILL HAS TO SAY, AND WHO SAYS IT. BR-USUARIO-033, item 8:
 * consent is specific, so a banner that only covers audience measurement is
 * not a basis for the attribution capture. While the banner names only the
 * three trackers above, this gate is honest about the mechanism and dishonest
 * about the scope, and the release is not complete until the banner copy names
 * the attribution purpose in the four locales. THE COPY IS `design`'s — the
 * fact is here, and the rule is the one to cite.
 */

import { readCookie } from "@/lib/attribution";
import { countryOf, requiresPriorConsent } from "@/lib/territory";

/**
 * The one name of the consent flag. It is BOTH a `localStorage` key (read by
 * the three tracker components, which run only in the browser) and a cookie
 * (which is how the server can see it at all) — `CookieBanner` writes the two
 * together, and neither is authoritative over the other.
 */
export const CONSENT_KEY = "tuggi_cookie_consent";

/** The only stored value that means yes. Anything else — including a missing
 *  flag and the literal `"false"` — is "not yet", which is not consent. */
export const CONSENT_GRANTED = "true";

/** A year, the lifetime `CookieBanner` gives the answer in both stores. */
export const CONSENT_MAX_AGE_SECONDS = 31536000;

/** Whether a raw stored value (cookie or `localStorage`) is a yes. */
export function consentGranted(raw: string | null | undefined): boolean {
  return raw === CONSENT_GRANTED;
}

/** Whether this browser has already answered, either way. Drives the banner. */
export function consentAnswered(raw: string | null | undefined): boolean {
  return raw !== null && raw !== undefined;
}

/** The answer this browser is carrying, read where the components read it. */
export function storedConsent(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(CONSENT_KEY);
}

/** The answer as the SERVER sees it, from the request's cookie jar. */
export function consentFromHeaders(headers: Headers): boolean {
  return consentGranted(readCookie(headers.get("cookie"), CONSENT_KEY));
}

/** Everything the capture route has to know before it writes anything. */
export interface AttributionGate {
  /** The resolved territory, or null when it could not be determined. */
  country: string | null;
  /** Whether BR-USUARIO-033 requires consent before capturing here. */
  gated: boolean;
  /** Whether this browser has granted it. */
  consented: boolean;
  /** The only field the caller has to read: may the capture happen at all? */
  allowed: boolean;
}

/**
 * May this request be captured? — BR-USUARIO-033, items 1, 2 and 5.
 *
 * Refused means refused everywhere: no row in `drive.click_fingerprints`, no
 * `tuggi_attr` cookie, no `click_id` in the Play link and nothing in the
 * clipboard. The last two follow from the first without a second decision —
 * the site has no click id to put anywhere — which is deliberate: item 6 says
 * a refusal is not to be rebuilt through another door, and the cheapest way to
 * honour that is for there to BE no other door.
 *
 * The install that comes out of a refusal is organic for every purpose and the
 * partner earns nothing from it. That price was decided by the operator on
 * 2026-08-18, knowing what it is (item 5).
 */
export function attributionGateOf(headers: Headers, edgeProven: boolean): AttributionGate {
  const country = countryOf(headers, edgeProven);
  const gated = requiresPriorConsent(country);
  const consented = consentFromHeaders(headers);
  return { country, gated, consented, allowed: !gated || consented };
}
