import type { ComponentProps } from "react";
import { Link } from "@/i18n/routing";

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
 * **The CTA is optional, and absent means absent** (copy doc §1.1). The hub's
 * first decision is *"which of these am I?"*, and that answer is the grid
 * right below; a button to /contact above it competes with the grid and
 * collects the lead of someone who has not qualified himself yet. So there is
 * no reserved space, no placeholder and no disabled button — the element does
 * not exist in the DOM.
 *
 * Single column, `max-w-3xl`: without a hero image the two-column skeleton
 * loses a cell, and an empty half reads as a picture that failed to load
 * (spec §2.1). The hero image itself belongs to the segment page.
 */

type SegmentHeroProps = {
  title: string;
  subtitle: string;
  /**
   * The one call to action. Absent on the hub — see above. `href` is typed
   * against the route map, so a destination that is not declared is a compile
   * error rather than a 404.
   */
  cta?: {
    label: string;
    href: ComponentProps<typeof Link>["href"];
  };
};

export function SegmentHero({ title, subtitle, cta }: SegmentHeroProps) {
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
          {cta ? (
            <Link
              href={cta.href}
              className="mt-2 px-8 py-4 bg-tuggi-secondary text-tuggi-dark font-semibold rounded-md shadow-sm hover:bg-tuggi-secondary-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 w-full sm:w-auto text-center"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
