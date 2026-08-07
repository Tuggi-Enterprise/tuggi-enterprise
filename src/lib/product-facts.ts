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
 * 2. **No second declaration.** Country and point counts already have an
 *    owner — the generated `src/data/coverage-snapshot.json`, read by
 *    `lib/coverage.ts`. The accessors here re-export it. Copying the figure
 *    would create the fourth place where coverage can disagree with itself.
 *
 * 3. **A snapshot number never travels without its age.** `activeCountries()`
 *    and `activePoints()` return the generation date alongside the value,
 *    because the figure that was on the site before this module came out of a
 *    snapshot frozen weeks earlier and nobody could tell by looking. The
 *    archive lost 48,120 rows in the 24 days that snapshot sat there.
 *
 * ---------------------------------------------------------------------------
 * Values that are still nulls, and why that is the point
 * ---------------------------------------------------------------------------
 *
 * Three fields are `null` on purpose: which figure goes into the headline copy
 * is a promise, and promises belong to the operator (`_perguntas-abertas.md`
 * 70, 71 and 72). A `null` here is not a gap to fill with a plausible number —
 * it is a decision that has not happened.
 *
 * PENDING_FACTS carries them as data so `tests/e2e/product-facts.spec.ts` can
 * hold both halves at once: while the value is null no string may publish that
 * figure, and the moment the value stops being null the copy has to read it
 * from here or the suite goes red. That is the mechanism a `TODO` does not
 * have — the previous unbacked figure survived for months next to one.
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
 * No peça publishes it today. The field exists so that the first one to do it
 * reads the year from here instead of picking one.
 */
export const OPERATING_SINCE = 2025;

// ── Coverage and archive, off the generated snapshot ────────────────────────

/** A figure read off a generated snapshot, carried with the date it was made. */
export interface SnapshotFact {
  value: number;
  /** ISO 8601 — when the snapshot behind `value` was generated. */
  measuredAt: string;
}

/**
 * A published count is a floor, rounded down — **BR-COMUNICACAO-002, item 4**.
 * An exact figure with no date on it ages in silence, and this one moves in
 * both directions.
 */
const POINT_ROUNDING = 1000;

/**
 * The snapshot is loaded on demand, and this is not a style choice.
 *
 * `coverage-snapshot.json` is ~120 KB of generated data, and half the files
 * that read this module are client components (the hero trust line, the plans
 * table). A static import here would put the snapshot on the critical path of
 * pages that only ever wanted a language count — Core Web Vitals are a
 * requirement of this surface, not a later optimization. Both accessors are
 * server-side and already async, so the cost of the lazy import is nothing.
 */
async function coverage() {
  const { getCoverageData } = await import("./coverage");
  return getCoverageData();
}

/**
 * Countries the product is live in, as the snapshot counts them, with the date
 * the snapshot was generated.
 *
 * **The criterion behind this number is not settled** — `_perguntas-abertas.md`
 * 71. The snapshot applies a 50-POI-per-region threshold that exists to decide
 * what the map renders, and reading it as a coverage criterion is what produced
 * the figure the site publishes. BR-COMUNICACAO-002, item 3 already binds the
 * copy whatever the answer is: a presence count may not carry the words
 * "narrated guide".
 */
export async function activeCountries(): Promise<SnapshotFact> {
  const data = await coverage();
  return { value: data.totalActiveCountries, measuredAt: data.generatedAt };
}

/**
 * Mapped points, rounded down for publication, with the date behind them.
 *
 * **This counts points on the map, not audio guides** — BR-COMUNICACAO-002,
 * item 2. The two are two orders of magnitude apart, so this value may never
 * be published next to a content noun: story, guide, audio, narration. Which
 * of the two figures goes into the headline is `_perguntas-abertas.md` 70.
 */
export async function activePoints(): Promise<SnapshotFact> {
  const data = await coverage();
  return {
    value: Math.floor(data.totalActiveRaw / POINT_ROUNDING) * POINT_ROUNDING,
    measuredAt: data.generatedAt,
  };
}

// ── Waiting on the operator ─────────────────────────────────────────────────

/**
 * Plays a traveller has listened to — **BR-COMUNICACAO-003**.
 *
 * `null`, and item 5 says it stays that way until `_perguntas-abertas.md` 72
 * closes. A five-figure count was published in four languages with nothing
 * behind it; the measurement of 2026-08-06 found three orders of magnitude
 * less, most of it the team's own accounts. Item 4 closes the obvious escape:
 * no rounding repairs a figure that has no source, so a smaller invented
 * number is not an answer either.
 */
export const STORIES_PLAYED: number | null = null;

/**
 * The official wording of what the coverage figure covers —
 * `_perguntas-abertas.md` 71.
 *
 * Sovereign countries, distinct territories, the threshold already published,
 * or countries with a narrated guide: four true readings of the same database,
 * three and a half times apart. Choosing between them is a promise, not a
 * form, so it is not `design`'s and it is not `dev`'s.
 */
export const COVERAGE_STATEMENT: string | null = null;

/**
 * The official wording of the archive figure — `_perguntas-abertas.md` 70.
 *
 * Not in the design spec's field map, which names only the coverage one. It is
 * here because question 70 decides a statement of exactly the same shape over
 * a different fact — mapped points against produced audio guides — and without
 * a field of its own that decision has nowhere to land, which is how the last
 * one was forgotten.
 */
export const ARCHIVE_STATEMENT: string | null = null;

/** A product fact whose value is a promise the operator has not made yet. */
export interface PendingFact {
  /** The exported binding, for the failure message. */
  name: string;
  /** Null until the question below closes. */
  value: number | string | null;
  /** The ICU placeholder the copy must use once a value exists. */
  placeholder: string;
  /** Entry in docs/business-rules/_perguntas-abertas.md that decides it. */
  question: number;
  /** The rule that already binds the copy, whatever the answer turns out to be. */
  rule: string;
}

/**
 * The open decisions, as data.
 *
 * Read by `tests/e2e/product-facts.spec.ts`, which enforces both directions:
 * while `value` is null the placeholder may not appear in any message file,
 * and the moment it is not null the placeholder has to appear — so answering
 * the question without wiring the copy fails the suite instead of passing
 * quietly.
 */
export const PENDING_FACTS: readonly PendingFact[] = [
  {
    name: "ARCHIVE_STATEMENT",
    value: ARCHIVE_STATEMENT,
    placeholder: "archiveStatement",
    question: 70,
    rule: "BR-COMUNICACAO-002 item 2",
  },
  {
    name: "COVERAGE_STATEMENT",
    value: COVERAGE_STATEMENT,
    placeholder: "coverageStatement",
    question: 71,
    rule: "BR-COMUNICACAO-002 item 3",
  },
  {
    name: "STORIES_PLAYED",
    value: STORIES_PLAYED,
    placeholder: "storiesPlayed",
    question: 72,
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
 * Only facts with a decided value belong here. A pending one stays out: an
 * unresolved placeholder is a visible defect, which is what we want, and the
 * spec keeps the two lists from disagreeing.
 */
export const PRODUCT_FACTS = {
  contentLanguages: CONTENT_LANGUAGES,
  cmsContentLanguages: CMS_CONTENT_LANGUAGES,
  siteInterfaceLanguages: SITE_INTERFACE_LANGUAGES,
  operatingSince: OPERATING_SINCE,
} as const;
