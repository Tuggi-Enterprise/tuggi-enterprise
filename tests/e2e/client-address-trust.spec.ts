import { test, expect } from "@playwright/test";
import {
  clientAddressOf,
  EDGE_PROOF_HEADER,
  EDGE_SECRET_VAR,
  isIpv4Address,
} from "../../src/lib/rate-limit";

/**
 * Who the caller is, decided from headers — the value that becomes the stored
 * `ip_address_v4` of a click (BR-B2B-002, contract §3 and §4) and the key of
 * the counter that is the only barrier in front of three anonymous
 * `service_role` writes.
 *
 * WHAT BROKE, AND WHY IT LOOKED RIGHT. `CF-Connecting-IP` is the visitor's
 * address on the Cloudflare path and reading it first is the documented fix for
 * storing edge addresses. It is also spoofable here, because Cloudflare is not
 * the only way in: measured 2026-08-18, the Vercel deployment URL answers
 * directly, with `server: Vercel` and no `cf-ray`. On that path the header is an
 * ordinary client header. `POST /api/attribution` with a chosen
 * `CF-Connecting-IP` filed a capture under a victim's address, and — since the
 * rate-limit bucket is keyed on the same value — bought a fresh 30/h budget per
 * request, on a route that also sends e-mail through `/api/partner-proposal`.
 *
 * So the header is honoured only against proof of our own edge, and the four
 * cases below are the whole decision. `x-forwarded-for` is the floor because
 * Vercel guarantees it: it "overwrite[s] the `X-Forwarded-For` header and do[es]
 * not forward external IPs… to prevent IP spoofing"
 * (vercel.com/docs/headers/request-headers, consulted 2026-08-18).
 */

/**
 * Whatever `cf-connecting-ip` carries: the real visitor on the Cloudflare path,
 * and an address of the caller's choosing on the direct one. The header does
 * not say which, and that is the whole problem.
 */
const CF_CLAIMED_IP = "203.0.113.7";
/** What Vercel put there, which is the only address nobody chose. */
const VERCEL_IP = "198.51.100.4";
const EDGE_SECRET = "an-edge-shared-secret-for-the-test";

test.describe("cf-connecting-ip is honoured only against proof of our edge", () => {
  test("BR-B2B-002: with the shared secret, the visitor's address is the Cloudflare one", () => {
    const headers = new Headers({
      [EDGE_PROOF_HEADER]: EDGE_SECRET,
      "cf-connecting-ip": CF_CLAIMED_IP,
      "x-forwarded-for": VERCEL_IP,
    });

    // The proxied path is the one this exists for: `x-forwarded-for` here is the
    // Cloudflare edge, and storing it is what made every fingerprint useless.
    expect(clientAddressOf(headers, EDGE_SECRET)).toBe(CF_CLAIMED_IP);
  });

  test("BR-B2B-002: with no secret configured, cf-connecting-ip is ignored even when present", () => {
    const headers = new Headers({
      [EDGE_PROOF_HEADER]: EDGE_SECRET,
      "cf-connecting-ip": CF_CLAIMED_IP,
      "x-forwarded-for": VERCEL_IP,
    });

    // An unset variable must never mean "trust the header". A deploy that
    // forgot the variable degrades to a Cloudflare edge address in the row —
    // useless, and it was the previous state — never to an address the caller
    // chose.
    expect(clientAddressOf(headers, "")).toBe(VERCEL_IP);

    // And the production entry point, called the way the routes call it, reads
    // the secret from the environment at module scope. This process has none.
    expect(
      (process.env[EDGE_SECRET_VAR] ?? "").trim(),
      `this case proves the unconfigured deploy, so ${EDGE_SECRET_VAR} must not be set while the suite runs`
    ).toBe("");
    expect(clientAddressOf(headers)).toBe(VERCEL_IP);
  });

  test("BR-B2B-002: a wrong or forged proof is worth exactly as much as none", () => {
    const forged = new Headers({
      [EDGE_PROOF_HEADER]: "not-the-secret",
      "cf-connecting-ip": CF_CLAIMED_IP,
      "x-forwarded-for": VERCEL_IP,
    });
    expect(clientAddressOf(forged, EDGE_SECRET)).toBe(VERCEL_IP);

    // A prefix of the secret is the shape a timing attack would grow into, and
    // it is refused like any other wrong value.
    const prefix = new Headers({
      [EDGE_PROOF_HEADER]: EDGE_SECRET.slice(0, -1),
      "cf-connecting-ip": CF_CLAIMED_IP,
      "x-forwarded-for": VERCEL_IP,
    });
    expect(clientAddressOf(prefix, EDGE_SECRET)).toBe(VERCEL_IP);

    // No proof header at all: the ordinary direct request, and the ordinary
    // exploit — this is the exact call the audit of 2026-08-18 made.
    const bare = new Headers({
      "cf-connecting-ip": CF_CLAIMED_IP,
      "x-forwarded-for": VERCEL_IP,
    });
    expect(clientAddressOf(bare, EDGE_SECRET)).toBe(VERCEL_IP);
  });

  test("BR-B2B-002: the fallback is x-forwarded-for, first entry, without the ::ffff: prefix", () => {
    // `next start` and any Node server in front report IPv4 mapped into IPv6.
    // The app sends the plain form and the install match is a string equality,
    // so the two would never meet if the prefix survived.
    expect(clientAddressOf(new Headers({ "x-forwarded-for": `::ffff:${VERCEL_IP}` }))).toBe(
      VERCEL_IP
    );

    // A list means proxies in front, and the first entry is the client.
    expect(
      clientAddressOf(new Headers({ "x-forwarded-for": ` ${VERCEL_IP} , 172.71.0.1 ` }))
    ).toBe(VERCEL_IP);

    // Last resort, then a value that is not an address at all. No row carries
    // this any more — since 2026-09-03 the capture writes no address column —
    // but the counter still keys on it, and `unknown` is a key like any other.
    expect(clientAddressOf(new Headers({ "x-real-ip": VERCEL_IP }))).toBe(VERCEL_IP);
    expect(clientAddressOf(new Headers())).toBe("unknown");
  });

  test("BR-B2B-002: brackets and a zone come off too, not only the ::ffff: prefix", () => {
    // THE DIVERGENCE THIS CLOSES. Contract §3 has always demanded the address
    // "sem o prefixo `::ffff:`, sem zona (`%eth0`) e sem colchetes", and
    // `clientAddressOf` did only the first of the three until 2026-09-03 —
    // the code and the contract each said something the other did not.
    //
    // It is not theoretical. Measured 2026-09-03, forcing IPv6 against
    // `ip4.tuggi.app` answers `::ffff:64.29.17.65`: the mapped form really is
    // on the path, and the family check of `/api/attribution/ip` would read
    // that raw string as IPv6 and store nothing at all.
    expect(clientAddressOf(new Headers({ "x-forwarded-for": "::ffff:64.29.17.65" }))).toBe(
      "64.29.17.65"
    );

    // An IPv6 literal in brackets is the RFC 7239 shape a proxy may forward,
    // with or without a port.
    expect(clientAddressOf(new Headers({ "x-forwarded-for": "[2804:14c::1]" }))).toBe(
      "2804:14c::1"
    );
    expect(clientAddressOf(new Headers({ "x-forwarded-for": "[2804:14c::1]:41234" }))).toBe(
      "2804:14c::1"
    );

    // A zone runs to the end of the address by definition (RFC 4007 §11), and
    // it names an interface on the machine that wrote it — it can never be part
    // of a value the install match compares.
    expect(clientAddressOf(new Headers({ "x-forwarded-for": "fe80::1%eth0" }))).toBe("fe80::1");

    // All three at once, which is the order the normalisation has to survive.
    expect(clientAddressOf(new Headers({ "x-forwarded-for": "[::ffff:1.2.3.4%eth0]" }))).toBe(
      "1.2.3.4"
    );

    // And a candidate that normalises to nothing falls through to the next one
    // rather than becoming an empty counter key shared by every caller.
    expect(
      clientAddressOf(new Headers({ "x-forwarded-for": "[]", "x-real-ip": VERCEL_IP }))
    ).toBe(VERCEL_IP);
  });

  test("BR-B2B-002: only a strict dotted quad counts as IPv4 — contract §3", () => {
    // What decides whether personal data is written at all in
    // `/api/attribution/ip`: the operator chose to keep the IPv4 family only,
    // and "looks a bit like an address" is not a decision. A value that is not
    // IPv4 leaves the row untouched and the route answers the same 204.
    expect(isIpv4Address("64.29.17.65")).toBe(true);
    expect(isIpv4Address("0.0.0.0")).toBe(true);
    expect(isIpv4Address("255.255.255.255")).toBe(true);

    expect(isIpv4Address("256.1.1.1")).toBe(false);
    expect(isIpv4Address("1.2.3")).toBe(false);
    expect(isIpv4Address("1.2.3.4.5")).toBe(false);
    expect(isIpv4Address("unknown")).toBe(false);
    expect(isIpv4Address("2804:14c:632f::1")).toBe(false);

    // The mapped form is IPv4 and answers true only once the prefix is off,
    // which is precisely why the normalisation above has to run first.
    expect(isIpv4Address("::ffff:64.29.17.65")).toBe(false);
    expect(isIpv4Address(clientAddressOf(new Headers({ "x-forwarded-for": "::ffff:64.29.17.65" })))).toBe(
      true
    );
  });
});
