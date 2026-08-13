/**
 * The type of business a partnership lead declares — and the two vocabularies
 * it is written in, which are not the same list.
 *
 * **On the wire and in the DOM the value is a `SegmentKey`** (or `"other"`):
 * that is the vocabulary the page already speaks — the grid card, the `<select>`
 * option and the pre-selection all key on it (`src/lib/segments.ts`), and it is
 * what `DS-COMPONENTE-005` keeps derived from one registry.
 *
 * **In `campaign.inbound_leads.business_type` the value is a language-neutral
 * code**, fixed by the CHECK constraint `inbound_leads_business_type_dominio`
 * (migration `20260812130000`, card #295). The column is not free text: a value
 * outside the six below is rejected by Postgres, and a rejection on this route
 * is a lead nobody ever calls back.
 *
 * So the translation lives here, in one place, and `POST /api/leads` is the
 * only caller — nothing else needs to know the database's spelling.
 *
 * ---------------------------------------------------------------------------
 * The gap this map has, and it is deliberate rather than hidden
 * ---------------------------------------------------------------------------
 *
 * `motorhome` has **no code of its own** in the CHECK. The domain was derived
 * from the list in the body of #294 — which named "receptivo e passeios" (a
 * segment that did not exist) and omitted motorhome (one that did) — and the
 * spec corrected the *form's* list without the database following. Mapping it
 * to `car_rental` would file a motorhome rental as a car rental, which is a
 * fact nobody typed; `other` says the honest thing, which is that the database
 * has no bucket for it yet. Extending the domain is `data`'s (a two-line
 * migration, per the reasoning in #295 for choosing `text` + CHECK over an
 * enum) and is reported in the comment of #294.
 */
import type { SegmentKey } from "./segments";
import { SEGMENTS } from "./segments";

/** What the form posts: one of the six segments, or "other". */
export type LeadBusinessType = SegmentKey | "other";

/**
 * The domain of `campaign.inbound_leads.business_type`, exactly as the CHECK
 * constraint spells it. Anything else is a 23514 from Postgres.
 */
export type BusinessTypeCode =
  | "restaurant_bar"
  | "hotel_inn"
  | "tours_activities"
  | "transfer"
  | "car_rental"
  | "other";

/** Wire value → column value. Total by construction: a new segment is a compile error here. */
const DB_CODE: Record<LeadBusinessType, BusinessTypeCode> = {
  restaurants: "restaurant_bar",
  lodging: "hotel_inn",
  receptive: "tours_activities",
  transfer: "transfer",
  "car-rental": "car_rental",
  // See the header: no bucket in the CHECK yet, and `other` is the value that
  // does not claim something the visitor did not say.
  motorhome: "other",
  other: "other",
};

/**
 * The options of the business-type field, in the order the grid shows them,
 * with `other` last. The `<select>` and the six cards read the same list —
 * seven options next to six cards is the page contradicting itself (spec §2.3).
 */
export const LEAD_BUSINESS_TYPES: readonly LeadBusinessType[] = [
  ...[...SEGMENTS].sort((a, b) => a.order - b.order).map((segment) => segment.key),
  "other",
];

/** `true` when `value` is a business type this site publishes. */
export function isLeadBusinessType(value: unknown): value is LeadBusinessType {
  return typeof value === "string" && (LEAD_BUSINESS_TYPES as readonly string[]).includes(value);
}

/** The column value for a wire value. Callers validate first — see the route. */
export function businessTypeCode(value: LeadBusinessType): BusinessTypeCode {
  return DB_CODE[value];
}
