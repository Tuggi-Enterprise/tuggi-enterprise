"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AlertCircle, CheckCircle2, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { localizedPathname } from "@/i18n/pathnames";
import { LEAD_FORM_ID } from "@/lib/lead-form";
import {
  PARTNER_FORM_STEP_COUNT,
  PARTNER_FORM_FIELDS,
  fieldsOfStep,
  partnerField,
  MATERIAL_FIELD_IDS,
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
import { isCompletePostalCode, postalCodeDigits } from "@/lib/partner-proposal/field-format";
import {
  POSTAL_CODE_ENDPOINT,
  type PostalCodeAddress,
} from "@/lib/partner-proposal/postal-code-lookup";
import { countFunnel, trackFunnel } from "@/lib/partner-proposal/funnel";
import { PartnerProposalField, displayAnswer, errorMessage } from "./PartnerProposalField";
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
 *
 * ---------------------------------------------------------------------------------------------
 * What the pass of 2026-08-19 changed, and why each one is not cosmetic
 * ---------------------------------------------------------------------------------------------
 *
 *  - **Each step is a real `<form>`.** There was none: `<div>`s and `<button type="button">`.
 *    On a phone that costs the keyboard's own action key — it says `return` and does nothing —
 *    and it costs autofill, whose address grouping in Chrome and Safari uses the form boundary
 *    as a signal. This is the surface where filling the address by hand is the expensive part.
 *  - **Validation happens on blur**, per field, and the error clears when the value becomes
 *    valid rather than on the first keystroke. See `PartnerProposalField`.
 *  - **A CEP fills the street, the district, the town and the UF.** Four fields typed by
 *    somebody standing behind a counter, replaced by eight digits. It never blocks: every
 *    failure leaves the fields empty and editable.
 *  - **Changing step moves focus to the step's heading.** `scrollTo` moved the page and left the
 *    focus on a button that had become another button, so a screen reader was never told.
 *  - **The funnel is counted** (`funnel.ts`). This surface emitted nothing at all.
 *  - **The review shows labels, not identifiers** — #404.
 *  - **The three material quantities moved to the end of step 3.** Step 1 carried 16 of the 24
 *    fields and its own subtitle had stopped describing it.
 */

const STORY_FIELDS: PartnerFieldId[] = [
  "story_founder",
  "story_before",
  "story_unique",
  "story_event",
];

/** Every step whose fields are asked rather than reviewed. */
type AskStep = PartnerField["step"];

type Failure = "submit" | "unavailable" | "too_many" | null;

/**
 * Where the "I have not spoken to anyone yet" link goes: the landing page, at its form.
 *
 * Built from the route map and from `LEAD_FORM_ID`, so neither the slug nor the anchor is
 * written twice — and as a plain `<a>` because next-intl's typed `Link` has no place for a hash
 * in this version, and inventing one by string-concatenating onto a typed href would be the
 * same slug written twice with extra steps.
 */
const BACK_TO_LANDING = `/${PROPOSAL_LOCALE}${localizedPathname(PROPOSAL_LOCALE, "/partners")}#${LEAD_FORM_ID}`;

/** Required fields, counted once: the denominator of the progress bar. */
const REQUIRED_FIELD_IDS = PARTNER_FORM_FIELDS.filter((field) => field.required).map(
  (field) => field.id
);

export function PartnerProposalForm({ contactEmail }: { contactEmail: string }) {
  const t = useTranslations("PartnerProposal");

  // Read once, on the first render, and never again: re-reading would fight the person's
  // typing, and `useState` with an initialiser is the form React sanctions for this.
  const [restored] = useState(() => readMirror());
  const [answers, setAnswers] = useState<PartnerAnswers>(restored.answers);
  const [resumedAt, setResumedAt] = useState<string | null>(restored.savedAt);
  const [step, setStep] = useState(1);
  const [problems, setProblems] = useState<FieldProblem[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const [submitted, setSubmitted] = useState<{ contactEmail: string | null } | null>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [postalFilled, setPostalFilled] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const stepsSeen = useRef<number[]>([]);
  const postalLookedUp = useRef<string>("");

  // `useSyncExternalStore` and not an effect that calls setState: connectivity is an external
  // store, and reading it this way also gives the server snapshot (`true`) that keeps the first
  // paint free of an offline banner that would be wrong.
  const online = useSyncExternalStore(subscribeToConnectivity, () => navigator.onLine, () => true);

  const allProblems = useMemo(() => validateAnswers(answers), [answers]);

  /**
   * The first step is a view like any other, and it is counted from an effect rather than at the
   * top of the render: in React 19 the body of a component may run twice, and a count that ran
   * with it would report two visitors for one.
   */
  useEffect(() => {
    countFunnel("view", 1);
    trackFunnel("proposal_step_view", { step: 1 });
    stepsSeen.current = [1];
  }, []);

  /** First touch of any field, once per session — the denominator of "started but did not send". */
  const markStarted = useCallback(() => {
    if (started.current) return;
    started.current = true;
    trackFunnel("proposal_start");
    countFunnel("start");
  }, []);

  const setAnswer = useCallback((id: PartnerFieldId, value: string) => {
    markStarted();
    setAnswers((current) => {
      const next = { ...current, [id]: value };
      writeMirror(next);
      // The error of a field that is already showing one is re-decided against the value that
      // has just been typed — not cleared. Clearing on the first keystroke is what let somebody
      // replace an invalid e-mail with a different invalid e-mail and see nothing.
      setProblems((shown) =>
        shown.some((problem) => problem.field === id)
          ? replaceProblemsOf(shown, [id], validateAnswers(next))
          : shown
      );
      return next;
    });
    if (id === "postal_code") setPostalFilled(false);
  }, [markStarted]);

  /**
   * The address behind a CEP, asked once per complete CEP.
   *
   * It only ever WRITES INTO EMPTY FIELDS. Somebody who typed the street before the CEP keeps
   * what they typed, and somebody correcting a wrong district does not have it overwritten by
   * the next keystroke in the postal code. Failure is silent by design: `route.ts` answers
   * `{ address: null }` to everything that went wrong, and a null here means "type it yourself".
   */
  const lookUpPostalCode = useCallback(
    async (value: string) => {
      const digits = postalCodeDigits(value);
      if (!isCompletePostalCode(value) || postalLookedUp.current === digits) return;
      postalLookedUp.current = digits;

      let address: PostalCodeAddress | null = null;
      try {
        const response = await fetch(`${POSTAL_CODE_ENDPOINT}?cep=${digits}`);
        address = ((await response.json()) as { address?: PostalCodeAddress | null })?.address ?? null;
      } catch {
        return;
      }
      if (!address) return;

      setAnswers((current) => {
        const next = { ...current };
        const fill = (id: PartnerFieldId, incoming: string) => {
          if (!incoming) return;
          if ((next[id] ?? "").trim()) return;
          next[id] = incoming;
        };
        fill("address", address.street);
        fill("district", address.district);
        fill("city", address.city);
        fill("state", address.state);
        writeMirror(next);
        return next;
      });
      setPostalFilled(true);
    },
    []
  );

  /**
   * One field lost focus: decide that field, and nothing else on the screen.
   *
   * The three quantities are decided together because `material_none` is a rule about their SUM
   * and hangs off the first of them — blurring the second one has to be able to clear a message
   * anchored on the first.
   */
  const handleBlur = useCallback(
    (id: PartnerFieldId, normalized: string) => {
      const nextAnswers = normalized === (answers[id] ?? "") ? answers : { ...answers, [id]: normalized };
      const ids = MATERIAL_FIELD_IDS.includes(id) ? MATERIAL_FIELD_IDS : [id];
      setProblems((shown) => replaceProblemsOf(shown, ids, validateAnswers(nextAnswers)));
      if (id === "postal_code") void lookUpPostalCode(normalized);
    },
    [answers, lookUpPostalCode]
  );

  function goToStep(next: number) {
    setResumedAt(null);
    setStep(next);
    setShowSummary(false);
    window.scrollTo({ top: 0 });
    // The heading of the step that has just arrived takes focus, so the change is announced.
    // `scrollTo` alone left the focus on a button that had become a different button.
    window.requestAnimationFrame(() => headingRef.current?.focus());

    if (!stepsSeen.current.includes(next)) {
      stepsSeen.current.push(next);
      countFunnel("view", next);
    }
    trackFunnel("proposal_step_view", { step: next });
  }

  function handleContinue() {
    const stepProblems = problemsOfStep(allProblems, step as AskStep);
    if (stepProblems.length > 0) {
      setProblems(stepProblems);
      setShowSummary(true);
      trackFunnel("proposal_step_blocked", {
        step,
        problems: stepProblems.length,
        first_code: stepProblems[0].code,
      });
      // The summary takes focus so a screen reader hears what is missing instead of the page
      // silently refusing to advance.
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setProblems([]);
    countFunnel("step", step);
    goToStep(Math.min(step + 1, PARTNER_FORM_STEP_COUNT));
  }

  async function handleSubmit() {
    const remaining = allProblems;
    if (remaining.length > 0) {
      setProblems(remaining);
      setShowSummary(true);
      setStep(partnerField(remaining[0].field).step);
      trackFunnel("proposal_step_blocked", {
        step: PARTNER_FORM_STEP_COUNT,
        problems: remaining.length,
        first_code: remaining[0].code,
      });
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
        trackFunnel("proposal_submitted", { category: answers.category ?? "" });
        countFunnel("submitted");
        setSubmitted({ contactEmail: payload?.contactEmail ?? null });
        return;
      }

      // 503 IS NOT 429, and the two copies say different things — #400. A limit that was really
      // reached passes with time; a counter that could not answer does not, and telling the
      // owner of a restaurant to wait a few minutes for that is telling him something false.
      const reason: Failure =
        payload?.error === "too_many_submissions"
          ? "too_many"
          : response.status === 503
            ? "unavailable"
            : "submit";
      setFailure(reason);
      trackFunnel("proposal_submit_failed", { reason });
      countFunnel("failed");
    } catch {
      setFailure("submit");
      trackFunnel("proposal_submit_failed", { reason: "submit" });
      countFunnel("failed");
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
  const answeredRequired = REQUIRED_FIELD_IDS.filter((id) => (answers[id] ?? "").trim()).length;

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
      <p className="mb-2 text-base text-tuggi-slate leading-relaxed">
        {t.rich("lede", {
          lp: (chunks) => (
            <a href={BACK_TO_LANDING} className={LINK_INLINE}>
              {chunks}
            </a>
          ),
        })}
      </p>

      {/* THE OTHER WAY OUT, and it replaced a refusal — 2026-08-19.
          Until this date, somebody whose establishment was already a client filled 24 fields and
          met a 409 on the send. The refusal is gone — it was a public oracle of who is a client
          of the Tuggi, in exchange for a guarantee the database now gives on its own — and what
          takes its place is this: a line, before the first field, that lets the person recognise
          themselves and leave at second zero.

          IT IS SHOWN TO EVERY VISITOR AND CHECKS NOTHING, which is the whole design. Nothing is
          looked up and nothing varies, so a stranger reading it learns exactly what a partner
          reads, which is nothing about anybody. `DS-COMPONENTE-026`, the same bridge as the line
          above and in the other direction. */}
      <p className="mb-6 text-base text-tuggi-slate leading-relaxed">
        {t.rich("alreadyPartner", {
          mail: (chunks) => (
            <a href={`mailto:${contactEmail}`} className={LINK_INLINE}>
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
          {/* THE BAR FILLS BY ANSWER AND THE LABEL COUNTS STEPS, and the two are not in
              conflict: `aria-valuenow` is the step because that is what the text says out
              loud, while the fill is the fraction of required fields answered because that
              is what the person's effort actually bought. A bar that jumped a quarter after
              thirteen fields and another quarter after four was telling them the wrong
              thing about the four. */}
          <span
            className="block h-2 rounded bg-tuggi-primary-text transition-[width] duration-300"
            style={{ width: `${Math.round((answeredRequired / REQUIRED_FIELD_IDS.length) * 100)}%` }}
          />
        </div>
        {/* A plain paragraph and not `role="status"`: the sentence never changes, and a live
            region carrying static text is re-announced on every render for nothing. */}
        <p className="mt-2 text-sm text-tuggi-slate">{t("savedOnDevice")}</p>
      </header>

      {resumedAt && step === 1 ? (
        <div className={`mb-6 ${NOTE_BOX}`}>
          <p className="text-base text-tuggi-dark">
            {t("states.draftResumed", { date: formatDate(resumedAt) })}
          </p>
          {confirmingRestart ? (
            // In place, and not `window.confirm`: the native dialog is unstyled, outside the
            // page's language of buttons, and on iOS it takes the whole screen for one question.
            <div role="group" aria-label={t("actions.restart")}>
              <p className="mt-2 text-base text-tuggi-dark">{t("actions.restartConfirm")}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={BUTTON_QUIET}
                  onClick={() => {
                    setAnswers({});
                    clearMirror();
                    setResumedAt(null);
                    setProblems([]);
                    setConfirmingRestart(false);
                  }}
                >
                  {t("actions.restartConfirmYes")}
                </button>
                <button
                  type="button"
                  className={BUTTON_QUIET}
                  onClick={() => setConfirmingRestart(false)}
                >
                  {t("actions.restartCancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`${BUTTON_QUIET} mt-2`}
              onClick={() => setConfirmingRestart(true)}
            >
              {t("actions.restart")}
            </button>
          )}
        </div>
      ) : null}

      <div
        ref={summaryRef}
        tabIndex={-1}
        role={showSummary && stepProblems.length > 0 ? "alert" : undefined}
        className={showSummary && stepProblems.length > 0 ? `mb-6 ${ALERT_BOX}` : "sr-only"}
      >
        {showSummary && stepProblems.length > 0 ? (
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


      <div className={CARD}>
        {step <= 3 ? (
          <>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-tuggi-dark outline-none"
            >
              {t(`step${step}.title`)}
            </h2>
            <p className="mt-2 text-base text-tuggi-slate leading-relaxed">
              {t(`step${step}.subtitle`)}
            </p>
          </>
        ) : null}

        {/* One `<form>` per step, so the phone keyboard offers "next"/"done" and the browser
            groups the address fields for autofill. `onSubmit` is what the action key and the
            primary button both go through; there is still no disabled button anywhere. */}
        <form onSubmit={onFormSubmit} noValidate>
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
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-tuggi-dark outline-none"
              >
                {t("step4.title")}
              </h2>
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
                    {fieldsOfStep(reviewStep as AskStep).map((field) => (
                      <div key={field.id} className="py-1">
                        <dt className="text-sm text-tuggi-slate">{t(`fields.${field.id}.label`)}</dt>
                        <dd className="text-base text-tuggi-dark">
                          {/* #404: the label of a choice, never its identifier. Somebody who
                              picked "Bar ou café" was reading `bar_cafe` on the one screen
                              that asks them to confirm what they wrote. */}
                          {displayAnswer(field, answers[field.id] ?? "", (key) => t(key)) || (
                            <span className="text-tuggi-slate">{t("step4.empty")}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}

              {failure ? (
                <div role="alert" className={`mt-6 ${ALERT_BOX}`}>
                  <p className="text-base font-semibold text-tuggi-error">
                    {t(`states.${failureCopyKey(failure)}Title`)}
                  </p>
                  <p className="text-base text-tuggi-dark leading-relaxed">
                    {t(`states.${failureCopyKey(failure)}Body`, { email: contactEmail })}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="mt-6 space-y-3">
            {step > 1 ? (
              // `Voltar` sits above and never beside: two targets side by side at 360 px get
              // mistapped. `type="button"`, so the keyboard's action key never goes backwards.
              <button type="button" className={BUTTON_SECONDARY} onClick={() => goToStep(step - 1)}>
                {t("actions.back")}
              </button>
            ) : null}

            {step < PARTNER_FORM_STEP_COUNT ? (
              <button type="submit" className={BUTTON_PRIMARY}>
                {t("actions.continue")}
              </button>
            ) : (
              <>
                <button type="submit" className={BUTTON_PRIMARY} aria-busy={submitting}>
                  {submitting ? t("actions.submitting") : t("actions.submit")}
                </button>
                {/* Read BEFORE the click, not after it: nothing here is correctable by replying to
                    an e-mail the Tuggi never sends (DS-COPY-018). */}
                <p className="text-sm text-tuggi-slate">{t("step4.beforeSubmit")}</p>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  function onFormSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step < PARTNER_FORM_STEP_COUNT) handleContinue();
    else void handleSubmit();
  }

  function renderFields(currentStep: AskStep) {
    const fields = fieldsOfStep(currentStep);
    return fields.map((field, index) => (
      <Fragment key={field.id}>
        {field.id === MATERIAL_FIELD_IDS[0] ? materialHeading() : null}
        <PartnerProposalField
          field={field}
          value={answers[field.id] ?? ""}
          problem={stepProblems.find((problem) => problem.field === field.id)}
          onChange={(value) => setAnswer(field.id, value)}
          onBlur={(normalized) => handleBlur(field.id, normalized)}
          nudge={renderNudge(field)}
          note={renderNote(field)}
          last={index === fields.length - 1}
        />
      </Fragment>
    ));
  }

  /**
   * The one group heading this form has, and it is a conditional rather than a group system.
   *
   * Three quantity boxes landing after the story with nothing said would read as a form asking
   * for numbers. What they need is the frame — this is about how the Tuggi shows up in the
   * establishment, and blank is a legitimate answer for two of the three.
   *
   * A generic "field group" concept for a single group would be the layer for a case that does
   * not exist yet. When there is a second group, this grows into one; today it is one `if`.
   *
   * `<h3>`: the step title above it is the `<h2>` (#403), and this sits one level under it.
   */
  function materialHeading() {
    return (
      <div className="mb-4 mt-8 border-t border-tuggi-border pt-6">
        <h3 className="text-lg font-semibold text-tuggi-dark">{t("material.title")}</h3>
        <p className="mt-1 text-sm text-tuggi-slate">{t("material.help")}</p>
      </div>
    );
  }

  /**
   * What the CEP lookup has to say, and it only ever says one thing: four fields were filled.
   *
   * `role="status"`, never `alert`: filling four fields silently startles more than it helps,
   * and a failure says nothing at all — the fields are simply empty and the person types.
   */
  function renderNote(field: PartnerField) {
    if (field.id !== "postal_code" || !postalFilled) return null;
    return (
      <p role="status" className="mt-2 text-sm text-tuggi-slate">
        {t("states.postalCodeFilled")}
      </p>
    );
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

/** Which pair of copy keys a failure reads. `submit` keeps the names it shipped with. */
function failureCopyKey(failure: Exclude<Failure, null>): string {
  if (failure === "too_many") return "tooMany";
  if (failure === "unavailable") return "unavailable";
  return "submitError";
}

/**
 * Swaps the problems of `ids` for whatever the fresh validation says about them, leaving every
 * other message on the screen exactly as it was.
 *
 * Written as a function of two lists rather than as a `setState` body because both callers —
 * the blur and the keystroke that follows an error — need the same rule, and the rule is easy
 * to get subtly wrong in two places.
 */
function replaceProblemsOf(
  shown: FieldProblem[],
  ids: readonly PartnerFieldId[],
  fresh: FieldProblem[]
): FieldProblem[] {
  const kept = shown.filter((problem) => !ids.includes(problem.field));
  return [...kept, ...fresh.filter((problem) => ids.includes(problem.field))];
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
