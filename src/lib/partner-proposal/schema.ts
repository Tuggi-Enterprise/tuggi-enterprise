/**
 * What the server accepts from the public partnership proposal, derived from `fields.ts`.
 *
 * The schema is built from the field list rather than written next to it, so "the form asks X"
 * and "the server accepts X" cannot drift.
 *
 * Unknown keys are stripped, not rejected: this is an allowlist. A caller that posts
 * `commission_rate` gets a 200 and no `commission_rate`, because the route is the only barrier
 * left once `service_role` is in play.
 *
 * NO SCHEMA LIBRARY, and that is a decision rather than an omission. In the CMS this file was
 * six lines of `zod`; the site has no `zod` and this module is the only thing that would have
 * pulled one in. What `z.object({ …optional().max(n) })` guaranteed is written out in
 * `parseDraft` below, value for value: reject a body that is not a plain object, reject a known
 * key whose value is not a string, reject a value past its own `maxLength`, ignore everything
 * else. Adding a dependency to a public write path — one more package with its own release
 * cadence in front of `service_role` — costs more than twenty lines that a test pins.
 */

import {
  MATERIAL_FIELD_IDS,
  PARTNER_FORM_FIELDS,
  type PartnerField,
  type PartnerFieldId,
} from "./fields";
import { cnpjCharacters, isValidCnpj } from "@/lib/cnpj";

export type PartnerAnswers = Partial<Record<PartnerFieldId, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * A Brazilian number with area code, mask or no mask, and the country code optional — #402.
 *
 * `55` IS ACCEPTED BECAUSE THE SITE TEACHES IT. `Partners.form.whatsappHint`, on the landing page
 * one click before this form, publishes `+55 21 90000-0000` as the example; ten-or-eleven digits
 * alone refused that exact number and answered "Escreva o telefone com DDD" to somebody who had
 * just written one. The two surfaces are pinned together by a test — the published example has to
 * pass this pattern — so editing either side without the other goes red instead of shipping.
 *
 * This form may take both shapes where the landing page may not: it is Brazil-only by
 * construction (CNPJ with a check digit, UF, eight-digit CEP), so a `55` in front is this
 * country's code and not another one's. The landing page talks to somebody who has not said
 * where they are, which is why it asks for the country code and `src/lib/phone.ts` requires it.
 */
const PHONE_DIGITS = /^(55)?\d{10,11}$/;
const POSTAL_CODE_DIGITS = /^\d{8}$/;
/**
 * A quantity of promotional material: digits only, one to four of them, and never a leading zero.
 *
 * `maxLength` already caps the length, so this pattern is here for the SHAPE — `12 mesas`, `1,5`
 * and `-3` are all inside the limit and none of them is a number anybody can print. Four digits
 * because an order of five figures is a typo, not an order.
 */
const QUANTITY_DIGITS = /^[1-9]\d{0,3}$/;

export interface FieldProblem {
  field: PartnerFieldId;
  /** Copy key under `PartnerProposal.errors`, resolved by whoever renders. */
  code:
    | "required"
    | "email_malformed"
    | "phone_short"
    | "cnpj_incomplete"
    | "cnpj_invalid"
    | "postal_code"
    | "quantity_invalid"
    | "material_none"
    | "too_long";
}

/**
 * Everything that is wrong with a set of answers, as data. Rendering is the caller's: the same
 * list backs the server's 400 and the client's error summary, so the two cannot disagree about
 * what is missing.
 */
export function validateAnswers(answers: PartnerAnswers): FieldProblem[] {
  const problems: FieldProblem[] = [];

  for (const field of PARTNER_FORM_FIELDS) {
    const raw = (answers[field.id] ?? "").trim();

    if (raw.length > field.maxLength) {
      problems.push({ field: field.id, code: "too_long" });
      continue;
    }

    if (!raw) {
      if (field.required) problems.push({ field: field.id, code: "required" });
      continue;
    }

    switch (field.type) {
      case "email":
        if (!EMAIL_PATTERN.test(raw)) problems.push({ field: field.id, code: "email_malformed" });
        break;
      case "tel":
        if (!PHONE_DIGITS.test(raw.replace(/\D/g, ""))) {
          problems.push({ field: field.id, code: "phone_short" });
        }
        break;
      case "cnpj": {
        const clean = cnpjCharacters(raw);
        if (clean.length !== 14) problems.push({ field: field.id, code: "cnpj_incomplete" });
        else if (!isValidCnpj(clean)) problems.push({ field: field.id, code: "cnpj_invalid" });
        break;
      }
      case "postal_code":
        if (!POSTAL_CODE_DIGITS.test(raw.replace(/\D/g, ""))) {
          problems.push({ field: field.id, code: "postal_code" });
        }
        break;
      case "select":
        if (field.options && !field.options.includes(raw)) {
          problems.push({ field: field.id, code: "required" });
        }
        break;
      case "quantity":
        if (!QUANTITY_DIGITS.test(raw)) {
          problems.push({ field: field.id, code: "quantity_invalid" });
        }
        break;
      default:
        break;
    }
  }

  /**
   * The promotional material: EVERY field is optional on its own, and the SUM is not.
   *
   * This rule cannot live on a field, which is why it is here and not in the list. Each quantity
   * is `required: false` because blank means "I do not want this one" — a legitimate answer for
   * two of the three, and the reason the form has no checkbox beside each number. What is not
   * legitimate is wanting none of them: the establishment's side of the contract is displaying
   * the material (BR-B2B-021), so a partner who displays nothing cannot sign.
   *
   * The problem is reported on the FIRST material field so the per-step summary has somewhere to
   * point — a problem with no field is a message the person cannot act on.
   */
  const materialAnswered = MATERIAL_FIELD_IDS.some((id) => {
    const raw = (answers[id] ?? "").trim();
    return raw !== "" && QUANTITY_DIGITS.test(raw);
  });
  const materialAlreadyWrong = problems.some(
    (problem) => MATERIAL_FIELD_IDS.indexOf(problem.field) >= 0
  );
  // Not while one of them is malformed: `quantity_invalid` already says what to fix, and adding
  // "choose at least one" on top of it asks for something the person was in the middle of doing.
  if (!materialAnswered && !materialAlreadyWrong) {
    problems.push({ field: MATERIAL_FIELD_IDS[0], code: "material_none" });
  }

  return problems;
}

/** Problems of a single step, for the per-step error summary. */
export function problemsOfStep(
  problems: FieldProblem[],
  step: PartnerField["step"]
): FieldProblem[] {
  const ids = new Set(PARTNER_FORM_FIELDS.filter((f) => f.step === step).map((f) => f.id));
  return problems.filter((problem) => ids.has(problem.field));
}

/**
 * The quality nudges of step 3. They never block the submission and never say "rejected" — the
 * gate-2 decision of BR-B2B-011 has another owner and another moment (DS-COPY-015). This
 * function only says which nudge to show.
 */
const OFFER_WORDS =
  /\b(card[áa]pio|menu|pre[çc]o|promo[çc][ãa]o|delivery|reserva|desconto|quartos?|di[áa]ria)\b|R\$/i;

export const STORY_SHORT_THRESHOLD = 60;

export type StoryNudge = "short" | "offer" | null;

export function storyNudge(value: string, options: { required?: boolean } = {}): StoryNudge {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (OFFER_WORDS.test(text)) return "offer";
  if (options.required && text.length < STORY_SHORT_THRESHOLD) return "short";
  return null;
}

/**
 * The body, as far as shape goes: a plain object whose known keys are strings inside their own
 * limit. `null` means "this is not answers", and the caller has to refuse it.
 *
 * An array is not an object here, and neither is `null` — both used to reach the CMS's `z.object`
 * and be refused by it, and the behaviour is kept identical on purpose.
 */
function parseDraft(input: unknown): Record<string, string> | null {
  const source = input ?? {};
  if (typeof source !== "object" || Array.isArray(source)) return null;

  const parsed: Record<string, string> = {};
  for (const field of PARTNER_FORM_FIELDS) {
    const raw = (source as Record<string, unknown>)[field.id];
    if (raw === undefined) continue;
    if (typeof raw !== "string") return null;
    if (raw.length > field.maxLength) return null;
    parsed[field.id] = raw;
  }
  return parsed;
}

/**
 * Normalises what gets persisted: trims, reduces the CNPJ to its characters, strips unknown keys.
 *
 * THE CNPJ GOES THROUGH `cnpjCharacters`, THE SAME EXPRESSION `validateAnswers` CHECKS. Until
 * #398 this line called `normalizeCnpj`, which only strips `.` `/` `-`: a CNPJ typed with a
 * space, a tab, an underscore or a zero-width character passed validation (which strips
 * `[^A-Z0-9]` first) and was stored with the rubbish inside. The refusal of a CNPJ already in
 * `partner.clients` matches by shape, so it stopped firing — and the CMS conference screen, asking
 * the same question of the same value, told the reviewer there was no client to merge with. Two
 * expressions for one fact; there is one now, and `docs/contracts/partner-proposal-answers.md`
 * §2.1 is what it has to satisfy.
 *
 * `null` means the body is not answers, and the caller has to refuse it. It used to return `{}`
 * there, which the route then saved OVER the draft and confirmed with a 200: one non-string
 * value from a client bug erased everything the person had typed and told them it was saved. An
 * empty object is a legitimate draft; a rejected body is not one.
 */
export function normalizeAnswers(input: unknown): PartnerAnswers | null {
  const parsed = parseDraft(input);
  if (!parsed) return null;

  const answers: PartnerAnswers = {};
  for (const field of PARTNER_FORM_FIELDS) {
    const raw = parsed[field.id];
    if (raw === undefined) continue;
    const value = raw.trim();
    if (!value) continue;
    answers[field.id] = field.type === "cnpj" ? cnpjCharacters(value) : value;
  }
  return answers;
}
