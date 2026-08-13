import { useTranslations } from "next-intl";
import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SEGMENTS, segmentPathname } from "@/lib/segments";
import type { StaticAppPathname } from "@/i18n/pathnames";
import { CtaLink, type CtaHref } from "./CtaLink";
import { LEAD_FORM_ANCHOR } from "@/lib/lead-form";

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
 * **The unpublished card stopped being navigation** —
 * `docs/design/spec-lp-parcerias-2026-08.md` §0.1. It used to open
 * `/contact?segment=<key>`, and `/contact` opens with three triage cards —
 * *City / Government*, *Fleets / Rentals*, *Traveller* — so the restaurant
 * owner who clicked "Restaurants" landed on a page where none of the three
 * options is him. The card now jumps to the form on this page and pre-selects
 * his type of business, which is the same recognition doing the opposite of
 * losing him.
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

/**
 * A paragraph between the `h2` and the cards — card #306, §5.3. Absent means
 * absent, like every other optional slot on this page: the segment template
 * does not pass it and its grid renders as it does today.
 */
export function SegmentGrid({ lead }: { lead?: string }) {
  const t = useTranslations();
  const cards = [...SEGMENTS].sort((a, b) => a.order - b.order);

  return (
    <section data-block="segment-grid" className="bg-tuggi-bg py-20 lg:py-24">
      <div className="page-shell">
        <h2
          className={`text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight max-w-2xl ${
            lead ? "mb-4" : "mb-10"
          }`}
        >
          {t("Partners.grid.title")}
        </h2>

        {lead ? (
          <p className="text-lg text-tuggi-slate leading-relaxed max-w-2xl mb-10">{lead}</p>
        ) : null}

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch list-none p-0">
          {cards.map((segment) => {
            const Icon = Lucide[segment.icon] as LucideIcon;
            const titleId = `segment-card-${segment.key}`;
            const actionId = `segment-card-action-${segment.key}`;
            // Published: its own page. Not published: the form on this page,
            // with the type of business pre-selected (spec §6.2 and §6.3).
            const href: CtaHref = segment.published
              ? (segmentPathname(segment.key) as StaticAppPathname)
              : LEAD_FORM_ANCHOR;

            return (
              <li key={segment.key} className="flex">
                <CtaLink
                  href={href}
                  // Title **and** action, not the title alone. "Restaurants"
                  // was a sufficient name while the card opened a page called
                  // Restaurants; now that six cards jump to the same form, the
                  // purpose of the link is in the verb (SC 2.4.4).
                  aria-labelledby={`${titleId} ${actionId}`}
                  data-business-type={segment.key}
                  className={CARD_CLASS}
                >
                  <Icon className="w-8 h-8 text-tuggi-primary-text" aria-hidden="true" />
                  <h3 id={titleId} className="text-xl font-bold text-tuggi-dark leading-snug">
                    {t(`Segments.${segment.key}.hub.cardTitle`)}
                  </h3>
                  <p className="text-base text-tuggi-slate leading-relaxed">
                    {t(`Segments.${segment.key}.hub.cardBody`)}
                  </p>
                  <span
                    id={actionId}
                    className="mt-auto pt-4 inline-flex items-center gap-2 font-semibold text-tuggi-primary-text"
                  >
                    {t(segment.published ? "Partners.grid.actionOpen" : "Partners.cta.action")}
                    <Lucide.ArrowRight
                      className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
                      aria-hidden="true"
                    />
                  </span>
                </CtaLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
