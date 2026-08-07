import {
  AUDIO_GUIDES_FLOOR,
  CONTENT_LANGUAGES,
  COVERAGE_COUNTRIES,
  MAPPED_POINT_MILLIONS,
  OPERATING_SINCE,
} from "./product-facts";

/**
 * proof-lines.ts — what the site's proof block is allowed to claim, and what
 * makes a line disappear.
 *
 * Spec §2 of `docs/design/spec-repaginacao-site-2026-08.md` (card #193,
 * component 4.2). It is here and not inside `ProofBlock.tsx` for one reason:
 * §2.4 says a line whose value is missing does not render, and with zero lines
 * the block does not render — and a rule stated in JSX can only be checked by
 * rendering the page. As a pure function it is checked directly, which is what
 * `tests/e2e/proof-block.spec.ts` does with a null.
 *
 * ---------------------------------------------------------------------------
 * The block the spec drew is not the block that ships, and the rule says why
 * ---------------------------------------------------------------------------
 *
 * The spec's three lines opened with *"Mais de {storiesPlayed} histórias já
 * tocadas por viajantes do mundo todo"* — plays, coverage, operating year —
 * and §2.5 already forbade shipping the first one unconfirmed. It was not
 * confirmed: the measurement of 2026-08-06 found 1,653 raw plays, 201 from
 * seven external people, against a published 50,000, and the operator closed
 * the question on 2026-08-07 — *"esse é um numero de venda e nao real"*. So
 * `STORIES_PLAYED` is null by decision (BR-COMUNICACAO-003 item 5), item 4
 * closes the rounding escape, and no smaller invented figure is an answer.
 *
 * **BR-COMUNICACAO-003 item 7 is what this file implements**: proof does not
 * have to be usage, and today it is not. The four facts it names are already
 * measured and already owned — the archive of mapped points and the country
 * count (BR-COMUNICACAO-002 items 8 and 9), the produced audio guides (item
 * 2), the content language catalogue (BR-IDIOMA-001 item 2) and the operating
 * year (item 6). Every one of them is a figure this file cites by rule and
 * never spells out; the sweep in `product-facts.spec.ts` reads comments for
 * exactly that reason, and it caught this paragraph writing them out. The
 * hierarchy the spec designed survives intact, because it was never about
 * which number was which: line 1 is the proof, line 2 is scale, line 3 is time
 * in business.
 *
 * **The pairings are not interchangeable, and that is item 3.** Points go with
 * countries, because both are presence. Guides go with languages, because both
 * are content. A guide count next to the country figure would claim narration in
 * places that have none — France, Canada and Ireland are 27% of the map with
 * zero guides — and the country figure that may carry a content noun is 14,
 * which nothing publishes.
 */

/** The lines the block can draw, in the order it draws them. */
export type ProofLineKey = "points" | "guides" | "since";

/**
 * The module values a line needs, keyed the way `PRODUCT_FACTS` keys them.
 *
 * Typed nullable on purpose: the constants behind them are not, and a missing
 * value would then be unreachable code that nobody could test. §2.4 is a state
 * the block has to have, so the type has to admit it.
 */
export interface ProofFacts {
  mappedPointMillions: number | null;
  coverageCountries: number | null;
  audioGuidesFloor: number | null;
  contentLanguages: number | null;
  operatingSince: number | null;
}

/** A line, its message key, and the facts its sentence interpolates. */
export interface ProofLine {
  key: ProofLineKey;
  /** Under the `Proof` namespace of `src/messages/*.json`. */
  message: ProofLineKey;
  /** Every `PRODUCT_FACTS` name the sentence reads. One null removes the line. */
  reads: readonly (keyof ProofFacts)[];
  /** The rules that own the figures on this line. Cited, never re-decided. */
  rules: readonly string[];
  /**
   * The line's weight, which is a role and not a size — spec §2.2. "lead" is
   * the proof, "scale" is how big it is, "tenure" is how long we have been at
   * it. `ProofBlock` turns each into type.
   */
  role: "lead" | "scale" | "tenure";
}

export const PROOF_LINES: readonly ProofLine[] = [
  {
    key: "points",
    message: "points",
    reads: ["mappedPointMillions", "coverageCountries"],
    rules: ["BR-COMUNICACAO-002 item 8", "BR-COMUNICACAO-002 item 9"],
    role: "lead",
  },
  {
    key: "guides",
    message: "guides",
    reads: ["audioGuidesFloor", "contentLanguages"],
    rules: ["BR-COMUNICACAO-002 item 2", "BR-IDIOMA-001 item 2"],
    role: "scale",
  },
  {
    key: "since",
    message: "since",
    reads: ["operatingSince"],
    rules: ["BR-COMUNICACAO-002 item 6"],
    role: "tenure",
  },
];

/**
 * The lines that may be drawn, given what the module knows today.
 *
 * Spec §2.4: a line with a missing value does not render — never `[N]`, never
 * an em dash, never a zero, never an empty string. An empty result means the
 * block itself does not render, which is the caller's half of the same rule.
 */
export function visibleProofLines(facts: ProofFacts): readonly ProofLine[] {
  return PROOF_LINES.filter((line) => line.reads.every((name) => facts[name] !== null));
}

/** What the block reads today. The constants, narrowed to the five it needs. */
export const PROOF_FACTS: ProofFacts = {
  mappedPointMillions: MAPPED_POINT_MILLIONS,
  coverageCountries: COVERAGE_COUNTRIES,
  audioGuidesFloor: AUDIO_GUIDES_FLOOR,
  contentLanguages: CONTENT_LANGUAGES,
  operatingSince: OPERATING_SINCE,
};
