/**
 * What the proposal counts about itself — the funnel, and the whole vocabulary of it.
 *
 * WHY IT EXISTS AT ALL. Until 2026-08-19 this surface emitted nothing: no view, no step, no
 * validation refusal, no submission. The only numbers the database held were the abuse counter
 * (`partner_form_attempts`, which counts POSTs and not people) and the submissions themselves.
 * "Where does the form lose people" had no answer and no way of getting one.
 *
 * MEASURING IS A DECLARED PURPOSE OF THIS COLLECTION, AND IT IS THE FIFTH. The operator declared
 * it on 2026-08-19. BR-USUARIO-028 item 1 makes the field and the line of the policy the same
 * delivery, so `Legal.Privacy.s1Item6` ships with this module and a test pins the pair: the
 * counter without the paragraph is the defect that rule exists to stop.
 *
 * WHAT THIS NEVER CARRIES, and it is the reason the purpose could be declared at all:
 *
 *  - no session identifier, and therefore no per-person abandonment rate — only volume per step,
 *    whose ratios are the drop curve, which is the number the operator asked for;
 *  - no address, hashed or otherwise;
 *  - no `user_agent`;
 *  - **nothing anybody typed** — not a CNPJ, not an e-mail, not a character of a story, not a
 *    length that could identify one. The only payload beyond the event name is the step number
 *    and, on a refusal, the `FieldProblem.code`, which is a closed vocabulary of this codebase.
 *
 * TWO DESTINATIONS, AND THEY ANSWER DIFFERENT QUESTIONS. GA4 answers "where", and it only sees
 * the visitors who accepted the cookie banner, so its totals are a subcount by construction. The
 * database answers "how many", for everybody. The rate published to the operator comes from the
 * database; GA is for diagnosing the step.
 */

import { sendGAEvent } from "@next/third-parties/google";

/** The endpoint that records the server-side count. */
export const FUNNEL_ENDPOINT = "/api/partner-proposal/funnel";

/**
 * The events, and the prefix is load-bearing.
 *
 * `proposal_`, NEVER `partner_form_`: `partner_form_start` already means the five-question lead
 * form of the landing page (`spec-lp-parcerias-2026-08.md` §3.10), and reusing the prefix would
 * merge two funnels into one number that means neither — the same mistake `B2B_PARTNER` was
 * created to avoid.
 */
export const FUNNEL_EVENTS = [
  "proposal_start",
  "proposal_step_view",
  "proposal_step_blocked",
  "proposal_submit_failed",
  "proposal_submitted",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/**
 * What the server-side table records, which is less than what GA4 does.
 *
 * `blocked` is not here on purpose: a validation refusal is a diagnosis, and diagnosis is GA's
 * half. The database's half is the drop curve, and a refusal is not a drop — the person is still
 * there, still typing.
 */
export const FUNNEL_KINDS = ["view", "start", "step", "submitted", "failed"] as const;
export type FunnelKind = (typeof FUNNEL_KINDS)[number];

export function isFunnelKind(value: unknown): value is FunnelKind {
  return typeof value === "string" && (FUNNEL_KINDS as readonly string[]).includes(value);
}

/** 1 to 4, and `null` for the kinds that are not about a step. */
export function isFunnelStep(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4;
}

/**
 * Sends one event to GA4, if GA4 is there at all.
 *
 * `sendGAEvent` is a no-op when the script never loaded, which is the ordinary case for every
 * visitor who has not accepted the banner — so this needs no consent check of its own, and
 * adding one would be a second flag beside `CONSENT_KEY` (`lib/consent.ts` explains why there is
 * exactly one).
 */
export function trackFunnel(event: FunnelEvent, params?: Record<string, string | number>): void {
  try {
    sendGAEvent({ event, ...(params ?? {}) });
  } catch {
    // Analytics never breaks the form it measures.
  }
}

/**
 * Records one step of the funnel on the server, for everybody — including the visitor who
 * refused the banner and the one behind an ad blocker.
 *
 * `keepalive`, because `submitted` fires on a screen that is about to be replaced, and a plain
 * `fetch` there is cancelled by the navigation often enough to bias the very number it feeds.
 *
 * Fire and forget, and the failure is swallowed on purpose: a form that shows an error because
 * its own analytics could not be recorded has made the measurement more important than the
 * partnership.
 */
export function countFunnel(kind: FunnelKind, step?: number): void {
  try {
    void fetch(FUNNEL_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, step: step ?? null }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Same as above.
  }
}
