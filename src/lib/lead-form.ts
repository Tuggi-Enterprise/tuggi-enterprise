/**
 * `lead_type` of the partnership funnel, in `campaign.inbound_leads`.
 *
 * The form that sent it lived on the site's partnership page, which became the
 * Locais portal in #990. The value stays because `/api/leads` still accepts it
 * and the rows already stored speak it.
 *
 * Never `"B2B"`: that value belongs to the fleet form of `/contact`, and
 * merging the two funnels would leave both numbers meaning nothing (spec
 * §3.10).
 */
export const PARTNER_LEAD_TYPE = "B2B_PARTNER";
