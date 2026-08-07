import { useTranslations } from "next-intl";
import { PUBLISHABLE_MODELS } from "@/lib/segments";

/**
 * The commercial model a partner surface may state — spec §5 of
 * docs/design/spec-repaginacao-site-2026-08.md (card #193, component 4.5),
 * as reshaped by `design` in the comment on #195.
 *
 * **It renders no cards, and the name is kept on purpose.** The spec drew three
 * cards; BR-B2B-009 item 1 then left exactly one model publishable, and a card
 * is an affordance of comparison — it exists to be scanned against its
 * siblings. One card centred on a site that uses a grid of three everywhere
 * else reads as "the other two failed to load" (Gestalt: similarity and
 * closure; Nielsen, *Consistency and standards*). So with one model the
 * section is a declaration: no card frame, no border, no shadow, no grid, and
 * **no `h3`** — *comissão* and *participação na receita* are the same thing
 * under two names, and stacking them would be the finding.
 *
 * **Two gates, and neither is a review habit.**
 *
 *  1. `BusinessModelKey` is derived from PUBLISHABLE_MODELS in
 *     `src/lib/segments.ts`, so `businessModels: ['wholesale']` is a compile
 *     error — measured: `Type '"wholesale"' is not assignable to type
 *     '"commission"'`. Publishing wholesale or voucher would mean revoking
 *     BR-B2B-004 items 2 and 3, which is the operator's decision and not a
 *     page's.
 *  2. The count is read here rather than passed in, because the count *is* the
 *     form: a second publishable model makes the declaration wrong, and it has
 *     to come back to this file. `tests/e2e/business-model-declaration.spec.ts`
 *     is what turns red the day it does.
 *
 * What the copy may say is BR-B2B-007 item 4 — a share of the revenue the
 * partner attributed, never a percentage, a figure or a range (BR-B2B-005,
 * BR-MONETIZACAO-039). The words are the operator's, published by `design`
 * with the rest of the partner copy; nothing here rewrites them.
 */

/** The one model publishable today. Read so that a second one cannot be silent. */
const DECLARED_MODEL = PUBLISHABLE_MODELS[0];

export function BusinessModelCards() {
  const t = useTranslations("Segments.commercial");

  return (
    <section className="py-24 bg-white border-b border-gray-100" data-business-model={DECLARED_MODEL}>
      {/* Left in the rail, not centred: a declaration of three lines centred at
          1280 px loses the eye's return point on every line (DS-LAYOUT-001). */}
      <div className="page-shell">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-6">
            {t("title")}
          </h2>
          <p className="text-xl sm:text-2xl text-tuggi-dark leading-relaxed mb-4">{t("lead")}</p>
          <p className="text-base text-tuggi-slate leading-relaxed">{t("note")}</p>
        </div>
      </div>
    </section>
  );
}
