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
 * ON THE CLOUDFLARE WORKER (tuggi-app#987), NO HEADER AT ALL. The country is
 * `request.cf.country`, which Cloudflare's runtime fills from the real client
 * address and no client can write (`src/lib/cloudflare-request.ts`). Headers
 * are not consulted there even when `cf` has no country: `cf-ipcountry` is only
 * added when the zone's visitor-location transform is on, and a header the
 * zone did not set is one the client did. Missing means `null`, never a
 * fallback.
 *
 * ON VERCEL, during the cut-over only: WHICH HEADER, AND WHY IN THIS ORDER.
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
 * THE LOCALE HINT READS THE SAME FUNCTION. `src/middleware.ts` and the two
 * landing pages also ask where the visitor is, to pick a locale and the
 * welcome dialect (`src/lib/ptDialect.ts`). They used to read
 * `x-vercel-ip-country` themselves, and the move to the Worker (#987) is what
 * that cost: five readers of a header one host stops sending. They now call
 * `countryOf` without the edge proof and treat `null` as "no hint", which is
 * what a missing header always meant to them. They stay a HINT: the worst case
 * is greeting a visitor in the wrong flavour of Portuguese.
 *
 * NO FALLBACK COUNTRY, EVER. `null` means "not determined" and both callers
 * treat it as such: the price publishes nothing (BR-MONETIZACAO-069) and the
 * capture is gated (BR-USUARIO-033, item 2).
 */

import { cloudflareRequestFacts, type CloudflareRequestFacts } from "@/lib/cloudflare-request";

/**
 * Set by Vercel's network on every request to a deployment. Read on Vercel
 * only, so it goes away with the Vercel project.
 */
export const VERCEL_COUNTRY_HEADER = "x-vercel-ip-country";
/**
 * Set by Cloudflare when the visitor-location transform is on. Read on Vercel
 * only, and only against edge proof; the Worker reads `request.cf` instead.
 */
export const CLOUDFLARE_COUNTRY_HEADER = "cf-ipcountry";
/**
 * Vercel's city, percent-encoded per RFC 3986: without `decodeURIComponent`
 * São Paulo arrives as `S%C3%A3o%20Paulo` (Vercel, *Request headers*,
 * consulted 2026-08-12). Read on Vercel only.
 */
export const VERCEL_CITY_HEADER = "x-vercel-ip-city";

/** The part of `Headers` read here, so `next/headers`' read-only view fits. */
type HeaderReader = Pick<Headers, "get">;

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
 * edge, from `requestCameThroughOurEdge` (`src/lib/rate-limit.ts`). Matters on
 * Vercel only; a locale hint passes nothing, which costs it only the accuracy
 * note above and never trust.
 * @param cloudflare `request.cf` when serving inside the Worker, `null`
 * elsewhere. Only the test passes this; production callers get the runtime's
 * answer. It is never derived from the request headers.
 */
export function countryOf(
  headers: HeaderReader,
  edgeProven = false,
  cloudflare: CloudflareRequestFacts | null = cloudflareRequestFacts()
): string | null {
  const candidates = cloudflare
    ? [cloudflare.country]
    : [
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
 * The approximate city of the connection, or `null`. Only the partnership
 * lead reads it (`src/app/api/leads/route.ts`), and never next to the IP.
 *
 * On the Worker it is `request.cf.city`. On Vercel it is the percent-encoded
 * header, and a value that does not decode is dropped: a lead is not worth
 * losing over a city nobody asked for.
 *
 * @param cloudflare Only the test passes this; see `countryOf`.
 */
export function cityOf(
  headers: HeaderReader,
  cloudflare: CloudflareRequestFacts | null = cloudflareRequestFacts()
): string | null {
  if (cloudflare) return cloudflare.city;
  const raw = headers.get(VERCEL_CITY_HEADER);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return null;
  }
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
