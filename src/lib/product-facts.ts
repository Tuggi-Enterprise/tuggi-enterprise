import { LOCALES } from "@/i18n/locales";

/**
 * product-facts.ts — every number the site publishes about the product.
 *
 * ---------------------------------------------------------------------------
 * This module is the consumer, not the owner
 * ---------------------------------------------------------------------------
 *
 * A business number is born in `docs/business-rules/` and the code cites the
 * rule (CLAUDE.md §6). So each field below names the rule that backs it: that
 * citation is what makes the figure auditable without opening the database,
 * and it is the difference between a constant and a number somebody typed.
 *
 * What this module fixes is the second half of the same rule — one owner on
 * the consumer side. The language count used to live in sixteen message
 * strings, in `app-meta.ts` and in `/llms.txt`, and the copies had already
 * drifted apart: pt and es published one figure while en and it published
 * another, for the same sentence.
 *
 * ---------------------------------------------------------------------------
 * Three constraints it works under
 * ---------------------------------------------------------------------------
 *
 * 1. **Data, not copy.** No React, no translation, no formatting. The sentence
 *    stays in `src/messages/*.json` and interpolates the value (`DS-COPY-005`);
 *    this module only knows the number. Where the number is about languages,
 *    the sentence also has to say *which* catalogue it counts — see
 *    CONTENT_LANGUAGES.
 *
 * 2. **No second declaration.** Each figure is declared once, here, and the
 *    four locales interpolate it. `DECIDED_FACTS` is what keeps that true in
 *    both directions.
 *
 * 3. **No published figure comes off the generated snapshot.**
 *    `coverage-snapshot.json` is built to decide what the map draws, and its
 *    counts apply a 50-POI-per-region threshold that exists for rendering.
 *    Reading them as coverage is how the site came to publish 39 countries —
 *    BR-COMUNICACAO-002 item 9 and its "nenhum dos dois números de país sai
 *    mais do snapshot". The snapshot still feeds the map, the country list and
 *    the region count on the page; it no longer feeds a claim. What replaced
 *    it is a measurement against production with a date and a rule ID, and a
 *    floor big enough that the figure does not depend on when it was taken.
 *
 * ---------------------------------------------------------------------------
 * One value is still null, and that is a decision, not a gap
 * ---------------------------------------------------------------------------
 *
 * `STORIES_PLAYED` is null because the operator decided on 2026-08-07 that no
 * usage figure goes out — BR-COMUNICACAO-003 item 5. A null here is not a slot
 * waiting for a plausible number; it is an answer.
 *
 * DECIDED_FACTS carries the decisions as data so
 * `tests/e2e/product-facts.spec.ts` can hold both halves at once: while a value
 * is null no string may publish it, and while it is not null the copy has to
 * read it from here in all four languages or the suite goes red. That is the
 * mechanism a `TODO` does not have — the previous unbacked figure survived for
 * months next to one.
 */

// ── Language catalogues — BR-IDIOMA-001 ─────────────────────────────────────

/**
 * Content languages offered to the tourist — **BR-IDIOMA-001, item 2**.
 *
 * The pipeline produces twelve; Russian and Japanese are held back by an
 * operator decision of 2026-08-05, so ten reach the traveller. Counting ten
 * and reporting two missing reverts that decision instead of fixing anything.
 *
 * Copy that publishes this figure has to say it is the audio catalogue
 * (`DS-COPY-005`): "audio in N languages", never a bare "N languages" — the
 * bare form is what let a content figure be compared against an interface
 * figure and read as a contradiction, which is the confusion BR-IDIOMA-001
 * exists to close.
 *
 * The list behind the number is `Languages.langs` in `src/messages` — the
 * pills a visitor actually reads. The spec asserts the two agree in all four
 * locales: adding a pill has to move the sentence with it.
 */
export const CONTENT_LANGUAGES = 10;

/**
 * What the CMS produces — **BR-IDIOMA-001, item 1**. Never displayed.
 *
 * It is here so that nobody who finds twelve in the pipeline redeclares it and
 * reads it as a contradiction with the ten above. They count different things,
 * and they are not required to converge.
 */
export const CMS_CONTENT_LANGUAGES = 12;

/**
 * Interface locales of the site — **BR-IDIOMA-001, item 3** (four).
 *
 * Derived from the locale list rather than typed, so it cannot disagree with
 * the site that is actually built. Asymmetry with the app (five) and the CMS
 * (three) is the design, not a defect.
 */
export const SITE_INTERFACE_LANGUAGES = LOCALES.length;

// ── Operation — BR-COMUNICACAO-002 ──────────────────────────────────────────

/**
 * The year the operation started, as it may be published —
 * **BR-COMUNICACAO-002, item 6**.
 *
 * The first row of `auth.users` is 2025-07-01 and nothing earlier is
 * publishable under any reading; the purpose page used to sign its manifesto
 * with an earlier year and it was removed. A formulation more precise than the
 * year needs its anchor said out loud, because "operating since" and "serving
 * travellers since" are different dates: the first play by an external user is
 * 2026-01-08.
 *
 * `ProofBlock` is what publishes it — the third line of the proof block, and
 * the only claim on the site that is about time rather than about size.
 */
export const OPERATING_SINCE = 2025;

// ── Archive and coverage — BR-COMUNICACAO-002, items 8 and 9 ────────────────

/**
 * Whole millions of mapped points, floored — **BR-COMUNICACAO-002, item 8**.
 *
 * The floor is the million and not the thousand, and that is the decision, not
 * a rounding preference: the archive moves in both directions — 2,090,916 on
 * 2026-07-13 against 2,042,796 on 2026-08-06, both measured in production —
 * and a floor of thousands puts the published figure back at the mercy of how
 * old the last snapshot is. At the million, both readings publish the same
 * sentence.
 *
 * **This counts points on the map, not audio guides** — item 2. The two are
 * two orders of magnitude apart (2,042,796 against 16,910 produced guides), so
 * this value may only carry the nouns item 8 closes the list on: "ponto
 * mapeado", "ponto de interesse", "ponto no mapa". Never história, guia,
 * áudio, narração or roteiro — item 8 says this is the figure the mistake is
 * actually made on, and it was: the coverage page published two million
 * *histórias prontas para tocar*, and there are 16,910 of those.
 *
 * The copy spells the scale word out in the plural in four languages ("2
 * milhões", "2 million"), so a value below two needs the singular written
 * before this constant may move. The spec holds that.
 */
export const MAPPED_POINT_MILLIONS = 2;

/**
 * Sovereign countries with at least one published POI —
 * **BR-COMUNICACAO-002, item 9**, measured against `core.app_poi_read` in
 * production on 2026-08-06.
 *
 * A measurement, not a snapshot reading, and that distinction is the whole
 * defect this constant closes. `coverage-snapshot.json` counts the countries
 * that cleared `STATE_MIN_COUNT = 50` — a threshold that exists to decide what
 * the map draws — and the site published that number, 39, as coverage. Anyone
 * who reaches for `totalActiveCountries` republishes it without noticing,
 * which is why no accessor here reads it any more.
 *
 * The 58 territories are not this number: a dependent territory is not a
 * country (Guadeloupe, Martinique, Réunion, French Guiana, Mayotte, Gibraltar,
 * Jersey, Guernsey, Saint-Pierre-et-Miquelon and Greenland are the ten of
 * difference), and 58 may only be published under "destinos" or "territórios".
 * Neither figure may carry a content noun: 14 is the count of countries with
 * at least one audio guide produced, and it is the only one that can. "Guias
 * narrados em 48 países" is false; "presente em 48 países" is true.
 */
export const COVERAGE_COUNTRIES = 48;

/**
 * Country+state pairs with at least one approved POI, published as a floor —
 * **BR-COMUNICACAO-002, item 10**, measured against `core.attractions`
 * (`approved`, `entity_kind = 'poi'`, non-empty `state`) in production on
 * 2026-08-06: 927 (`docs/dev/medicao-constantes-site-2026-08.md` §2).
 *
 * **Always a floor, never exact — item 10's own exception to item 4.** Item 4
 * would allow an exact figure if the copy carried the measurement date; item
 * 10 forbids that escape for this number specifically, because the map on
 * the same page counts regions by a different rule right below this card,
 * and an exact figure here would read as directly comparable to what the map
 * draws. It is not: 927 is pre-threshold, the map is post-threshold.
 *
 * **The floor is the hundred, not the item-8 pattern of the million** — 900
 * is close enough to 927 to survive the count moving the way the archive
 * moves, without inventing a rounding rule new to this constant.
 *
 * **This counts presence, not content.** The label may only name a presence
 * noun — "região coberta", "região com ponto mapeado" — never a content noun.
 * 79 is the count of regions with at least one produced audio guide (item 3),
 * and it is the only region figure that may carry a content noun.
 *
 * **Not in `DECIDED_FACTS`.** Items 8 and 9 are there because a sentence
 * elsewhere on the site interpolates them (`SEO_COVERAGE.description`,
 * `Coverage.Hero.subtitle`); nothing does that for this figure; it only
 * reaches the stat card and the Open Graph chip, both markup, not
 * ICU-interpolated copy. `tests/e2e/product-facts.spec.ts` guards those two
 * surfaces directly instead — the mechanism `DECIDED_FACTS` runs would only
 * fail here with nothing to fix.
 */
export const COVERAGE_REGIONS_FLOOR = 900;

/**
 * Audio guides produced, published as a floor — **BR-COMUNICACAO-002, item 2**,
 * measured at **16,910** in production on 2026-08-06
 * (`docs/dev/medicao-constantes-site-2026-08.md`).
 *
 * **This is the content figure, and it is two orders of magnitude below the
 * archive** — 16,910 guides against 2,042,796 mapped points, 0.83%. Item 2
 * exists because the two get mixed: the archive number may never carry a
 * content noun, and this one is the only one that may. So "2 milhões de
 * histórias" is false and "16 mil áudio-guias" is true, and no sentence gets
 * to borrow the bigger figure for the better noun.
 *
 * **The floor is the thousand**, not the million of item 8, and the reason is
 * the direction of travel rather than a rounding preference: the archive moves
 * both ways (it shrank 48,120 rows in 24 days), while produced guides only
 * accumulate — the pipeline does not un-produce a guide. A thousand-floor here
 * does not depend on how fresh the last measurement is.
 *
 * **What it may not be paired with.** Item 3: 48 countries and 900 regions are
 * *presence*, and a content noun next to either of them claims narration where
 * there is none — France, Canada and Ireland are 27% of the map with zero
 * guides. The country figure that may carry a content noun is 14, and the
 * region figure is 79; neither is published today. What this figure is paired
 * with in the copy is the language catalogue (BR-IDIOMA-001 item 2), which is
 * a fact about the guides themselves.
 */
export const AUDIO_GUIDES_FLOOR = 16_000;

// ── Accessibility measurement — BR-COMUNICACAO-006 ──────────────────────────

/**
 * The date the site's palette was measured against the WCAG 2.1 Level AA
 * contrast minimum — **BR-COMUNICACAO-006, items 4 and 5**.
 *
 * The audit is `docs/design/acessibilidade-auditoria-2026-08.md`; the palette
 * fix landed with issue #183 and the leva `12c1644`, and the re-measurement
 * that this date names is 2026-08-06.
 *
 * **It is here because a claim of fact carries its date, and a date typed into
 * a sentence goes stale in one language at a time.** Item 5 gives the claim
 * three ways to die, and two of them are ours to notice:
 *
 *   (a) **2027-02-06** — six months from the measurement. Same clock
 *       BR-COMUNICACAO-003 item 6(a)(iv) puts on the download figure, for the
 *       same reason: it does not refresh itself.
 *   (c) **Whenever the `@theme` block of `globals.css` changes**, because that
 *       block is the thing that was measured. A token moves, the claim is
 *       vencida the same day, and what replaces it is a new measurement or the
 *       commitment of item 1 — never this date with a new number next to it.
 *
 * **ISO, and deliberately not `{…, date, long}`.** Formatting it would need a
 * `timeZone` in `src/i18n/request.ts` — there is none today, so next-intl
 * falls back to the process timezone and server and client can render
 * different days — and a `Date` in `DecidedFact.value`, which is
 * `number | string | null`. The format is the `design`'s call, not a shortcut.
 *
 * **Scope, and it is the point of item 2.** This date covers the *site*. It
 * says nothing about the app, whose primary CTA still measures 2.70:1 with
 * #145 open, nor about the CMS, nor about a B2B module. A claim of fact
 * without a subject is the widest claim there is, which is what
 * `Legal.Accessibility.s1Item1` used to make in four languages.
 */
export const A11Y_SITE_AUDIT_DATE = "2026-08-06";

/**
 * Hours to a decided outcome on the partner venue triage — **BR-B2B-010 item 4**.
 *
 * Calendar hours, counted from the approval of the *partnership* (the
 * `partner.clients.status` transition to 'approved'), not from the partner's
 * registration. Weekends and holidays do not stop the clock: the operator
 * published the deadline and chose to state it in hours.
 *
 * What is promised is the **outcome**, not the entry — item 3 admits a refusal,
 * so copy reading "the venue goes live in 72 hours" is the defect this
 * constant does not fix by itself.
 *
 * No measured series backs it: nobody instruments the queue today, and the
 * rule says so. The value is the operator's decision, not a measurement.
 */
export const PARTNER_TRIAGE_HOURS = 72;

// ── Decided not to be published ─────────────────────────────────────────────

/**
 * Plays a traveller has listened to — **BR-COMUNICACAO-003, items 5 and 6**.
 *
 * `null`, and it stays null. A five-figure count was published in four
 * languages with nothing behind it; the measurement of 2026-08-06 found three
 * orders of magnitude less, most of it the team's own accounts. The operator
 * closed the question on 2026-08-07 — *"esse é um numero de venda e nao
 * real"* — so this is a decided null, not a pending one.
 *
 * Item 4 closes the obvious escape: no rounding repairs a figure that has no
 * source, so a smaller invented number is not an answer either. The only two
 * usage figures that can ever be published are in item 6, they come from the
 * store consoles, and **no agent measures or estimates them** — the operator
 * brings the number or there is no number.
 */
export const STORIES_PLAYED: number | null = null;

/** A product fact the operator decided on, and the copy that has to follow it. */
export interface DecidedFact {
  /** The exported binding, for the failure message. */
  name: string;
  /** `null` means the decision was *not to publish it* — that is not a gap. */
  value: number | string | null;
  /** The ICU placeholder the copy uses to read it from here. */
  placeholder: string;
  /** The rule that owns the decision. */
  rule: string;
}

/**
 * The decisions, as data.
 *
 * Read by `tests/e2e/product-facts.spec.ts`, which enforces both directions:
 * while `value` is null the placeholder may not appear in any message file,
 * and while it is not null every locale has to interpolate it — so a figure
 * that stops being published in one language, or a decision that never reaches
 * the copy, fails the suite instead of passing quietly.
 */
export const DECIDED_FACTS: readonly DecidedFact[] = [
  {
    name: "MAPPED_POINT_MILLIONS",
    value: MAPPED_POINT_MILLIONS,
    placeholder: "mappedPointMillions",
    rule: "BR-COMUNICACAO-002 item 8",
  },
  {
    name: "COVERAGE_COUNTRIES",
    value: COVERAGE_COUNTRIES,
    placeholder: "coverageCountries",
    rule: "BR-COMUNICACAO-002 item 9",
  },
  {
    name: "AUDIO_GUIDES_FLOOR",
    value: AUDIO_GUIDES_FLOOR,
    placeholder: "audioGuidesFloor",
    rule: "BR-COMUNICACAO-002 item 2",
  },
  {
    name: "OPERATING_SINCE",
    value: OPERATING_SINCE,
    placeholder: "operatingSince",
    rule: "BR-COMUNICACAO-002 item 6",
  },
  {
    name: "A11Y_SITE_AUDIT_DATE",
    value: A11Y_SITE_AUDIT_DATE,
    placeholder: "a11ySiteAuditDate",
    rule: "BR-COMUNICACAO-006 itens 4 e 5",
  },
  {
    name: "STORIES_PLAYED",
    value: STORIES_PLAYED,
    placeholder: "storiesPlayed",
    rule: "BR-COMUNICACAO-003 item 5",
  },
];

/**
 * The values every message string may interpolate.
 *
 * next-intl 4.12 has no global default values — `defaultTranslationValues` was
 * removed in v4 and there is no replacement in `IntlConfig` — so the values
 * are passed at the call site. Passing the whole object is deliberate: ICU
 * ignores values a message does not use, so a component that renders several
 * keys hands it over once instead of matching values to keys by hand.
 *
 * A fact decided *not* to be published stays out: it would render as an empty
 * slot instead of failing, and the spec keeps the two lists from disagreeing.
 */
export const PRODUCT_FACTS = {
  contentLanguages: CONTENT_LANGUAGES,
  cmsContentLanguages: CMS_CONTENT_LANGUAGES,
  siteInterfaceLanguages: SITE_INTERFACE_LANGUAGES,
  operatingSince: OPERATING_SINCE,
  mappedPointMillions: MAPPED_POINT_MILLIONS,
  coverageCountries: COVERAGE_COUNTRIES,
  audioGuidesFloor: AUDIO_GUIDES_FLOOR,
  a11ySiteAuditDate: A11Y_SITE_AUDIT_DATE,
  partnerTriageHours: PARTNER_TRIAGE_HOURS,
} as const;
