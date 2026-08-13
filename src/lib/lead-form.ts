/**
 * The two constants the partnership lead form shares with the rest of the site.
 *
 * They live here and not in `PartnerLeadForm.tsx` for a reason that is not
 * organisation: **every export of a `"use client"` module becomes a client
 * reference when a server component imports it**. A string imported from there
 * arrives on the server as a proxy object, and the first `startsWith` on it
 * fails the prerender of the whole page — which is how this file came to
 * exist.
 */

/** The id of the form section, and the anchor of the three CTAs of `/partners`. */
export const LEAD_FORM_ID = "lead-form";

/** Typed as a hash so `CtaHref` accepts it without a cast. */
export const LEAD_FORM_ANCHOR = `#${LEAD_FORM_ID}` as const;

/**
 * `lead_type` of the partnership funnel, in `campaign.inbound_leads`.
 *
 * Never `"B2B"`: that value belongs to the fleet form of `/contact`, and
 * merging the two funnels would leave both numbers meaning nothing (spec
 * §3.10).
 */
export const PARTNER_LEAD_TYPE = "B2B_PARTNER";
