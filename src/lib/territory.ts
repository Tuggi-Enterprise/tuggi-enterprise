/**
 * Where the visitor is, decided on the server and from nowhere else.
 *
 * Two features read this and they must not each have their own answer: the
 * base-market price (`/api/geo`, BR-MONETIZACAO-069) and the consent gate of
 * the attribution capture (`/api/attribution`, BR-USUARIO-033). The rule is
 * explicit that the territory is resolved **on the same side that takes the
 * decision** — "gate decidido no cliente é gate que o cliente edita" — so
 * nothing here reads `navigator`, and BR-USUARIO-033 forbids the two signals
 * that would be tempting: language and timezone are read FROM the device, and
 * reading them to decide whether the gate applies would be doing, in order to
 * decide, exactly what the gate exists to prevent.
 *
 * WHICH HEADER, AND WHY IN THIS ORDER.
 *
 * 1. `cf-ipcountry`, but only against proof that the request came through our
 *    own Cloudflare edge (`x-tuggi-edge`, the same proof `clientAddressOf`
 *    demands — `src/lib/rate-limit.ts`). Cloudflare computes it from the real
 *    client address; Vercel, sitting behind Cloudflare, sees the Cloudflare
 *    edge address instead, and Cloudflare's nearest PoP is not always in the
 *    visitor's country. That mismatch has one direction that matters: parts of
 *    South America are served from Miami, so a visitor in a country that
 *    REQUIRES consent could resolve to `US`, which is the permissive side of
 *    the gate. Preferring Cloudflare's own reading removes that case.
 * 2. `x-vercel-ip-country` otherwise, which is what a request reaching the
 *    origin directly (or a deploy without the Cloudflare rule) carries.
 *
 * WHY THE FALLBACK IS NOT SPOOFABLE, AND WHY THAT IS A MEASUREMENT. The Vercel
 * docs describe the header as derived from "the requester's public IP address"
 * but say nothing about a client that sends it, and the same silence about
 * `CF-Connecting-IP` is what produced the S1 defect this order exists to
 * answer. So it was measured, 2026-08-18:
 *
 *     curl https://tuggi-enterprise.vercel.app/api/geo -H 'x-vercel-ip-country: XX'
 *     → {"country":"BR"}
 *
 * and the same through the proxied host (`https://www.tuggi.app/api/geo`,
 * `server: cloudflare`, `cf-ray` present) — the value the caller sent is
 * discarded on both paths and replaced by the one Vercel resolved. That is the
 * difference from `CF-Connecting-IP`, which arrives verbatim off the proxied
 * path. Re-measure this before trusting it on a new host.
 *
 * WHAT THIS DOES NOT OWN, AND IT IS ON PURPOSE. `src/middleware.ts` and the
 * two landing pages also read `x-vercel-ip-country`, to pick a locale and the
 * welcome dialect (`src/lib/ptDialect.ts`). They are a HINT — the worst case is
 * greeting a visitor in the wrong flavour of Portuguese — while the two callers
 * here are a published price and a legal gate, and the guarantees they need
 * (never guess a country, fail closed) would be wrong defaults for a greeting.
 * Folding them in is a separate card, and it is not an oversight.
 *
 * NO FALLBACK COUNTRY, EVER. `null` means "not determined" and both callers
 * treat it as such: the price publishes nothing (BR-MONETIZACAO-069) and the
 * capture is gated (BR-USUARIO-033, item 2).
 */

/** Set by Vercel's network on every request to a deployment. */
export const VERCEL_COUNTRY_HEADER = "x-vercel-ip-country";
/** Set by Cloudflare when IP geolocation is on; only read against edge proof. */
export const CLOUDFLARE_COUNTRY_HEADER = "cf-ipcountry";

/** ISO-3166-1 alpha-2, and nothing else. */
const COUNTRY_CODE = /^[A-Za-z]{2}$/;

/**
 * Two-letter values that are NOT a country. Cloudflare answers `XX` when it
 * cannot geolocate the address and `T1` for the Tor network
 * (developers.cloudflare.com, "Cloudflare HTTP request headers", consulted
 * 2026-08-18). Both pass the regex above and neither is a territory, so they
 * resolve to `null` — the answer that fails closed.
 */
const NOT_A_COUNTRY = new Set(["XX", "T1"]);

/**
 * The visitor's country, or `null` when it could not be determined.
 *
 * @param edgeProven Whether the request proved it came through our Cloudflare
 * edge. Callers running on Node get it from `requestCameThroughOurEdge`
 * (`src/lib/rate-limit.ts`); the edge-runtime `/api/geo` cannot import that
 * module (it is built on `node:crypto`) and passes `false`, which costs it
 * only the accuracy note above and never trust.
 */
export function countryOf(headers: Headers, edgeProven = false): string | null {
  const candidates = [
    edgeProven ? headers.get(CLOUDFLARE_COUNTRY_HEADER) : null,
    headers.get(VERCEL_COUNTRY_HEADER),
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim().toUpperCase() ?? "";
    if (!COUNTRY_CODE.test(value) || NOT_A_COUNTRY.has(value)) continue;
    return value;
  }
  return null;
}

/**
 * The territories where the attribution capture runs WITHOUT asking first —
 * BR-USUARIO-033, item 1, and the list is the whole rule.
 *
 * It is INVERTED on purpose: it enumerates the exceptions, and everything
 * absent from it is gated, including a territory we could not determine. It
 * grows only by editing BR-USUARIO-033 with an official source per territory
 * — never by regional resemblance, never by "nobody enforces it there", and
 * never by an implementation decision taken here. As of 2026-08-18 the rule
 * lists exactly these two, and the reasons are written there: Brazil has no
 * second layer over storage on the device and legitimate interest carries it
 * (BR-USUARIO-034); the United States are notice-and-opt-out, not opt-in.
 */
export const TERRITORIES_WITHOUT_PRIOR_CONSENT: readonly string[] = ["BR", "US"];

/**
 * Whether the capture needs consent BEFORE it happens here — BR-USUARIO-033.
 *
 * `null` answers `true`. A legal gate that errs to the permissive side when
 * the datum is missing is the defect that only surfaces in an audit, and by
 * then it has been running for months.
 */
export function requiresPriorConsent(country: string | null): boolean {
  if (!country) return true;
  return !TERRITORIES_WITHOUT_PRIOR_CONSENT.includes(country);
}
