"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, AlertCircle } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import { Link } from "@/i18n/routing";
import { LEAD_BUSINESS_TYPES, type LeadBusinessType } from "@/lib/business-types";
import { toE164 } from "@/lib/phone";
import { LEAD_FORM_ID, PARTNER_LEAD_TYPE } from "@/lib/lead-form";

/**
 * The partnership lead form — §3 of
 * `docs/design/spec-lp-parcerias-2026-08.md` (card #294).
 *
 * Five questions and the page's only destination. It writes to
 * `POST /api/leads` and to `campaign.inbound_leads`; **there is no second lead
 * endpoint**, and the two new columns it fills (`phone_e164`, `business_type`)
 * came with the migration of #295.
 *
 * ---------------------------------------------------------------------------
 * What it deliberately does not inherit from `ContactRouter`
 * ---------------------------------------------------------------------------
 *
 * That component is a triage of three tracks (B2G, B2B, B2C) and none of the
 * three is this visitor. Four of its habits are actively wrong here:
 *
 *  1. **No freemail block.** `ContactRouter.tsx:33-39` rejects gmail, hotmail
 *     and outlook. The owner of a restaurant uses gmail, and #294 took that
 *     block out of this funnel — `Partners.form.emailHint` is the copy that
 *     makes him sure of it. The block stays where it was: `/contact` talks to
 *     city halls and fleets.
 *  2. **The submit button is never disabled.** A disabled button takes no
 *     focus and explains nothing; the click is what validates, and an invalid
 *     click moves focus to the first bad field with a summary in `role="alert"`
 *     (spec §3.6).
 *  3. **No `alert()`.** The two in `ContactRouter.tsx:74` and `:78` are English
 *     text outside i18n, unstyled and unannounced.
 *  4. **One column, always** — including on the desktop. Two columns raise the
 *     error rate and make focus jump sideways.
 *
 * **Contrast is measured, not chosen** (spec §3.7): the error is `#b91c1c`
 * (6.47:1 on white), the resting border of a control is `#64748b` (4.76:1) and
 * not `border-slate-200`, which measures 1.23:1 — with a `#f8fafc` fill inside
 * a white card the border is the **only** thing that identifies the control, and
 * SC 1.4.11 asks 3:1 of it.
 *
 * **The channel is a `radiogroup` of native radios, not a field that guesses.**
 * SC 1.3.5 *Identify Input Purpose* (AA) requires the field to declare its
 * purpose, and `autocomplete` is `tel` **or** `email` — never both. Switching
 * channel keeps what was already typed in the other one.
 */

type Channel = "whatsapp" | "email";
type FieldName = "name" | "business" | "businessType" | "contact" | "consent";
type Status = "idle" | "sending" | "success";

/** DOM order, which is the order focus goes looking for the first bad field. */
const FIELD_ORDER: FieldName[] = ["name", "business", "businessType", "contact", "consent"];

const CONTROL_CLASS =
  "w-full min-h-[48px] rounded-xl bg-slate-50 px-4 py-3 text-base text-tuggi-dark " +
  "border focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text";

/** `#b91c1c` on error, `#64748b` at rest — both measured, see the header. */
function borderClass(invalid: boolean): string {
  return invalid ? "border-[#b91c1c]" : "border-[#64748b]";
}

type PartnerLeadFormProps = {
  /** `Segments.cta.title` — the two sentences already written to ask for this. */
  title: string;
  /** `Segments.cta.body`. */
  body: string;
};

export function PartnerLeadForm({ title, body }: PartnerLeadFormProps) {
  const t = useTranslations("Partners.form");
  const tRoot = useTranslations();
  const locale = useLocale();

  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [businessType, setBusinessType] = useState<LeadBusinessType | "">("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  // Two values, one visible field: whoever typed an email, went to look at the
  // WhatsApp option and came back finds the email still there (spec §3.4).
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const started = useRef(false);
  const successRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const businessRef = useRef<HTMLInputElement>(null);
  const businessTypeRef = useRef<HTMLSelectElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  /** Called from event handlers only — never during render (react-hooks/refs). */
  function focusField(field: FieldName) {
    const element = {
      name: nameRef,
      business: businessRef,
      businessType: businessTypeRef,
      contact: contactRef,
      consent: consentRef,
    }[field].current;
    element?.focus();
  }

  /**
   * Pre-selection from the grid: a card is `<a href="#lead-form"
   * data-business-type="…">`, so the anchor already works without JavaScript
   * and this only fills the field in. Delegated on the document because the
   * cards are server-rendered markup that this component does not own.
   */
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const card = target?.closest?.("[data-business-type]");
      const key = card?.getAttribute("data-business-type");
      if (!key) return;
      if (!(LEAD_BUSINESS_TYPES as readonly string[]).includes(key)) return;
      setBusinessType(key as LeadBusinessType);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /** SC 4.1.3 plus: the confirmation is announced *and* it is where focus is. */
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  function markStarted() {
    if (started.current) return;
    started.current = true;
    // Half of "why does it not convert" — abandonment inside the form stops
    // being a guess once this is counted next to the leads (spec §3.10).
    sendGAEvent({ event: "partner_form_start" });
  }

  /**
   * The values as of *this* render. Every validation takes a snapshot rather
   * than reading the state variables: inside an `onChange` the state has not
   * updated yet, and validating the old value clears an error one keystroke
   * late — which is exactly the field that looks broken.
   */
  const values = { name, business, businessType, channel, whatsapp, email, consent };
  type Values = typeof values;

  function validate(snapshot: Values): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    if (!snapshot.name.trim()) found.name = t("errorName");
    if (!snapshot.business.trim()) found.business = t("errorBusiness");
    if (!snapshot.businessType) found.businessType = t("errorBusinessType");

    if (snapshot.channel === "whatsapp") {
      if (!toE164(snapshot.whatsapp)) found.contact = t("errorWhatsapp");
    } else {
      // The browser's own `type="email"` plus one check for @ and a dotted
      // domain. No domain list — freemail is welcome here.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(snapshot.email.trim())) {
        found.contact = t("errorEmail");
      }
    }

    if (!snapshot.consent) found.consent = t("errorConsent");
    return found;
  }

  /**
   * Validation happens on `blur`, never on every keystroke: marking as wrong
   * everything that has not finished being typed is how a form fights the
   * person filling it in. Once a field **has** failed, it revalidates on every
   * keystroke, so the message goes away the moment it is fixed (spec §3.7).
   */
  function revalidate(field: FieldName, snapshot: Values) {
    if (!errors[field]) return;
    const found = validate(snapshot);
    setErrors((previous) => ({ ...previous, [field]: found[field] }));
  }

  function validateOnBlur(field: FieldName) {
    const found = validate(values);
    setErrors((previous) => ({ ...previous, [field]: found[field] }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;

    setSendFailed(false);
    const found = validate(values);
    setErrors(found);

    const firstBad = FIELD_ORDER.find((field) => found[field]);
    if (firstBad) {
      setShowSummary(true);
      focusField(firstBad);
      return;
    }
    setShowSummary(false);

    setStatus("sending");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_type: PARTNER_LEAD_TYPE,
          full_name: name.trim(),
          company: business.trim(),
          business_type: businessType,
          // Exactly one of the two, which is the shape the CHECK
          // `inbound_leads_contato_minimo` asks for.
          ...(channel === "whatsapp"
            ? { phone_e164: toE164(whatsapp) }
            : { email: email.trim() }),
          locale,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        // The one 400 the visitor can act on: the server refused the number
        // the client thought it had normalized.
        if (payload?.error === "invalid_phone") {
          setStatus("idle");
          setErrors((previous) => ({ ...previous, contact: t("errorWhatsapp") }));
          setShowSummary(true);
          focusField("contact");
          return;
        }
        throw new Error(payload?.error ?? String(response.status));
      }

      sendGAEvent({
        event: "generate_lead",
        lead_type: PARTNER_LEAD_TYPE,
        business_type: businessType,
        channel,
      });
      setStatus("success");
    } catch (error) {
      console.error("Partner lead submit failed", error);
      setStatus("idle");
      // Nothing is cleared: the copy promises that what was typed is still here.
      setSendFailed(true);
    }
  }

  const sending = status === "sending";
  const contactInvalid = Boolean(errors.contact);

  return (
    <section
      id={LEAD_FORM_ID}
      data-block="partner-lead-form"
      className="bg-tuggi-bg py-20 lg:py-24 scroll-mt-28"
    >
      <div className="page-shell">
        <div className="max-w-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-lg text-tuggi-slate leading-relaxed">{body}</p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {status === "success" ? (
              <div role="status" className="flex flex-col gap-3">
                <h3
                  ref={successRef}
                  tabIndex={-1}
                  className="text-2xl font-bold text-tuggi-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm"
                >
                  {t("successTitle")}
                </h3>
                <p className="text-base text-tuggi-slate leading-relaxed">{t("successBody")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate inert={sending || undefined}>
                <p className="text-sm text-tuggi-slate">{t("allRequired")}</p>

                {showSummary && Object.values(errors).some(Boolean) ? (
                  <p
                    role="alert"
                    className="mt-4 flex items-start gap-2 text-base font-medium text-[#b91c1c]"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    {t("errorSummary")}
                  </p>
                ) : null}

                {sendFailed ? (
                  <p
                    role="alert"
                    className="mt-4 flex items-start gap-2 text-base font-medium text-[#b91c1c]"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    {t("errorSend")}
                  </p>
                ) : null}

                {/* 1 — name */}
                <div className="mt-6 flex flex-col gap-2">
                  <label htmlFor="lead-name" className="text-sm font-semibold text-tuggi-dark">
                    {t("name")}
                  </label>
                  <input
                    id="lead-name"
                    ref={nameRef}
                    type="text"
                    value={name}
                    autoComplete="name"
                    enterKeyHint="next"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? "lead-name-error" : undefined}
                    onFocus={markStarted}
                    onChange={(event) => {
                      setName(event.target.value);
                      revalidate("name", { ...values, name: event.target.value });
                    }}
                    onBlur={() => validateOnBlur("name")}
                    className={`${CONTROL_CLASS} ${borderClass(Boolean(errors.name))}`}
                  />
                  {errors.name ? (
                    <FieldError id="lead-name-error" message={errors.name} />
                  ) : null}
                </div>

                {/* 2 — business */}
                <div className="mt-6 flex flex-col gap-2">
                  <label htmlFor="lead-business" className="text-sm font-semibold text-tuggi-dark">
                    {t("business")}
                  </label>
                  <input
                    id="lead-business"
                    ref={businessRef}
                    type="text"
                    value={business}
                    autoComplete="organization"
                    enterKeyHint="next"
                    aria-invalid={errors.business ? true : undefined}
                    aria-describedby={errors.business ? "lead-business-error" : undefined}
                    onFocus={markStarted}
                    onChange={(event) => {
                      setBusiness(event.target.value);
                      revalidate("business", { ...values, business: event.target.value });
                    }}
                    onBlur={() => validateOnBlur("business")}
                    className={`${CONTROL_CLASS} ${borderClass(Boolean(errors.business))}`}
                  />
                  {errors.business ? (
                    <FieldError id="lead-business-error" message={errors.business} />
                  ) : null}
                </div>

                {/* 3 — type of business, a native select: it opens the system
                    picker on a phone, works with a keyboard and a screen reader
                    and costs no JavaScript (spec §3.3). */}
                <div className="mt-6 flex flex-col gap-2">
                  <label
                    htmlFor="lead-business-type"
                    className="text-sm font-semibold text-tuggi-dark"
                  >
                    {t("businessType")}
                  </label>
                  <select
                    id="lead-business-type"
                    ref={businessTypeRef}
                    value={businessType}
                    aria-invalid={errors.businessType ? true : undefined}
                    aria-describedby={errors.businessType ? "lead-business-type-error" : undefined}
                    onFocus={markStarted}
                    onChange={(event) => {
                      const chosen = event.target.value as LeadBusinessType;
                      setBusinessType(chosen);
                      revalidate("businessType", { ...values, businessType: chosen });
                    }}
                    onBlur={() => validateOnBlur("businessType")}
                    className={`${CONTROL_CLASS} ${borderClass(Boolean(errors.businessType))}`}
                  >
                    <option value="" disabled>
                      {t("businessTypePlaceholder")}
                    </option>
                    {LEAD_BUSINESS_TYPES.map((key) => (
                      <option key={key} value={key}>
                        {/* The label of the card the visitor just clicked, not a
                            second wording of it — one list, one owner. */}
                        {key === "other"
                          ? t("businessTypeOther")
                          : tRoot(`Segments.${key}.hub.cardTitle`)}
                      </option>
                    ))}
                  </select>
                  {errors.businessType ? (
                    <FieldError id="lead-business-type-error" message={errors.businessType} />
                  ) : null}
                </div>

                {/* 4 — channel and the single contact field */}
                <fieldset className="mt-6 border-0 p-0 m-0">
                  <legend className="text-sm font-semibold text-tuggi-dark">
                    {t("channelLegend")}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {(["whatsapp", "email"] as const).map((option) => (
                      <label
                        key={option}
                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#64748b] bg-slate-50 px-4 py-2 text-base text-tuggi-dark has-[:checked]:border-tuggi-primary-text has-[:checked]:bg-white"
                      >
                        <input
                          type="radio"
                          name="lead-channel"
                          value={option}
                          checked={channel === option}
                          onFocus={markStarted}
                          onChange={() => {
                            setChannel(option);
                            setErrors((previous) => ({ ...previous, contact: undefined }));
                          }}
                          className="h-5 w-5 accent-tuggi-primary-text focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text"
                        />
                        {option === "whatsapp" ? t("channelWhatsapp") : t("channelEmail")}
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor="lead-contact" className="text-sm font-semibold text-tuggi-dark">
                      {channel === "whatsapp" ? t("whatsappLabel") : t("emailLabel")}
                    </label>
                    <input
                      // Keyed by channel so the browser rebuilds the control
                      // instead of carrying `type="tel"` autofill into an email
                      // field.
                      key={channel}
                      id="lead-contact"
                      ref={contactRef}
                      type={channel === "whatsapp" ? "tel" : "email"}
                      inputMode={channel === "whatsapp" ? "tel" : "email"}
                      autoComplete={channel === "whatsapp" ? "tel" : "email"}
                      enterKeyHint="send"
                      value={channel === "whatsapp" ? whatsapp : email}
                      aria-invalid={contactInvalid ? true : undefined}
                      aria-describedby={`lead-contact-hint${contactInvalid ? " lead-contact-error" : ""}`}
                      onFocus={markStarted}
                      onChange={(event) => {
                        const typed = event.target.value;
                        if (channel === "whatsapp") setWhatsapp(typed);
                        else setEmail(typed);
                        revalidate("contact", {
                          ...values,
                          ...(channel === "whatsapp" ? { whatsapp: typed } : { email: typed }),
                        });
                      }}
                      onBlur={() => validateOnBlur("contact")}
                      className={`${CONTROL_CLASS} ${borderClass(contactInvalid)}`}
                    />
                    {/* A hint is an example, never a placeholder: the placeholder
                        disappears on the first keystroke and takes the question
                        with it (SC 3.3.2). */}
                    <p id="lead-contact-hint" className="text-sm text-tuggi-slate">
                      {channel === "whatsapp" ? t("whatsappHint") : t("emailHint")}
                    </p>
                    {errors.contact ? (
                      <FieldError id="lead-contact-error" message={errors.contact} />
                    ) : null}
                  </div>
                </fieldset>

                {/* 5 — consent, never pre-ticked: LGPD art. 8 and Planet49
                    (CJEU, C-673/17). */}
                <div className="mt-6 flex flex-col gap-2">
                  <label
                    htmlFor="lead-consent"
                    className="flex min-h-[44px] items-start gap-3 text-base text-tuggi-dark leading-relaxed"
                  >
                    <input
                      id="lead-consent"
                      ref={consentRef}
                      type="checkbox"
                      checked={consent}
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={errors.consent ? "lead-consent-error" : undefined}
                      onFocus={markStarted}
                      onChange={(event) => {
                        setConsent(event.target.checked);
                        revalidate("consent", { ...values, consent: event.target.checked });
                      }}
                      onBlur={() => validateOnBlur("consent")}
                      className="mt-1 h-5 w-5 shrink-0 accent-tuggi-primary-text focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text"
                    />
                    <span>
                      {t.rich("consent", {
                        policy: (chunks) => (
                          <Link
                            href="/trust-center/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-tuggi-primary-text underline underline-offset-2"
                          >
                            {chunks}
                            {/* The separator belongs to the hidden half, not to
                                the link's own text. As a sibling of both it was
                                underlined, and it pushed the sentence's full
                                stop away from the last glyph in all four
                                locales — "Leggi l'Informativa sulla Privacy ."
                                Deleting it outright is not the fix either:
                                accname 1.2 step 2F.ii.c says only "append the
                                result to the accumulated text", and the note of
                                18 January 2024 records that whether engines
                                join those strings with a space is still open at
                                the ARIA WG. Chromium inserts one; nothing
                                promises that VoiceOver's engine does. So the
                                space is in the DOM, where every engine reads
                                it, and inside the span, where nothing paints
                                it. */}
                            <span className="sr-only">{` ${t("consentLinkNewTab")}`}</span>
                          </Link>
                        ),
                      })}
                    </span>
                  </label>
                  {errors.consent ? (
                    <FieldError id="lead-consent-error" message={errors.consent} />
                  ) : null}
                </div>

                <button
                  type="submit"
                  aria-busy={sending || undefined}
                  className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-tuggi-secondary px-8 py-4 text-base font-semibold text-tuggi-dark shadow-sm transition-colors hover:bg-tuggi-secondary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 sm:w-auto"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : null}
                  {sending ? t("sending") : tRoot("Segments.cta.action")}
                </button>

                <noscript>
                  <p className="mt-6 text-base text-tuggi-slate">
                    {t("noscript", { email: tRoot("Contact.Sidebar.pressValue") })}
                  </p>
                </noscript>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The message under a field. Text is the second channel, never colour alone
 * (`DS-A11Y-003`, SC 1.4.1); the icon is decorative and the text carries it.
 */
function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="flex items-start gap-2 text-sm font-medium text-[#b91c1c]">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      {message}
    </p>
  );
}
