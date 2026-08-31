import type { ReactNode } from "react";
import { Info } from "lucide-react";

/**
 * A notice inside an article — `DS-COMPONENTE-054`.
 *
 * **One variant, and that is the decision, not a first iteration.** A yellow
 * `warning` and a red `danger` would be two new colour pairs with no owner in
 * the `@theme` block, born inside a content file, which `DS-COR-001` forbids.
 * And copy that genuinely has to alarm alarms in its **first sentence**
 * (`DS-COPY-045`), not in a coloured box halfway down the piece, which is the
 * shape the reader has learnt to skip.
 *
 * `--color-tuggi-slate` over `--color-tuggi-bg` measures 5,67:1, and the rule
 * on the left is `--color-tuggi-primary-text`. Nothing here is a new value.
 */
export function ArticleNotice({ children }: { children: ReactNode }) {
  return (
    <aside data-block="article-notice" className="my-10 flex gap-4 rounded-2xl border border-gray-200 border-l-4 border-l-tuggi-primary-text bg-tuggi-bg p-6">
      <Info className="w-5 h-5 shrink-0 mt-0.5 text-tuggi-primary-text" aria-hidden="true" />
      {/* The body of the article, at the same size — `DS-LAYOUT-012`, part 3:
          18/32 below `md`, 20/36 from there, 24/40 from `xl`. A notice is prose,
          so it reads at the size the prose around it reads at and it follows
          every tier the body moves to; it sits in the text column, not in a
          figure one. Leaving it a step smaller than the body would demote a
          disclosure BR-COMUNICACAO-009 item 4.b makes mandatory. Measured on the
          `<div>`, which is the element that carries the text and not the
          `<aside>` around it: 551 px after `p-6` on both sides, the icon and the
          `gap-4` when the column is 640, and 695 px when it is 784 — 27,6 em at
          20 px and 29,0 em at 24 px. */}
      <div className="text-lg leading-8 md:text-xl md:leading-9 xl:text-2xl xl:leading-10 text-tuggi-slate">
        {children}
      </div>
    </aside>
  );
}
