import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ArticlePagerLink {
  href: string;
  title: string;
}

/**
 * Previous and next by date — `DS-COMPONENTE-058`, spec §5.4.
 *
 * Two links at most, each carrying the **title** of the neighbouring piece: a
 * pair of arrows labelled "previous" and "next" makes the reader open a page to
 * find out what it is. `previous` is the older piece and `next` the newer one,
 * which is the direction someone walking a record expects.
 *
 * There is no "related articles" block, and that is measured rather than lazy:
 * under twenty pieces, "related" is a synonym for "random".
 *
 * It is navigation, not a call to action, so it does not count against the one
 * CTA the end of an article carries — and it comes after it.
 */
export function ArticlePager({
  previous,
  next,
}: {
  previous: ArticlePagerLink | null;
  next: ArticlePagerLink | null;
}) {
  const t = useTranslations("Updates.pager");
  if (!previous && !next) return null;

  const itemClass =
    "group flex flex-1 flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2";

  return (
    <nav aria-label={t("label")} className="mt-12 border-t border-gray-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row">
        {previous && (
          <Link href={previous.href} className={itemClass}>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-tuggi-primary-text">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              {t("previous")}
            </span>
            <span className="font-bold text-tuggi-dark">{previous.title}</span>
          </Link>
        )}
        {next && (
          <Link href={next.href} className={`${itemClass} sm:text-right sm:items-end`}>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-tuggi-primary-text">
              {t("next")}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="font-bold text-tuggi-dark">{next.title}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
