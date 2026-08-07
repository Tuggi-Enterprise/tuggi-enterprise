import { useTranslations } from "next-intl";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import { PROOF_FACTS, visibleProofLines } from "@/lib/proof-lines";
import type { Surface } from "./surface";

/**
 * The proof block — spec §2 of `docs/design/spec-repaginacao-site-2026-08.md`
 * (card #193, component 4.2).
 *
 * **The same proof everywhere it appears.** No text arrives by prop; the only
 * props are the surface it sits on and how it aligns. Two pages showing
 * different proof is two pages proving nothing, which is why the sentences are
 * not the caller's to choose (spec §2.1).
 *
 * **What it claims and why those four facts** is in `src/lib/proof-lines.ts`,
 * next to the rule that decided them (BR-COMUNICACAO-003 item 7). This file
 * owns only the form.
 *
 * ---------------------------------------------------------------------------
 * The form, and the three things it deliberately is not
 * ---------------------------------------------------------------------------
 *
 * **Not three columns.** Spec §2.3. At 360 px each column would be ~100 px and
 * the display figure would break; at 1280 px the three sentences have very
 * different lengths — the third is a quarter of the first — and three unequal
 * columns read as a layout error rather than as a list.
 *
 * **Not three weights of the same size.** Three figures at one size is noise:
 * the eye has nowhere to stop (Prägnanz). The hierarchy is by role — the
 * archive is the proof, the guide count is scale, the year is tenure — and it
 * is the spec's, unchanged by the fact that the numbers behind the roles moved
 * (spec §2.2).
 *
 * **Not a counter that animates up.** Decorative motion in front of the one
 * number that matters, and the first thing `prefers-reduced-motion` removes
 * (`DS-MOVIMENTO-001`), which would mean half the audience sees a different
 * design. Not cards with borders either: proof is not a feature.
 *
 * The figure is a `<strong>`, not a coloured `<span>` — the emphasis is
 * semantic, so it survives a screen reader and forced-colours mode, and no
 * number here is communicated by size or colour alone (`DS-A11Y-003`). It is
 * never `--color-tuggi-primary`, which measures 2.56:1 on `--color-tuggi-bg`
 * and fails SC 1.4.3.
 */

type ProofBlockProps = {
  /** `DS-COR-004`: filled means `--color-tuggi-dark`, never white on cyan. */
  surface?: Surface;
  /**
   * `"center"` is the spec's default rhythm: left at 360 px, where a centred
   * ragged block loses the eye's return point, and centred from 640 px up.
   * `"start"` keeps it in the rail — for a page whose other blocks are
   * left-aligned, since the same proof has to look native on all of them.
   */
  align?: "center" | "start";
};

/**
 * Colours per surface. On dark, the body is `slate-300` and not
 * `--color-tuggi-slate`: that token measures 3.13:1 on `--color-tuggi-dark`
 * and fails SC 1.4.3 — the same trap `AudioSampleCard` documents.
 */
const SURFACE = {
  light: {
    section: "bg-white",
    figure: "text-tuggi-dark",
    body: "text-tuggi-slate",
  },
  dark: {
    section: "bg-tuggi-dark",
    figure: "text-white",
    body: "text-slate-300",
  },
} as const satisfies Record<Surface, Record<string, string>>;

/**
 * Type per role, from the spec's table. The figure is `block` below 640 px so
 * that it sits above its sentence instead of dragging a 48 px numeral into the
 * middle of a wrapped line, and `inline` from there up.
 */
const ROLE = {
  lead: {
    figure: "block sm:inline text-4xl sm:text-5xl font-extrabold leading-none",
    line: "text-lg sm:text-xl",
  },
  scale: {
    figure: "block sm:inline text-2xl font-bold leading-tight",
    line: "text-lg",
  },
  tenure: {
    figure: "font-bold",
    line: "text-base",
  },
} as const;

export function ProofBlock({ surface = "light", align = "center" }: ProofBlockProps) {
  const t = useTranslations("Proof");
  const skin = SURFACE[surface];

  // Spec §2.4: a line whose value the module does not have is not rendered,
  // and with no lines left the block itself is not rendered. Nothing here ever
  // draws a placeholder, a dash or a zero in place of a fact.
  const lines = visibleProofLines(PROOF_FACTS);
  if (lines.length === 0) return null;

  return (
    <section className={`w-full py-20 ${skin.section}`} data-proof-block={surface}>
      <div className="page-shell">
        {/* Space between the lines, never a rule: three short items separated by
            horizontal rules become three boxes, and the block reads as a table
            (spec §2.3). */}
        <div
          className={`max-w-3xl space-y-6 ${
            align === "center" ? "sm:mx-auto text-left sm:text-center" : "text-left"
          }`}
        >
          {lines.map((line) => {
            const role = ROLE[line.role];
            return (
              <p
                key={line.key}
                data-proof-line={line.key}
                className={`${role.line} leading-relaxed ${skin.body}`}
              >
                {t.rich(line.message, {
                  // Every figure is read from `product-facts.ts` and formatted
                  // by the locale — "16.000" in pt, "16,000" in en. next-intl 4
                  // has no global default values, so the whole object is handed
                  // over here; ICU ignores what a sentence does not use.
                  ...PRODUCT_FACTS,
                  strong: (chunks) => (
                    <strong className={`${role.figure} ${skin.figure}`}>{chunks}</strong>
                  ),
                })}
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
