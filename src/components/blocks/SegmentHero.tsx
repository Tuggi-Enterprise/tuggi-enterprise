import { Play } from "lucide-react";
import { CtaLink, type CtaHref } from "./CtaLink";

/**
 * Block 1 of the partner template and of the `/partners` hub — spec §2.1 and
 * §6 of `docs/design/spec-template-segmento-2026-08.md` (card #195).
 *
 * It is born out of `FleetsHero.tsx`, with the two corrections `design` made
 * mandatory in §2.1, and neither is cosmetic:
 *
 *  1. **The call to action carries dark ink on the brand orange.** The parent
 *     paired `bg-tuggi-secondary` with `text-white`: measured 2.79:1, which
 *     fails SC 1.4.3. `bg-tuggi-secondary text-tuggi-dark` measures 6.71:1 and
 *     is what the header's own CTA has always done (`DS-COR-002`,
 *     `DS-COR-004`). Copying the parent's class list is the way this defect
 *     reproduced into three CTAs on one journey.
 *  2. **One call to action, and it is never "Download app".** The visitor here
 *     owns a business; the traveller's CTA belongs to the header.
 *
 * ---------------------------------------------------------------------------
 * Why the copy arrives as props
 * ---------------------------------------------------------------------------
 *
 * Two callers read two different namespaces — the hub reads `Partners.hero.*`
 * and the segment page will read `Segments.<key>.hero.*` — so the component
 * cannot own a `useTranslations` call without owning one of them. The strings
 * still come from i18n: they are `t()` results at the call site (DS-COPY-001).
 *
 * **Both calls to action are optional, and absent means absent.** No reserved
 * space, no placeholder, no disabled button: the element is not in the DOM.
 * That was already true of `cta` and it is the whole design of `secondary`,
 * which the hub passes only while `PARTNER_VIDEOS` has an entry — one
 * condition, and the video block reads the same one (spec §4.1).
 *
 * **The hub's hero did not have a CTA and now has one**, and the reversal has a
 * reason rather than a change of mind: §1.1 of the copy document decided
 * against it while the grid below was the page's navigation, and
 * `docs/design/spec-lp-parcerias-2026-08.md` §0.1 took that role away from the
 * grid. With every card pointing at `#lead-form`, a CTA in the hero no longer
 * competes with anything — it is the same destination, said earlier.
 *
 * **The secondary is a link, never a second filled button.** Two filled buttons
 * side by side in the first fold are two primaries, and the visitor picks the
 * cheaper one. High intent looks like a button; low intent looks like a link
 * (spec §2.4).
 *
 * Single column, `max-w-3xl`: without a hero image the two-column skeleton
 * loses a cell, and an empty half reads as a picture that failed to load
 * (spec §2.1). The hero image itself belongs to the segment page.
 */

type SegmentHeroProps = {
  title: string;
  subtitle: string;
  /**
   * The high-intent call to action. `href` is typed against the route map or is
   * an anchor on this page, so a destination that is neither is a compile error
   * rather than a 404.
   */
  cta?: {
    label: string;
    href: CtaHref;
  };
  /** The low-intent one, under the primary at 390 px, beside it from `sm`. */
  secondary?: {
    label: string;
    href: CtaHref;
  };
};

export function SegmentHero({ title, subtitle, cta, secondary }: SegmentHeroProps) {
  return (
    <section
      data-block="segment-hero"
      className="w-full bg-white border-b border-gray-200 pt-32 pb-20 lg:pt-40 lg:pb-24"
    >
      <div className="page-shell">
        <div className="max-w-3xl flex flex-col items-start gap-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-tuggi-dark leading-tight">
            {title}
          </h1>
          <p className="text-xl text-tuggi-slate leading-relaxed max-w-2xl">{subtitle}</p>
          {cta || secondary ? (
            // Stacked at 390 px and side by side from `sm`: the secondary never
            // sits next to the primary on a phone (spec §2.4).
            <div className="mt-2 flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center">
              {cta ? (
                <CtaLink
                  href={cta.href}
                  className="min-h-[48px] inline-flex items-center justify-center px-8 py-4 bg-tuggi-secondary text-tuggi-dark font-semibold rounded-md shadow-sm hover:bg-tuggi-secondary-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 w-full sm:w-auto text-center"
                >
                  {cta.label}
                </CtaLink>
              ) : null}
              {secondary ? (
                <CtaLink
                  href={secondary.href}
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 px-2 font-semibold text-tuggi-dark underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 rounded-md"
                >
                  <Play className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {secondary.label}
                </CtaLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
