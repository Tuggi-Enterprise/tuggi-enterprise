/**
 * The partnership proposal (#341, moved to the site by #396) — the single list of what it asks.
 *
 * One declaration per field drives all four things that used to drift apart: what the browser
 * renders, what `autocomplete` it announces, what the server accepts, and which copy key
 * carries the label. Copy is NOT here — it lives in `src/messages/pt.json` under
 * `PartnerProposal`, and the key is derived from the id, so a field without copy fails loudly
 * instead of rendering an empty label.
 *
 * THIS FILE IS ONE HALF OF A CROSS-REPOSITORY CONTRACT. The proposal is written here and read
 * in `tuggi-cms` — the conference screen, the regularity band and the promotion all index
 * `partner.partner_form_submissions.answers` by these ids. Renaming one, dropping one or changing
 * `required` changes what the CMS reads, and the document that says so is
 * `docs/contracts/partner-proposal-answers.md`. The CMS keeps its own copy of the ids it reads
 * (`tuggi-cms/lib/partner-form/fields.ts`); the contract is what keeps the two honest, because
 * two repositories cannot share a module.
 *
 * Two things this list is also the proof of, and both are tested:
 *
 * - `FORBIDDEN_FIELDS` — no banking column and no `billing_email` may ever appear here.
 *   Banking is out by the card's own decision (the R$ 100 flow runs partner → Tuggi, so the
 *   partner needs Tuggi's account and not the other way round), and `billing_email` is out
 *   because asking for a billing address on a public capture surface implies a charge, which
 *   BR-B2B-015 item 8 and BR-B2B-016 item 6 close.
 * - Nothing here is written to `partner.clients` by a public route. The submission is a proposal;
 *   the promotion is an authenticated act of the team in the CMS (BR-B2B-026, item 4).
 */

import { BRAZIL_STATE_CODES } from "@/lib/brazil-states";

export type PartnerFieldId =
  // Step 1 — the establishment
  | "trade_name"
  | "legal_name"
  | "tax_id"
  | "category"
  | "address"
  | "address_complement"
  | "district"
  | "postal_code"
  | "city"
  | "state"
  | "instagram"
  | "opening_hours"
  | "website"
  | "material_sticker_qty"
  | "material_table_display_qty"
  | "material_counter_display_qty"
  // Step 2 — who answers for the establishment
  | "representative_name"
  | "representative_role"
  | "representative_email"
  | "representative_phone"
  // Step 3 — the story of the place
  | "story_founder"
  | "story_before"
  | "story_unique"
  | "story_event";

export type PartnerFieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "cnpj"
  | "postal_code"
  | "select"
  | "textarea"
  | "quantity";

export interface PartnerField {
  id: PartnerFieldId;
  step: 1 | 2 | 3;
  type: PartnerFieldType;
  required: boolean;
  /** SC 1.3.5. Absent when no HTML autofill token describes the field. */
  autoComplete?: string;
  maxLength: number;
  /** Option ids for a select. The label of each one is a copy key. */
  options?: readonly string[];
}

/**
 * The three kinds of promotional material the partner may ask for — and the vocabulary is
 * shared with the database, not merely similar to it.
 *
 * `core.material_order_items.kind` carries these exact three ids in its CHECK, and the field id
 * of each one is `material_<kind>_qty`, derived below rather than typed out. So a fourth kind is
 * one edit here, one CHECK widened in the migration, and one line in the CMS mirror; there is no
 * fourth place where the list could disagree with itself.
 *
 * WHY THE COUNTER DISPLAY IS OFFERED TO EVERYONE and not only to hotels: the piece is the same
 * piece for now (operator, 2026-08-19). A restaurant has a till, a shop has a counter, and
 * gating the option on `category` would be a rule about a difference that does not exist yet.
 */
export const MATERIAL_KINDS = ["sticker", "table_display", "counter_display"] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

/** The field id that carries the quantity asked for one kind. */
export function materialFieldId(kind: MaterialKind): PartnerFieldId {
  return `material_${kind}_qty` as PartnerFieldId;
}

export const MATERIAL_FIELD_IDS: readonly PartnerFieldId[] = MATERIAL_KINDS.map(materialFieldId);

/** Up to four digits. A pedido of five figures is a typo, not an order. */
export const MATERIAL_QUANTITY_MAX_LENGTH = 4;

/** Categories offered in step 1. Ids in English; labels in `src/messages/pt.json`. */
export const PARTNER_CATEGORIES = [
  "restaurant",
  "bar_cafe",
  "hotel",
  "inn",
  "shop",
  "attraction",
  "other",
] as const;

export const PARTNER_FORM_FIELDS: readonly PartnerField[] = [
  { id: "trade_name", step: 1, type: "text", required: true, autoComplete: "organization", maxLength: 160 },
  { id: "legal_name", step: 1, type: "text", required: true, maxLength: 200 },
  // `type="text"` and never `type="number"`; the input mode is decided in the component and
  // is `text`, because a numeric keypad makes an alphanumeric CNPJ physically impossible to
  // type.
  { id: "tax_id", step: 1, type: "cnpj", required: true, maxLength: 18 },
  { id: "category", step: 1, type: "select", required: true, maxLength: 32, options: PARTNER_CATEGORIES },
  { id: "address", step: 1, type: "text", required: true, autoComplete: "street-address", maxLength: 200 },
  { id: "address_complement", step: 1, type: "text", required: false, maxLength: 120 },
  { id: "district", step: 1, type: "text", required: true, maxLength: 120 },
  { id: "postal_code", step: 1, type: "postal_code", required: true, autoComplete: "postal-code", maxLength: 9 },
  { id: "city", step: 1, type: "text", required: true, autoComplete: "address-level2", maxLength: 120 },
  { id: "state", step: 1, type: "select", required: true, autoComplete: "address-level1", maxLength: 2, options: BRAZIL_STATE_CODES },
  { id: "instagram", step: 1, type: "text", required: false, maxLength: 60 },
  { id: "opening_hours", step: 1, type: "textarea", required: false, maxLength: 400 },
  { id: "website", step: 1, type: "url", required: false, maxLength: 300 },

  // The promotional material, at the END of step 1 and NOT in a fifth step. Three numbers do
  // not pay for one more screen to abandon, and the person is already declaring the place.
  //
  // NO CHECKBOX BESIDE EACH NUMBER, deliberately: a tick plus a quantity has an invalid state
  // ("ticked, no number") that the form would then have to explain. Blank IS "I do not want
  // this one", and `required: false` is what says so per field. What is required is the SUM,
  // and that rule cannot live on a single field — it is in `validateAnswers`.
  ...MATERIAL_KINDS.map((kind) => ({
    id: materialFieldId(kind),
    step: 1 as const,
    type: "quantity" as const,
    required: false,
    maxLength: MATERIAL_QUANTITY_MAX_LENGTH,
  })),

  { id: "representative_name", step: 2, type: "text", required: true, autoComplete: "name", maxLength: 160 },
  { id: "representative_role", step: 2, type: "text", required: true, autoComplete: "organization-title", maxLength: 120 },
  { id: "representative_email", step: 2, type: "email", required: true, autoComplete: "email", maxLength: 255 },
  { id: "representative_phone", step: 2, type: "tel", required: true, autoComplete: "tel", maxLength: 32 },

  // Exactly one required question in step 3, and it is the one nobody can get wrong: a name
  // plus a year is already a dated, attributable anchor (DS-COPY-015). The other three raise
  // quality and must stay optional — not every place has them.
  { id: "story_founder", step: 3, type: "textarea", required: true, maxLength: 1200 },
  { id: "story_before", step: 3, type: "textarea", required: false, maxLength: 1200 },
  { id: "story_unique", step: 3, type: "textarea", required: false, maxLength: 1200 },
  { id: "story_event", step: 3, type: "textarea", required: false, maxLength: 1200 },
] as const;

export const PARTNER_FIELD_IDS = PARTNER_FORM_FIELDS.map((field) => field.id);

export function fieldsOfStep(step: PartnerField["step"]): readonly PartnerField[] {
  return PARTNER_FORM_FIELDS.filter((field) => field.step === step);
}

export function partnerField(id: PartnerFieldId): PartnerField {
  const field = PARTNER_FORM_FIELDS.find((candidate) => candidate.id === id);
  if (!field) throw new Error(`unknown partner proposal field: ${id}`);
  return field;
}

/**
 * Columns of `partner.clients` that this surface must never ask for. Kept as data, not as prose
 * in a comment, because `tests/e2e/partner-proposal.spec.ts` asserts against it: a field added
 * by copy-paste from the CMS editor fails the suite instead of shipping.
 */
export const FORBIDDEN_FIELDS = [
  "iban",
  "bic_swift",
  "bank_account_number",
  "bank_routing_number",
  "bank_name",
  "billing_email",
  "commission_rate",
  "status",
  "slug",
] as const;

/** Three subjects and the review; the person sees `Passo N de 4`. */
export const PARTNER_FORM_STEPS = [1, 2, 3, 4] as const;
export const PARTNER_FORM_STEP_COUNT = PARTNER_FORM_STEPS.length;
