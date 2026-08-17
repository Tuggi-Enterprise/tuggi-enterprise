"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { localizedPathname } from "@/i18n/pathnames";
import { LEAD_FORM_ID } from "@/lib/lead-form";
import {
  PARTNER_FORM_STEP_COUNT,
  fieldsOfStep,
  partnerField,
  type PartnerField,
  type PartnerFieldId,
} from "@/lib/partner-proposal/fields";
import {
  storyNudge,
  validateAnswers,
  problemsOfStep,
  type FieldProblem,
  type PartnerAnswers,
} from "@/lib/partner-proposal/schema";
import { PROPOSAL_LOCALE } from "@/lib/partner-proposal/link";
import { clearMirror, readMirror, writeMirror } from "@/lib/partner-proposal/draft-mirror";
import { PartnerProposalField, errorMessage } from "./PartnerProposalField";
import {
  ALERT_BOX,
  BUTTON_PRIMARY,
  BUTTON_QUIET,
  BUTTON_SECONDARY,
  CARD,
  LINK_INLINE,
  NOTE_BOX,
  PAGE_SHELL,
} from "./styles";

/**
 * The partnership proposal (#341, moved to the site by #396) — four steps, one subject each,
 * and the last one is the review.
 *
 * NOTHING IS ASKED THAT THE TEAM ALREADY HAS. The alvará and the contrato social are checked in
 * person before an establishment is invited (operator, 2026-08-16), so this form has no upload
 * and no step for one — BR-B2B-022 is unchanged and is applied where it always was, at the
 * conference in the CMS that produces the contract.
 *
 * THE WAY BACK IS THE FIRST THING ON THE PAGE, and it is not decoration: until #396 everybody
 * who reached this form had a person from the Tuggi on the other end, and now it is one text
 * link away from a landing page that talks to strangers. Somebody who has never spoken to us has
 * to find that out before the first field, not on step 3 — `DS-COMPONENTE-026`, the "volta" half.
 *
 * THE DRAFT IS LOCAL AND ONLY LOCAL. There is no credential a server-side draft could be
 * addressed by; what is typed stays on the device for a day (`draft-mirror.ts`) and the copy says
 * exactly that instead of promising "salvo".
 *
 * There is no disabled submit button. Validation happens on the click and focus moves to the
 * error summary: a disabled button takes no focus and explains nothing.
 */

const STORY_FIELDS: PartnerFieldId[] = [
  "story_founder",
  "story_before",
  "story_unique",
  "story_event",
];

type Failure = "submit" | "tax_id_registered" | "too_many" | null;

/**
 * Where the "I have not spoken to anyone yet" link goes: the landing page, at its form.
 *
 * Built from the route map and from `LEAD_FORM_ID`, so neither the slug nor the anchor is
 * written twice — and as a plain `<a>` because next-intl's typed `Link` has no place for a hash
 * in this version, and inventing one by string-concatenating onto a typed href would be the
 * same slug written twice with extra steps.
 */
const BACK_TO_LANDING = `/${PROPOSAL_LOCALE}${localizedPathname(PROPOSAL_LOCALE, "/partners")}#${LEAD_FORM_ID}`;

export function PartnerProposalForm({ contactEmail }: { contactEmail: string }) {
  const t = useTranslations("PartnerProposal");

  // Read once, on the first render, and never again: re-reading would fight the person's
  // typing, and `useState` with an initialiser is the form React sanctions for this.
  const [restored] = useState(() => readMirror());
  const [answers, setAnswers] = useState<PartnerAnswers>(restored.answers);
  const [resumedAt, setResumedAt] = useState<string | null>(restored.savedAt);
  const [step, setStep] = useState(1);
  const [problems, setProblems] = useState<FieldProblem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const [submitted, setSubmitted] = useState<{ contactEmail: string | null } | null>(null);

  const summaryRef = useRef<HTMLDivElement>(null);
  const taxIdRef = useRef<HTMLDivElement>(null);

  // `useSyncExternalStore` and not an effect that calls setState: connectivity is an external
  // store, and reading it this way also gives the server snapshot (`true`) that keeps the first
  // paint free of an offline banner that would be wrong.
  const online = useSyncExternalStore(subscribeToConnectivity, () => navigator.onLine, () => true);

  const setAnswer = useCallback((id: PartnerFieldId, value: string) => {
    setAnswers((current) => {
      const next = { ...current, [id]: value };
      writeMirror(next);
      return next;
    });
    setProblems((current) => current.filter((problem) => problem.field !== id));
    // The server's refusal was about the value that just changed; it is no longer true.
    if (id === "tax_id") setFailure((current) => (current === "tax_id_registered" ? null : current));
  }, []);

  const allProblems = useMemo(() => validateAnswers(answers), [answers]);

  function goToStep(next: number) {
    setResumedAt(null);
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function handleContinue() {
    const stepProblems = problemsOfStep(allProblems, step as PartnerField["step"]);
    if (stepProblems.length > 0) {
      setProblems(stepProblems);
      // The summary takes focus so a screen reader hears what is missing instead of the page
      // silently refusing to advance.
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setProblems([]);
    goToStep(Math.min(step + 1, PARTNER_FORM_STEP_COUNT));
  }

  async function handleSubmit() {
    const remaining = allProblems;
    if (remaining.length > 0) {
      setProblems(remaining);
      setStep(partnerField(remaining[0].field).step);
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setSubmitting(true);
    setFailure(null);
    try {
      const response = await fetch("/api/partner-proposal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await response.json().catch(() => null);

      if (response.ok) {
        clearMirror();
        setSubmitted({ contactEmail: payload?.contactEmail ?? null });
        return;
      }

      if (payload?.error === "tax_id_registered") {
        // Back to the step that holds the CNPJ, with the refusal beside the field: the person is
        // on the review screen and the field is three screens behind them.
        setFailure("tax_id_registered");
        setStep(partnerField("tax_id").step);
        window.requestAnimationFrame(() => taxIdRef.current?.focus());
        return;
      }
      setFailure(payload?.error === "too_many_submissions" ? "too_many" : "submit");
    } catch {
      setFailure("submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={PAGE_SHELL}>
        <div className={CARD}>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-tuggi-dark">
            <CheckCircle2 className="h-6 w-6 text-tuggi-primary-text" aria-hidden="true" />
            {t("states.successTitle")}
          </h1>
          <p className="mt-4 text-base text-tuggi-dark leading-relaxed">
            {t("states.successBody", { email: submitted.contactEmail ?? "" })}
          </p>
        </div>
      </div>
    );
  }

  const stepProblems = problems;

  /* A <div> and not a <main>: `src/app/[locale]/layout.tsx` already opens
     `<main id="main-content">` around every page, so a <main> here nested a second
     landmark of the same role inside it (SC 1.3.1) — the same correction
     `src/app/[locale]/trust-center/layout.tsx` carries, and for the same reason. */
  return (
    <div className={PAGE_SHELL}>
      {/* The page says what it is, once, and it is the only <h1> here (#403).
          The step titles below are <h2>: they name the step, they change on every
          click, and a heading that changes under the visitor never told them which
          page they are on — the merchant arrives from "envie a proposta do seu
          estabelecimento" and used to read "O seu estabelecimento" as the top
          heading. Nothing else on this surface may be an <h1>; the success screen
          is one because it replaces this whole tree. */}
      <h1 className="mb-2 text-3xl font-bold text-tuggi-dark">{t("title")}</h1>

      {/* DS-COMPONENTE-026, the way back — before the first field, in DOM order. */}
      <p className="mb-6 text-base text-tuggi-slate leading-relaxed">
        {t.rich("lede", {
          lp: (chunks) => (
            <a href={BACK_TO_LANDING} className={LINK_INLINE}>
              {chunks}
            </a>
          ),
        })}
      </p>

      {!online ? (
        <div className={`mb-4 flex items-start gap-2 ${NOTE_BOX}`}>
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-tuggi-slate" aria-hidden="true" />
          <p className="text-base text-tuggi-dark">
            <strong>{t("states.offlineTitle")}</strong> {t("states.offlineBody")}
          </p>
        </div>
      ) : null}

      <header className="mb-6">
        <p className="text-sm font-semibold text-tuggi-slate">
          {/* Text as well as bar: state is never conveyed by length alone (DS-A11Y-003). */}
          {t("progress", { current: step, total: PARTNER_FORM_STEP_COUNT })}
        </p>
        <div
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={PARTNER_FORM_STEP_COUNT}
          aria-label={t("progress", { current: step, total: PARTNER_FORM_STEP_COUNT })}
          className="mt-2 h-2 w-full rounded bg-tuggi-bg"
        >
          <span
            className="block h-2 rounded bg-tuggi-primary-text"
            style={{ width: `${(step / PARTNER_FORM_STEP_COUNT) * 100}%` }}
          />
        </div>
        <p role="status" className="mt-2 text-sm text-tuggi-slate">
          {t("savedOnDevice")}
        </p>
      </header>

      {resumedAt && step === 1 ? (
        <div className={`mb-6 ${NOTE_BOX}`}>
          <p className="text-base text-tuggi-dark">
            {t("states.draftResumed", { date: formatDate(resumedAt) })}
          </p>
          <button
            type="button"
            className={`${BUTTON_QUIET} mt-2`}
            onClick={() => {
              if (!window.confirm(t("actions.restartConfirm"))) return;
              setAnswers({});
              clearMirror();
              setResumedAt(null);
            }}
          >
            {t("actions.restart")}
          </button>
        </div>
      ) : null}

      <div
        ref={summaryRef}
        tabIndex={-1}
        role={stepProblems.length > 0 ? "alert" : undefined}
        className={stepProblems.length > 0 ? `mb-6 ${ALERT_BOX}` : "sr-only"}
      >
        {stepProblems.length > 0 ? (
          <>
            <p className="flex items-center gap-2 text-base font-semibold text-tuggi-error">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              {t("errors.summary", { count: stepProblems.length })}
            </p>
            <ul className="mt-2 list-disc pl-5">
              {stepProblems.map((problem) => (
                <li key={problem.field}>
                  <a
                    href={`#partner-field-${problem.field}`}
                    className="text-base text-tuggi-error underline underline-offset-2"
                  >
                    {errorMessage(t, partnerField(problem.field), problem, answers[problem.field] ?? "")}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {failure === "tax_id_registered" ? (
        <div ref={taxIdRef} tabIndex={-1} role="alert" className={`mb-6 ${ALERT_BOX}`}>
          <p className="text-base font-semibold text-tuggi-error">
            {t("states.taxIdRegisteredTitle")}
          </p>
          <p className="mt-1 text-base text-tuggi-dark leading-relaxed">
            {t("states.taxIdRegisteredBody", { email: contactEmail })}
          </p>
        </div>
      ) : null}

      <div className={CARD}>
        {step <= 3 ? (
          <>
            <h2 className="text-2xl font-bold text-tuggi-dark">{t(`step${step}.title`)}</h2>
            <p className="mt-2 text-base text-tuggi-slate leading-relaxed">
              {t(`step${step}.subtitle`)}
            </p>
          </>
        ) : null}

        {step === 1 ? <div className="mt-6">{renderFields(1)}</div> : null}

        {step === 2 ? (
          <>
            <div className="mt-6">{renderFields(2)}</div>
            <div className={NOTE_BOX}>
              <p className="text-sm text-tuggi-dark leading-relaxed">{t("privacy.notice")}</p>
              <p className="mt-2 text-sm">
                {/* The policy of this same site now — it used to be an absolute, cross-origin URL
                    because the form lived in another deployment. A new tab, because a partner
                    halfway through this form must not lose it to read the policy; `noopener`
                    stays with `target="_blank"` regardless of origin. The `null` branch the CMS
                    carried is gone: a route declared in the map cannot not exist. */}
                <Link
                  href="/trust-center/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_INLINE}
                >
                  {t("privacy.link")}
                </Link>
              </p>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="mt-4 text-base text-tuggi-dark leading-relaxed">{t("step3.intro")}</p>
            <p className={`mt-4 text-base text-tuggi-dark leading-relaxed ${NOTE_BOX}`}>
              {t("step3.notHere")}
            </p>
            <details className="mt-4">
              <summary className={`${BUTTON_QUIET} cursor-pointer list-none`}>
                {t("actions.seeExample")}
              </summary>
              <div className="mt-3 space-y-3 text-base text-tuggi-dark leading-relaxed">
                <p>
                  <strong>{t("step3.exampleBadTitle")}</strong> <em>{t("step3.exampleBad")}</em>
                </p>
                <p className="text-tuggi-slate">{t("step3.exampleBadWhy")}</p>
                <p>
                  <strong>{t("step3.exampleGoodTitle")}</strong> <em>{t("step3.exampleGood")}</em>
                </p>
                <p className="text-tuggi-slate">{t("step3.exampleGoodWhy")}</p>
                <p>
                  <strong>{t("step3.exampleInnTitle")}</strong> <em>{t("step3.exampleInn")}</em>
                </p>
              </div>
            </details>
            <div className="mt-6">{renderFields(3)}</div>
            <p className="text-base text-tuggi-dark leading-relaxed">
              <strong>{t("step3.substituteTestTitle")}</strong> {t("step3.substituteTest")}
            </p>
            <p className="mt-4 text-base text-tuggi-slate leading-relaxed">{t("step3.curation")}</p>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="text-2xl font-bold text-tuggi-dark">{t("step4.title")}</h2>
            <p className="mt-2 text-base text-tuggi-slate leading-relaxed">{t("step4.subtitle")}</p>
            {[1, 2, 3].map((reviewStep) => (
              <section key={reviewStep} className="mt-6 border-t border-tuggi-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  {/* One level under the review's own <h2>: these repeat the three
                      step titles inside step 4, so they are its children. */}
                  <h3 className="text-lg font-semibold text-tuggi-dark">
                    {t(`step${reviewStep}.title`)}
                  </h3>
                  <button type="button" className={BUTTON_QUIET} onClick={() => goToStep(reviewStep)}>
                    {t("actions.edit")}
                  </button>
                </div>
                <dl className="mt-2">
                  {fieldsOfStep(reviewStep as PartnerField["step"]).map((field) => (
                    <div key={field.id} className="py-1">
                      <dt className="text-sm text-tuggi-slate">{t(`fields.${field.id}.label`)}</dt>
                      <dd className="text-base text-tuggi-dark">
                        {answers[field.id] || (
                          <span className="text-tuggi-slate">{t("step4.empty")}</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            {failure === "submit" || failure === "too_many" ? (
              <div role="alert" className={`mt-6 ${ALERT_BOX}`}>
                <p className="text-base font-semibold text-tuggi-error">
                  {failure === "too_many" ? t("states.tooManyTitle") : t("states.submitErrorTitle")}
                </p>
                <p className="text-base text-tuggi-dark leading-relaxed">
                  {failure === "too_many"
                    ? t("states.tooManyBody", { email: contactEmail })
                    : t("states.submitErrorBody", { email: contactEmail })}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {step > 1 ? (
          // `Voltar` sits above and never beside: two targets side by side at 360 px get
          // mistapped.
          <button type="button" className={BUTTON_SECONDARY} onClick={() => goToStep(step - 1)}>
            {t("actions.back")}
          </button>
        ) : null}

        {step < PARTNER_FORM_STEP_COUNT ? (
          <button type="button" className={BUTTON_PRIMARY} onClick={handleContinue}>
            {t("actions.continue")}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={BUTTON_PRIMARY}
              onClick={handleSubmit}
              aria-busy={submitting}
            >
              {submitting ? t("actions.submitting") : t("actions.submit")}
            </button>
            {/* Read BEFORE the click, not after it: nothing here is correctable by replying to
                an e-mail the Tuggi never sends (DS-COPY-018). */}
            <p className="text-sm text-tuggi-slate">{t("step4.beforeSubmit")}</p>
          </>
        )}
      </div>
    </div>
  );

  function renderFields(currentStep: PartnerField["step"]) {
    return fieldsOfStep(currentStep).map((field) => (
      <PartnerProposalField
        key={field.id}
        field={field}
        value={answers[field.id] ?? ""}
        problem={stepProblems.find((problem) => problem.field === field.id)}
        onChange={(value) => setAnswer(field.id, value)}
        nudge={renderNudge(field)}
      />
    ));
  }

  function renderNudge(field: PartnerField) {
    if (!STORY_FIELDS.includes(field.id)) return null;
    const nudge = storyNudge(answers[field.id] ?? "", { required: field.required });
    if (!nudge) return null;
    return (
      // `role="status"`, never `role="alert"`: these never block the submission and never say
      // "rejected" (DS-COPY-015).
      <p role="status" className="mt-2 text-sm text-tuggi-slate">
        {nudge === "short" ? t("step3.nudgeShort") : t("step3.nudgeOffer")}
      </p>
    );
  }
}

function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function formatDate(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}
