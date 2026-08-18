import { test, expect } from "@playwright/test";
import { clientAddressOf, EDGE_PROOF_HEADER, EDGE_SECRET_VAR } from "../../src/lib/rate-limit";

/**
 * Who the caller is, decided from headers — the value that becomes the stored
 * `ip_address` of a click (BR-B2B-002, contract §4) and the key of the counter
 * that is the only barrier in front of two anonymous `service_role` writes.
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

    // Last resort, then a value that is not an address at all — the column is
    // NOT NULL and the caller turns this into loopback rather than refusing.
    expect(clientAddressOf(new Headers({ "x-real-ip": VERCEL_IP }))).toBe(VERCEL_IP);
    expect(clientAddressOf(new Headers())).toBe("unknown");
  });
});
