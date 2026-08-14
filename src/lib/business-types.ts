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
 * (migration `20260812150000`, card #302, which widened the domain the
 * migration of #295 first created). The column is not free text: a value
 * outside the list below is rejected by Postgres, and a rejection on this route
 * is a lead nobody ever calls back.
 *
 * So the translation lives here, in one place, and `POST /api/leads` is the
 * only caller — nothing else needs to know the database's spelling.
 *
 * ---------------------------------------------------------------------------
 * The property to keep: this map is injective
 * ---------------------------------------------------------------------------
 *
 * Two form values that collapse into one code make the segment the prospect
 * declared unrecoverable — `other` written by this map and `other` chosen by
 * the visitor are the same text, and the form keeps no copy of the original,
 * so a row filed that way can only ever be guessed at. That is exactly what
 * happened while `motorhome` had no code of its own (#302), and it is what
 * `tests/e2e/partner-lead-form.spec.ts` now asserts over the whole map.
 *
 * A segment added here with no code in the CHECK is therefore a migration to
 * ask `data` for, not a neighbouring bucket to borrow.
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
  | "motorhome"
  | "other";

/** Wire value → column value. Total by construction: a new segment is a compile error here. */
const DB_CODE: Record<LeadBusinessType, BusinessTypeCode> = {
  restaurants: "restaurant_bar",
  lodging: "hotel_inn",
  receptive: "tours_activities",
  transfer: "transfer",
  "car-rental": "car_rental",
  motorhome: "motorhome",
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
