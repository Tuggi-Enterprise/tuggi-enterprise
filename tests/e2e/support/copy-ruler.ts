/**
 * `DS-COPY-013`, as two functions — the aside count and the breath.
 *
 * They were written inside `partner-offer-ladder.spec.ts` for the six FAQ answers of #306, and
 * they moved here on 2026-08-19 when the scope grew past that block: #319 widened them to
 * `Partners.*` and `Segments.*`, and the pass on the partnership proposal widened them again to
 * `PartnerProposal.*`. Three spec files counting asides three times is the second implementation
 * of one decision, which is the defect the rule itself is about.
 *
 * WHAT THE TWO NUMBERS DEFEND IS ONE THING: text nobody punctuated reads as written by a
 * machine, and the reader distrusts the promise before disagreeing with it. The dash is not the
 * defect — its FREQUENCY is, because it stands in for the comma, the full stop and the bracket
 * without the writer noticing.
 *
 * WHAT NEITHER OF THEM DECIDES is whether an aside is an aside. That test is removal: take the
 * fenced stretch out and the sentence has to stand and stay true. A dash standing in for a full
 * stop passes the count and fails review, and review is the `design`'s.
 *
 * Origin of the numbers, and they are measurement rather than taste: the operator's direction of
 * 2026-08-13 (#306), calibrated over the published copy in both directions.
 */

/** Periods, with their closing punctuation kept — a dash pair lives inside one. */
function periods(value: string): string[] {
  return value.split(/(?<=[.!?])\s+/);
}

const DASH = /[—–]/;
const DASHES = /[—–]/g;
const SIBLING_MARKS = /[;:(]/g;

/** Whether this value reaches for a dash at all — the frequency clause of criterion 32. */
export function hasDash(value: string): boolean {
  return DASH.test(value);
}

/**
 * Criterion 32: asides in one value. A pair of dashes inside the same period is one aside, not
 * two; an odd dash still counts as one. The sibling marks count one for one, because none of
 * them comes in pairs.
 *
 * `;`, `:` AND `(` COUNT WITH THE DASH, and this is the half that is easy to get wrong. A guard
 * matching only `[—–]` failed pt, en and it — five of six answers in each — and passed GREEN in
 * Spanish, which was translating the very same asides with a colon and a semicolon. Banning one
 * mark pushes the defect onto the next one.
 */
export function asideMarks(value: string): number {
  return periods(value).reduce((total, period) => {
    const dashes = (period.match(DASHES) ?? []).length;
    return total + ((dashes + 1) >> 1) + (period.match(SIBLING_MARKS) ?? []).length;
  }, 0);
}

/**
 * Criterion 33: the longest stretch a reader crosses without a pause. An ICU slot is worth ten
 * characters — the reader meets the value, not the name.
 *
 * MEASURED IN CHARACTERS AND NOT IN WORDS, by measurement. The same defective sentence was 21
 * words in pt, 18 in en, 23 in es and 22 in it, against 116, 111, 125 and 127 characters. In
 * words the same defect varies 28% between the languages and a ceiling that caught the English
 * would have to be 17, a margin of one word, with legitimate copy failing. In characters it
 * varies 14%, and 90 catches all four with 21 to spare.
 */
export function longestBreath(value: string): number {
  return Math.max(
    ...value
      .replace(/\{[a-zA-Z]+\}/g, "x".repeat(10))
      .split(/[,;:—–().!?]/)
      .map((stretch) => stretch.trim().length)
  );
}

export const BREATH_CEILING = 90;
export const ASIDE_CEILING = 1;

/**
 * Every string under a namespace, as `[dotted key, value]`.
 *
 * WHAT IT LEAVES OUT, and the exclusion is the rule's own: `DS-COPY-013` covers running text —
 * a FAQ answer, the body of a block, a paragraph of a policy — and explicitly not a label, a
 * title, an `alt`, a short list item or a metadatum. "Surfaces of one clause have nothing to
 * punctuate", and `seo.description` has a ceiling of its own (`DS-COPY-010`).
 *
 * The exclusion is by KEY NAME rather than by length, because a short body is still a body and a
 * long label is still a label — and because a rule that fired on the value would be a different
 * rule on every translation of it.
 */
const NOT_RUNNING_TEXT =
  /(^|\.)(seo|title|label|alt|actions|categories|progress|charactersLeft|empty|link|cta|ctaLabel)(\.|$)|Title$|Label$/;

export function runningTextOf(
  namespace: Record<string, unknown>,
  prefix = ""
): [string, string][] {
  const found: [string, string][] = [];
  for (const [key, value] of Object.entries(namespace)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      if (!NOT_RUNNING_TEXT.test(path)) found.push([path, value]);
    } else if (value && typeof value === "object") {
      found.push(...runningTextOf(value as Record<string, unknown>, path));
    }
  }
  return found;
}
