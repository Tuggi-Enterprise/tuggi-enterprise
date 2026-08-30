import Link from "next/link";
import { useTranslations } from "next-intl";
import { UpdateCard, type UpdateCardVM } from "@/components/blocks/UpdateCard";

/**
 * The listing grid, and the empty state — spec §4.2 and §4.3.
 *
 * **1 / 2 / 3 columns, and it stops at 3.** Not 4, as `/tours` does: the route
 * card has no summary and this one has. Measured on 2026-08-30 in today's rail
 * (`.page-shell`, 80 rem, `padding-inline: 2rem` above 64 rem): at 1280 px the
 * usable width is 1216 px, and with `gap-6` three columns give a 389 px card,
 * where the summary breaks at ~48 characters per line. Four give 286 px and
 * ~35 characters, and three clamped lines become a fragment.
 *
 * Equal height per row is a consequence of the grid plus `h-full` and the
 * clamps, never a fixed height — the same solution `RouteCard` already uses.
 *
 * DOM order is date order, and no `order-*` reorders it: the tab sequence has
 * to be the visual one (SC 1.3.2 / 2.4.3).
 */
export function UpdateGrid({
  items,
  fallbackHref,
}: {
  items: UpdateCardVM[];
  /** The section in `en`, when this locale has nothing and English does. */
  fallbackHref: string | null;
}) {
  const t = useTranslations("Updates");

  if (!items.length) {
    // A locale with no article yet is a **state**, not a defect (DS-COPY-047).
    // No illustration and no download CTA: the visitor came for a fact and did
    // not get one, and selling to him at that moment is the wrong answer.
    return (
      <div className="max-w-xl">
        <p className="text-tuggi-slate">{t("empty.body")}</p>
        {fallbackHref && (
          <Link
            href={fallbackHref}
            className="mt-4 inline-block font-bold text-tuggi-primary-text underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2 rounded-sm"
          >
            {t("empty.link")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <UpdateCard key={item.slug} vm={item} />
      ))}
    </div>
  );
}
