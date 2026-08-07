import { useTranslations } from "next-intl";
import { PRODUCT_FACTS } from "@/lib/product-facts";

/**
 * Block 4 of the partner template and block 3 of the `/partners` hub — spec
 * §2.1 of `docs/design/spec-template-segmento-2026-08.md` and §2 of
 * `docs/design/copy-parcerias-2026-08.md` (card #195).
 *
 * The mechanism, and it is the same mechanism in every segment
 * (**BR-B2B-010** item 1): the establishment signs up and is approved, it
 * displays its QR Code, the purchases of the traveller attributed to it feed
 * its revenue share, and — the step the operator's answers to questions 67 to
 * 69 unlocked — its own venue may be added to Tuggi as a point of interest.
 *
 * ---------------------------------------------------------------------------
 * What the copy of the last step is doing, and why it is not editable here
 * ---------------------------------------------------------------------------
 *
 * `s4Body` is the one string on this page that carries a rule in every clause:
 * **BR-B2B-010** item 3 (the venue *may* enter — nothing may state that every
 * approved partner appears), item 4 (what is promised is the **outcome**
 * within `PARTNER_TRIAGE_HOURS`, not the entry), item 5 (reach is the language
 * of whoever arrives, never a pre-produced catalogue), and **BR-B2B-011**
 * items 4, 5 and 6 (the refusal says which gate failed, re-applying is allowed
 * and has no published deadline, and only gates one and two are describable in
 * public). The clause-by-clause table is in §2 of the copy document. Editing
 * that sentence is editing those rules.
 *
 * Two figures reach it as ICU values and neither is typed into the sentence
 * (`DS-COPY-005`): `partnerTriageHours` and `contentLanguages`, both owned by
 * `src/lib/product-facts.ts`.
 *
 * ---------------------------------------------------------------------------
 * The form
 * ---------------------------------------------------------------------------
 *
 * An **ordered list read from the constant below**, not a hand-built row of
 * columns: the fourth step arrived as one entry in an array and no CSS moved,
 * which is the property that keeps a fifth cheap. The visible numeral is
 * `aria-hidden` — the `<ol>` already tells a screen reader the order, and
 * announcing it twice is noise.
 *
 * **Two by two from `md` up, never four across** (copy doc §2, Layout, which
 * corrects the spec on this point). With four cells on one row the whole row
 * takes the height of the fourth step, which is by nature the longest of the
 * four, and steps one to three each carry hundreds of pixels of empty space
 * below their text. In two rows the damage lands on one neighbour, and a
 * hundred-word paragraph in a ~280 px column is a ribbon rather than a
 * paragraph. Height comes from the grid, never from `min-height`
 * (`DS-A11Y-005`).
 */

/**
 * The steps, in order. Adding the fifth is one entry here plus its two keys in
 * the four message files — no layout change, which is the verifiable claim
 * spec §2.1 makes.
 */
const STEPS = [1, 2, 3, 4] as const;

type PartnershipStepsProps = {
  /**
   * The `{place}` of step two — the noun for where the QR Code lives. The hub
   * enumerates the five ("the counter, the room, the car"); a segment page
   * names its own. It carries its own article and lands after a colon, which
   * is what keeps it grammatical in the four languages: ICU does not contract
   * a preposition, and "em a sua loja" is the defect that only shows up after
   * translation (copy doc §2, step two).
   */
  place: string;
};

export function PartnershipSteps({ place }: PartnershipStepsProps) {
  const t = useTranslations("Segments.steps");
  const values = { ...PRODUCT_FACTS, place };

  return (
    <section data-block="partnership-steps" className="bg-white py-20 lg:py-24">
      <div className="page-shell">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-10 max-w-2xl">
          {t("title")}
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch list-none p-0">
          {STEPS.map((step) => (
            <li key={step} className="flex flex-col gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tuggi-primary text-tuggi-dark font-bold"
              >
                {step}
              </span>
              <h3 className="text-xl font-bold text-tuggi-dark leading-snug">
                {t(`s${step}Title`)}
              </h3>
              <p className="text-base text-tuggi-slate leading-relaxed">
                {t(`s${step}Body`, values)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
