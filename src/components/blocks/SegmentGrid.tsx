import { useTranslations } from "next-intl";
import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SEGMENTS, segmentPathname } from "@/lib/segments";
import type { StaticAppPathname } from "@/i18n/pathnames";

/**
 * Block 2 of the `/partners` hub — spec §6.1 and §6.2 of
 * `docs/design/spec-template-segmento-2026-08.md` (card #195).
 *
 * One card per segment, **including the ones with no page**, ordered by the
 * registry's `order`. The hub exists so a visitor can answer *"which of these
 * am I?"*, and hiding the segments that are not published yet answers it
 * wrong: a restaurant owner who does not see restaurants concludes we do not
 * take restaurants, and he is the one we are trying to reach.
 *
 * **The difference between a published card and an unpublished one is the verb
 * and the destination, never the paint** (§6.2). No grey, no reduced opacity,
 * no `aria-disabled`, no badge and no deadline: the card is not disabled, it
 * leads somewhere else. Colour-only state is `DS-A11Y-003`, and there is no
 * state here to communicate in the first place.
 *
 * ---------------------------------------------------------------------------
 * Three things this file deliberately does not do
 * ---------------------------------------------------------------------------
 *
 * **It writes no slug and no segment key.** Both come out of `SEGMENTS`, which
 * is what makes segment N+1 cost a registry entry and a block of copy rather
 * than a component change (`DS-COMPONENTE-005`, asserted in
 * tests/e2e/routing.spec.ts).
 *
 * **It does not reach for the icon by name.** The registry holds the Lucide
 * name, so the lookup is dynamic. The namespace import is the cost of that,
 * and it is paid on the server: this is a server component, it renders to
 * markup, and none of the library reaches the browser.
 *
 * **It does not equalize heights with `min-height`** (`DS-A11Y-005`). The grid
 * does it — `items-stretch` plus a column layout inside the link — so a card
 * whose Italian body wraps to a fourth line grows its whole row instead of
 * overflowing a fixed box.
 */

/** The whole card is the target, not a link at the end of it — `DS-A11Y-002`. */
const CARD_CLASS =
  "group flex h-full flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-8 " +
  "shadow-sm transition-transform duration-150 hover:-translate-y-1 " +
  "motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2";

export function SegmentGrid() {
  const t = useTranslations();
  const cards = [...SEGMENTS].sort((a, b) => a.order - b.order);

  return (
    <section data-block="segment-grid" className="bg-tuggi-bg py-20 lg:py-24">
      <div className="page-shell">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-10 max-w-2xl">
          {t("Partners.grid.title")}
        </h2>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch list-none p-0">
          {cards.map((segment) => {
            const Icon = Lucide[segment.icon] as LucideIcon;
            const titleId = `segment-card-${segment.key}`;
            // Published: its own page. Not published: the contact form, with
            // the segment carried in the query so the conversation starts
            // where the visitor left off (spec §6.3).
            const href = segment.published
              ? (segmentPathname(segment.key) as StaticAppPathname)
              : { pathname: "/contact" as const, query: { segment: segment.key } };

            return (
              <li key={segment.key} className="flex">
                <Link href={href} aria-labelledby={titleId} className={CARD_CLASS}>
                  <Icon className="w-8 h-8 text-tuggi-primary-text" aria-hidden="true" />
                  <h3 id={titleId} className="text-xl font-bold text-tuggi-dark leading-snug">
                    {t(`Segments.${segment.key}.hub.cardTitle`)}
                  </h3>
                  <p className="text-base text-tuggi-slate leading-relaxed">
                    {t(`Segments.${segment.key}.hub.cardBody`)}
                  </p>
                  <span className="mt-auto pt-4 inline-flex items-center gap-2 font-semibold text-tuggi-primary-text">
                    {t(segment.published ? "Partners.grid.actionOpen" : "Partners.grid.actionContact")}
                    <Lucide.ArrowRight
                      className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
