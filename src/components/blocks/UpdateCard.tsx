import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { UpdateCover } from "@/components/blocks/UpdateCover";
import { UpdateTypeBadge } from "@/components/blocks/UpdateTypeBadge";
import type { UpdateType } from "@/lib/updates";

export interface UpdateCardVM {
  /** The public path in THIS locale — composed by `buildLeafPath`, never here. */
  href: string;
  slug: string;
  title: string;
  summary: string;
  type: UpdateType;
  publishedAt: string;
  /** Already formatted in the page locale (`formatUpdateDate`). */
  publishedLabel: string;
  cover: string;
  coverAlt: string | null;
}

/**
 * The card of the editorial listing — `DS-COMPONENTE-051`.
 *
 * Five slices, always in this order and always all present: cover, `type · date`,
 * the title as an `h2` clamped at two lines, the summary clamped at three, and
 * the reading affordance. The cover is mandatory (a file or generated) exactly
 * so a missing slice can never collapse the row.
 *
 * **The whole card is the link**, and the arrow is not a second `<a>`: two
 * links to one destination are two keyboard stops for one decision (SC 2.4.4).
 *
 * The accessible name of that link is **the title, and only it** —
 * `aria-labelledby` on the `h2`, not the concatenation of everything inside the
 * anchor. Left to compose itself, the name would be "Release note · 30 August
 * 2026 <title> <summary> Read", which is what a screen-reader user hears in a
 * list of links (criterion 11).
 *
 * The anatomy — border, `rounded-3xl`, lift on hover, `focus-visible:ring` — is
 * `RouteCard`'s, unchanged. Nothing here is a new focus ring or a new radius.
 */
export function UpdateCard({ vm }: { vm: UpdateCardVM }) {
  const t = useTranslations("Updates");
  const titleId = `update-card-${vm.slug}`;

  return (
    <Link
      href={vm.href}
      aria-labelledby={titleId}
      className="group flex flex-col h-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2"
    >
      <div className="border-b border-gray-100">
        <UpdateCover
          cover={vm.cover}
          coverAlt={vm.coverAlt}
          slug={vm.slug}
          sizes="(min-width: 1024px) 389px, (min-width: 640px) 50vw, 100vw"
        />
      </div>

      <div className="flex flex-col flex-1 p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <UpdateTypeBadge type={vm.type} />
          {/* The mid dot is the separator of marca.md §8 — and it is
              `aria-hidden` because a screen reader announcing "middle dot"
              between two facts adds nothing to either. */}
          <span className="text-xs text-tuggi-slate" aria-hidden="true">
            ·
          </span>
          <time dateTime={vm.publishedAt} className="text-xs text-tuggi-slate">
            {vm.publishedLabel}
          </time>
        </div>

        <h2 id={titleId} className="text-lg font-black text-tuggi-dark leading-snug mb-3 line-clamp-2">
          {vm.title}
        </h2>

        <p className="text-sm text-tuggi-slate leading-relaxed line-clamp-3">{vm.summary}</p>

        <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-bold text-tuggi-primary-text">
          {t("readMore")}
          <ArrowRight
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
