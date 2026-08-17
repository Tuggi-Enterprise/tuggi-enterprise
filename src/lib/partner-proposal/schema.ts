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

import { PARTNER_FORM_FIELDS, type PartnerField, type PartnerFieldId } from "./fields";
import { cnpjCharacters, isValidCnpj } from "@/lib/cnpj";

export type PartnerAnswers = Partial<Record<PartnerFieldId, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ten or eleven digits: a Brazilian number with area code, mask or no mask. */
const PHONE_DIGITS = /^\d{10,11}$/;
const POSTAL_CODE_DIGITS = /^\d{8}$/;

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
      default:
        break;
    }
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
 * `core.clients` matches by shape, so it stopped firing — and the CMS conference screen, asking
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
