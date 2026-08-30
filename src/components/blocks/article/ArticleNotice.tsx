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
    <aside className="my-10 flex gap-4 rounded-2xl border border-gray-200 border-l-4 border-l-tuggi-primary-text bg-tuggi-bg p-6">
      <Info className="w-5 h-5 shrink-0 mt-0.5 text-tuggi-primary-text" aria-hidden="true" />
      <div className="text-tuggi-slate leading-relaxed">{children}</div>
    </aside>
  );
}
