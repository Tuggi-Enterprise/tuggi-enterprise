/**
 * The two budgets of the attribution capture — BR-B2B-002.
 *
 * `POST /api/attribution` answers TWO different requests through one address,
 * and until 2026-08-18 it spent one budget on both:
 *
 *   - a WRITE: a visitor with no first touch yet, who gets a row in
 *     `drive.click_fingerprints` and the cookie that names it;
 *   - a READ: a visitor who already carries `tuggi_attr` and gets his own
 *     `click_id` echoed back, with no row and no cookie written.
 *
 * WHY THEY CANNOT SHARE A BUDGET. The read is not rare: since the consent gate
 * (BR-USUARIO-033) moved the reading of `tuggi_attr` behind a same-origin
 * verdict, `storedClickId` is null for one round trip on EVERY load, so
 * `PartnerHero` posts a capture that the route answers from the visitor's own
 * cookie. On the Wi-Fi of a rental desk or a hotel lobby, where dozens of
 * tourists share one NAT address, reloads by visitors who are already
 * attributed would eat the 30/h of a stranger's FIRST touch — and a first touch
 * lost is a partner's commission lost, in silence and with nothing logged.
 *
 * The mechanism is still the one owner, `@/lib/rate-limit`; what is separated
 * here is the budget, which is exactly the split that module's `bucket`
 * argument exists for. Neither of these can spend the proposal door's budget
 * either (`registerSubmissionAttempt`, bucket `""`).
 */

import { registerAttempt, type RateLimitDecision } from "@/lib/rate-limit";

/** One hour, for both budgets — the same window, two ceilings. */
export const CAPTURE_WINDOW_SECONDS = 60 * 60;

/**
 * How often one address may OPEN a click row: 30 in an hour.
 *
 * The legitimate shape is one visitor, one row, once — the `tuggi_attr` cookie
 * means a returning visitor does not write again. The generous ceiling is for
 * the hotel lobby and the restaurant Wi-Fi, where a whole coach of tourists
 * scans the same printed QR from behind one NAT address within minutes. Mass
 * planting of rows to farm the probabilistic match is orders of magnitude above
 * this.
 */
export const CAPTURE_LIMIT_PER_WINDOW = 30;

/** Its own bucket, so a tourist's scan cannot lock a partner out of the proposal form. */
export const CAPTURE_BUCKET = "attribution";

/**
 * How often one address may have an EXISTING first touch echoed back: 300 in an
 * hour, ten times the write ceiling.
 *
 * WHY THERE IS A CEILING AT ALL, since nothing is written. The cookie comes
 * from the client, so anyone can forge a well-formed `tuggi_attr` — two UUIDs
 * is all `parseAttribution` can demand of it — and reach the echo without ever
 * touching the write budget. That is the intended trade: a forged cookie buys a
 * reply that repeats what the caller himself sent, and buys no row. But the
 * route sits in front of a `service_role` write and a public door with no
 * ceiling at all is an invocation faucet, so the read path is counted too, just
 * against a budget of its own.
 *
 * WHY IT CAN AFFORD TO BE GENEROUS. Being refused here costs the visitor
 * nothing: the `click_id` he needs is in his own cookie, and the page reads it
 * directly through `useAttributionClickId` as soon as the gate verdict arrives.
 * A 429 on this path is one wasted round trip, not a lost attribution — which
 * is the opposite of a 429 on the write path.
 */
export const ECHO_LIMIT_PER_WINDOW = 300;

/** The read's own bucket: it can neither spend nor be spent by the write above. */
export const ECHO_BUCKET = "attribution-echo";

/** Counts one attempt to WRITE a first touch, and says whether it may proceed. */
export function registerCaptureAttempt(clientAddress: string): Promise<RateLimitDecision> {
  return registerAttempt({
    bucket: CAPTURE_BUCKET,
    clientAddress,
    windowSeconds: CAPTURE_WINDOW_SECONDS,
    maxAttempts: CAPTURE_LIMIT_PER_WINDOW,
  });
}

/** Counts one attempt to READ back an existing first touch. */
export function registerEchoAttempt(clientAddress: string): Promise<RateLimitDecision> {
  return registerAttempt({
    bucket: ECHO_BUCKET,
    clientAddress,
    windowSeconds: CAPTURE_WINDOW_SECONDS,
    maxAttempts: ECHO_LIMIT_PER_WINDOW,
  });
}
