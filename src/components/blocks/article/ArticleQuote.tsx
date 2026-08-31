import type { ReactNode } from "react";

/**
 * A quotation with its attribution — `DS-COMPONENTE-054`.
 *
 * The attribution is required by the parser: a quotation nobody signs is an
 * assertion wearing quotation marks, and this section publishes product facts.
 *
 * `<figure>` + `<blockquote>` + `<figcaption>` rather than a `<blockquote>`
 * with a `<p>` after it, for the same reason `ArticleFigure` uses a caption:
 * the association between the words and whoever said them is data, and only
 * this markup carries it.
 *
 * The left rule is `--color-tuggi-primary-text` at 4,85:1 over white — but it
 * is a rule, not text, and the words themselves stay `--color-tuggi-dark`.
 */
export function ArticleQuote({
  children,
  author,
  role,
}: {
  children: ReactNode;
  author: string;
  role?: string;
}) {
  return (
    <figure className="my-10 border-l-4 border-tuggi-primary-text pl-6" data-block="article-quote">
      {/* Body size, at every tier the body has — 20 px from `md`, 24 px from
          `xl` — for the reason the notice states: a pull quote rendered
          SMALLER than the paragraph above it is not an emphasis. */}
      <blockquote className="text-xl xl:text-2xl leading-relaxed text-tuggi-dark">
        {children}
      </blockquote>
      {/* The attribution is running text and does not inherit the 768 px of
          the figure — `DS-LAYOUT-012`, part 2. */}
      <figcaption className="mt-3 max-w-lg text-base text-tuggi-slate">
        {author}
        {role ? `, ${role}` : ""}
      </figcaption>
    </figure>
  );
}
