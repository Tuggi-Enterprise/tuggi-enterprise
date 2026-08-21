"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { BRAZIL_STATES } from "@/lib/brazil-states";
import { PARTNER_CATEGORIES, PLAN_CHOICES, type PartnerField } from "@/lib/partner-proposal/fields";
import { maskCnpjInput, cnpjCharactersMissing, CNPJ_INPUT_PLACEHOLDER } from "@/lib/cnpj";
import {
  PHONE_PLACEHOLDER,
  POSTAL_CODE_PLACEHOLDER,
  maskPhoneInput,
  maskPostalCodeInput,
  normalizeInstagramInput,
  normalizeWebsiteInput,
} from "@/lib/partner-proposal/field-format";
import type { FieldProblem } from "@/lib/partner-proposal/schema";
import {
  FIELD_CONTROL,
  FIELD_CONTROL_INVALID,
  FIELD_ERROR,
  FIELD_HELP,
  FIELD_LABEL,
} from "./styles";

/**
 * One field of the partnership proposal, rendered from its declaration.
 *
 * The label is a real `<label htmlFor>` and never a placeholder (SC 3.3.2). Help is persistent
 * text under the label and not a placeholder either — a placeholder disappears exactly when the
 * person starts writing, which is when they need the example.
 *
 * `aria-describedby` points at help and error together, `aria-invalid` marks the field, and the
 * error carries an icon AND text (DS-A11Y-003), never colour alone.
 *
 * ---------------------------------------------------------------------------------------------
 * Two things changed here on 2026-08-19, and both were the same omission
 * ---------------------------------------------------------------------------------------------
 *
 * **`onBlur` is passed now.** It was declared on this component and NO CALLER EVER PASSED IT, so
 * validation only ran on `Continuar` — while `PartnerLeadForm`, five questions long on the
 * landing page one click earlier, had validated on blur since #294. The prop was orphan code
 * (CLAUDE.md §6) with a product cost: a person who fixed an invalid e-mail into a different
 * invalid e-mail watched the red disappear and found out three screens later.
 *
 * **The CEP and the phone got the mask the quantity field already had.** `postal_code` passed
 * `event.target.value` through untouched — letters, spaces, nine characters of anything — and
 * `representative_phone` fell through to the default branch with no formatting at all, under a
 * help line publishing `21 90000-0000` as the shape. The masks are in `field-format.ts`, where a
 * test can hold them to it.
 */

/** Fraction of the limit at which the remaining budget becomes visible (spec §6). */
const COUNTER_THRESHOLD = 0.8;

interface PartnerProposalFieldProps {
  field: PartnerField;
  value: string;
  problem?: FieldProblem;
  onChange: (value: string) => void;
  /** Runs when the field loses focus: this is where per-field validation happens. */
  onBlur?: (normalized: string) => void;
  /** Rendered under the field: the non-blocking nudges of step 3. */
  nudge?: React.ReactNode;
  /** Rendered under the control: what the CEP lookup has to say, when it has something. */
  note?: React.ReactNode;
  /** `done` on the last field of a step, so the phone keyboard stops offering "next". */
  last?: boolean;
}

export function PartnerProposalField({
  field,
  value,
  problem,
  onChange,
  onBlur,
  nudge,
  note,
  last,
}: PartnerProposalFieldProps) {
  const t = useTranslations("PartnerProposal");
  const inputId = `partner-field-${field.id}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const counterId = `${inputId}-counter`;

  // `t.has` and not `t(...) || null`: in the CMS the fields with no help carried an EMPTY
  // string, which the site refuses (`no-hardcoded-copy.spec.ts` — an empty value renders
  // nothing and hides a translation that was never written). Here the key is simply absent, and
  // an absent key in next-intl renders THE KEY NAME, which is exactly what must not appear
  // under a label. So the question is asked before the value is read.
  const help = t.has(`fields.${field.id}.help`) ? t(`fields.${field.id}.help`) : "";

  // The counter exists only where the limit is soft. A textarea has no `maxLength` on purpose
  // (below), so nothing stops the person at the limit: the warning has to arrive before the
  // damage, and the last fifth of the budget is where it is still cheap to shorten. Inputs keep
  // their hard limit and need no counter.
  const remaining = field.maxLength - value.length;
  const showCounter =
    field.type === "textarea" &&
    remaining >= 0 &&
    value.length >= field.maxLength * COUNTER_THRESHOLD;

  const describedBy = [help ? helpId : null, showCounter ? counterId : null, problem ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const controlClass = `${FIELD_CONTROL}${problem ? ` ${FIELD_CONTROL_INVALID}` : ""}`;

  /**
   * The value that leaves the field when focus does, for the two fields whose normalisation is
   * a blur and not a keystroke.
   *
   * `website` gets its scheme here rather than on `change` because prefixing `https://` while
   * somebody is typing the first letter puts the cursor after a scheme they did not ask for.
   * `instagram` is normalised on `change` (a paste is one event and the person should see the
   * handle immediately), so it only passes through unchanged.
   */
  function normalizeOnBlur(raw: string): string {
    if (field.id === "website") return normalizeWebsiteInput(raw);
    return raw;
  }

  function handleBlur() {
    if (!onBlur) return;
    const normalized = normalizeOnBlur(value);
    if (normalized !== value) onChange(normalized);
    onBlur(normalized);
  }

  /**
   * `choice` and `consent` do not have ONE control for a `<label htmlFor>` to point at: the
   * first is a group of radios and the second is a tick whose own label is the statement beside
   * it. Pointing an outer `<label>` at a `<fieldset>` is invalid, and wrapping a `<label>`
   * around a second `<label>` gives the checkbox two accessible names. So the heading is a
   * paragraph for those two, and each control carries its own name — the legend for the group,
   * the statement for the tick.
   */
  const grouped = field.type === "choice" || field.type === "consent";

  return (
    <div className="mb-6">
      {grouped ? (
        <p className={FIELD_LABEL}>{t(`fields.${field.id}.label`)}</p>
      ) : (
        <label htmlFor={inputId} className={FIELD_LABEL}>
          {t(`fields.${field.id}.label`)}
        </label>
      )}
      {help ? (
        <p id={helpId} className={FIELD_HELP}>
          {help}
        </p>
      ) : null}

      {renderControl()}

      {showCounter ? (
        <p id={counterId} className={FIELD_HELP}>
          {t("charactersLeft", { n: remaining })}
        </p>
      ) : null}

      {note}
      {nudge}

      {problem ? (
        <p id={errorId} className={FIELD_ERROR} role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage(t, field, problem, value)}</span>
        </p>
      ) : null}
    </div>
  );

  function renderControl() {
    // `next` on every field but the last of its step: the phone keyboard's action key is the
    // cheapest "continue" this form has, and without it the key says `return` and does nothing.
    const shared = {
      id: inputId,
      name: field.id,
      value,
      onBlur: handleBlur,
      "aria-invalid": problem ? (true as const) : undefined,
      "aria-describedby": describedBy || undefined,
      autoComplete: field.autoComplete,
      enterKeyHint: last ? ("done" as const) : ("next" as const),
      className: controlClass,
    };

    switch (field.type) {
      case "textarea":
        // No `maxLength`, deliberately: with it, pasting a long story TRUNCATES IN SILENCE — the
        // person loses the end of their own text without a word, and `errors.too_long`, which
        // says how much to cut, becomes unreachable exactly when it is the right message. The
        // limit is enforced on submit (`validateAnswers`), and the counter above warns first.
        //
        // `enterKeyHint` is dropped here: in a textarea the action key inserts a newline, and
        // labelling it "next" would promise a jump it does not make.
        return (
          <textarea
            {...shared}
            enterKeyHint={undefined}
            rows={3}
            onChange={(event) => onChange(event.target.value)}
          />
        );

      case "select":
        return (
          <select {...shared} onChange={(event) => onChange(event.target.value)}>
            <option value="" />
            {optionsOf(field, (key) => t(key)).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      /**
       * A radio group, not a `<select>`: two options whose labels are whole sentences, on a
       * phone. A closed set this small is read once and answered once, and a select would hide
       * one of the two behind a tap.
       *
       * The group is a `<fieldset>` whose `<legend>` is the question, so a screen reader
       * announces what is being chosen before the first option — the outer `<label htmlFor>`
       * points at no single control here, which is why the legend has to carry it.
       */
      case "choice":
        return (
          <fieldset
            id={inputId}
            aria-describedby={describedBy || undefined}
            aria-invalid={problem ? true : undefined}
          >
            <legend className="sr-only">{t(`fields.${field.id}.label`)}</legend>
            {optionsOf(field, (key) => t(key)).map((option) => (
              <label
                key={option.value}
                className="mb-2 flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-left"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => onChange(option.value)}
                  onBlur={handleBlur}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        );

      /**
       * The declaration. `"true"` when ticked and empty otherwise, so the ordinary `required`
       * branch of `validateAnswers` is what refuses it — there is no second rule for the gate.
       */
      case "consent":
        return (
          <label className="flex items-start gap-3 text-left">
            <input
              id={inputId}
              name={field.id}
              type="checkbox"
              checked={value === "true"}
              aria-invalid={problem ? true : undefined}
              aria-describedby={describedBy || undefined}
              onChange={(event) => onChange(event.target.checked ? "true" : "")}
              onBlur={handleBlur}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span>{t(`fields.${field.id}.statement`)}</span>
          </label>
        );

      case "cnpj":
        return (
          <input
            {...shared}
            // `type="text"` and `inputMode="text"`, deliberately. A numeric keypad makes an
            // alphanumeric CNPJ physically impossible to type, and `type="number"` breaks the
            // mask on top of that.
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={18}
            // Not copy: the shape of the mask this same module enforces, in the notation the
            // Receita Federal note itself uses. It reads the same in the four locales.
            placeholder={CNPJ_INPUT_PLACEHOLDER}
            onChange={(event) => onChange(maskCnpjInput(event.target.value))}
          />
        );

      case "quantity":
        return (
          <input
            {...shared}
            // `type="text"` with `inputMode="numeric"`, not `type="number"`. A number input
            // scrolls its own value when the wheel passes over it, accepts `e` and `-`, and
            // renders spinners nobody asked for — for a plain count, none of that is worth the
            // keypad it buys, and `inputMode` buys the keypad anyway.
            type="text"
            inputMode="numeric"
            maxLength={field.maxLength}
            // Digits only, as the person types: a `12 mesas` typed here would be refused on
            // submit, and refusing it three screens later is the error this avoids entirely.
            onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          />
        );

      case "postal_code":
        return (
          <input
            {...shared}
            type="text"
            inputMode="numeric"
            maxLength={9}
            placeholder={POSTAL_CODE_PLACEHOLDER}
            onChange={(event) => onChange(maskPostalCodeInput(event.target.value))}
          />
        );

      case "email":
        return (
          <input
            {...shared}
            type="email"
            inputMode="email"
            // The phone's autocorrect is what turns `contato@bardojoao.com.br` into
            // `Contato@…`, and an address that lost its case is an address the contract does
            // not reach.
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={field.maxLength}
            onChange={(event) => onChange(event.target.value)}
          />
        );

      case "tel":
        return (
          <input
            {...shared}
            type="tel"
            inputMode="tel"
            maxLength={field.maxLength}
            placeholder={PHONE_PLACEHOLDER}
            onChange={(event) => onChange(maskPhoneInput(event.target.value))}
          />
        );

      case "url":
        return (
          <input
            {...shared}
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={field.maxLength}
            onChange={(event) => onChange(event.target.value)}
          />
        );

      default:
        return (
          <input
            {...shared}
            type="text"
            autoCapitalize={field.id === "instagram" ? "none" : undefined}
            autoCorrect={field.id === "instagram" ? "off" : undefined}
            spellCheck={field.id === "instagram" ? false : undefined}
            maxLength={field.maxLength}
            onChange={(event) =>
              onChange(
                field.id === "instagram"
                  ? normalizeInstagramInput(event.target.value)
                  : event.target.value
              )
            }
          />
        );
    }
  }
}

function optionsOf(
  field: PartnerField,
  translate: (key: string) => string
): { value: string; label: string }[] {
  if (field.id === "state") {
    return BRAZIL_STATES.map((state) => ({
      value: state.code,
      label: `${state.code} — ${state.name}`,
    }));
  }
  if (field.id === "category") {
    return PARTNER_CATEGORIES.map((category) => ({
      value: category,
      label: translate(`categories.${category}`),
    }));
  }
  if (field.id === "plan_choice") {
    return PLAN_CHOICES.map((choice) => ({
      value: choice,
      label: translate(`plans.${choice}`),
    }));
  }
  return (field.options ?? []).map((option) => ({ value: option, label: option }));
}

/**
 * What a stored answer LOOKS LIKE on a screen that shows it back — #404.
 *
 * The review of step 4 rendered `answers[field.id]` raw, so somebody who had chosen *"Bar ou
 * café"* read `bar_cafe` on the one screen that says *"confira o que você escreveu"*. A code
 * identifier where the name of the business should be makes the reader doubt what the system
 * understood, and the CMS half of the same grid had the same defect with `categoryLabel` already
 * calculated one line above it.
 *
 * Exported because the review grid renders it and a test asserts it: choice fields show the
 * label, everything else shows what was typed.
 */
export function displayAnswer(
  field: PartnerField,
  value: string,
  translate: (key: string) => string
): string {
  if (!value) return "";
  // A tick has no stored label to show back: `true` on the review screen is a code where a
  // sentence belongs, the same defect `bar_cafe` was in #404.
  if (field.type === "consent") return translate("consentConfirmed");
  if (field.type !== "select" && field.type !== "choice") return value;
  const option = optionsOf(field, translate).find((candidate) => candidate.value === value);
  return option ? option.label : value;
}

/**
 * The required message names the field, always — "Preencha o nome do estabelecimento", never
 * "campo obrigatório". Everything else comes from the shared error table, so the server's 400
 * and this summary cannot disagree.
 *
 * There is NO generic fallback, and that is the point: `errors.required` was removed because a
 * field whose copy is missing has to fail loudly (the promise `fields.ts` makes) instead of
 * rendering a sentence that helps nobody and that nobody discovers. A missing key surfaces as
 * the key itself, and the suite refuses it (DS-COMPONENTE-016).
 */
export function errorMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  field: PartnerField,
  problem: FieldProblem,
  value: string
): string {
  if (problem.code === "required") {
    return t(`fields.${field.id}.requiredError`);
  }
  // `material_none` is anchored on the first material field, but it is about the THREE of them.
  // Reading `fields.<id>.requiredError` here would say "how many stickers do you want?" to
  // somebody whose actual answer is "a table display" — the message has to name the choice, not
  // the field it happens to hang from.
  if (problem.code === "material_none") {
    return t("errors.material_none");
  }
  if (problem.code === "cnpj_incomplete") {
    return t("errors.cnpj_incomplete", { n: cnpjCharactersMissing(value) });
  }
  if (problem.code === "too_long") {
    // DS-COPY-002: saying what to do includes saying how much.
    return t("errors.too_long", { max: field.maxLength, over: value.length - field.maxLength });
  }
  return t(`errors.${problem.code}`);
}
