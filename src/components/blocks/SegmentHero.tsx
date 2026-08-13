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
 *
 * ---------------------------------------------------------------------------
 * `eyebrow` and `media` — card #306, §3.2 of the conversion spec
 * ---------------------------------------------------------------------------
 *
 * **The reason for the single column inverts when there is media, and only
 * then.** The decision above is not revoked: with `media` absent the hero
 * renders exactly as it did, one column, no held space, no empty cell. With
 * `media` present the second cell has something in it, so the skeleton becomes
 * two columns from `lg` up.
 *
 * **The DOM order is the same at both widths** — eyebrow, h1, subtitle, call to
 * action, media — so reading order and Tab order never diverge from the visual
 * one (SC 1.3.2 and 2.4.3), and the call to action stays *above* the poster on
 * a phone. The poster being cut by the fold is deliberate: content interrupted
 * at the fold is what makes a page get scrolled.
 *
 * `eyebrow` is `--color-tuggi-primary-text` and never `--color-tuggi-primary`:
 * the brand cyan under small text measures 2.70:1 and fails SC 1.4.3
 * (`DS-COR-002`).
 */

type SegmentHeroProps = {
  title: string;
  subtitle: string;
  /** A short label above the h1, naming who the page is for. Optional. */
  eyebrow?: string;
  /**
   * The second cell, from `lg` up — today the narrated drive of `/partners`.
   * Absent means absent: single column, and no space held for a picture that
   * is not coming.
   */
  media?: React.ReactNode;
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

export function SegmentHero({
  title,
  subtitle,
  eyebrow,
  media,
  cta,
  secondary,
}: SegmentHeroProps) {
  // One column and `max-w-3xl` with no media — the markup a visitor gets today
  // — and a two-cell grid from `lg` up when there is something to put in the
  // second cell. Same children, same order, in both.
  const column = media ? "max-w-xl flex flex-col items-start gap-6" : "";

  return (
    <section
      data-block="segment-hero"
      className="w-full bg-white border-b border-gray-200 pt-32 pb-20 lg:pt-40 lg:pb-24"
    >
      <div className="page-shell">
        <div
          className={
            media
              ? "flex flex-col items-start gap-10 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center"
              : "max-w-3xl flex flex-col items-start gap-6"
          }
        >
          <Column className={column}>
            {eyebrow ? (
              <p className="text-sm font-semibold uppercase tracking-wide text-tuggi-primary-text">
                {eyebrow}
              </p>
            ) : null}
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
          </Column>
          {media}
        </div>
      </div>
    </section>
  );
}

/**
 * The text cell — a real `<div>` when it is one of two cells, and no element at
 * all when it is the whole hero.
 *
 * The wrapper is not cosmetic and it is not free: with no media the served
 * markup has to stay what it was, because criterion 8 of spec §9 measures this
 * hero against the one already in production. `display: contents` would render
 * the same and still change the DOM, and a DOM the tests walk is part of what
 * "unchanged" means here.
 */
function Column({ className, children }: { className: string; children: React.ReactNode }) {
  if (!className) return <>{children}</>;
  return <div className={className}>{children}</div>;
}
