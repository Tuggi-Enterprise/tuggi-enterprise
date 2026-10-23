/**
 * The class strings of the site's form surfaces, in one place instead of retyped per page.
 *
 * Nothing here is a hex: every colour is a `--color-tuggi-*` of `src/app/globals.css`
 * (DS-COR-001), and the two the palette did not have, the error red and the resting control
 * border, live there with their measurements.
 *
 * They were born for the partnership proposal (#396). The proposal left the site with #990 and
 * #966, and what stayed is what `/unsubscribe` reads.
 */

/**
 * The page's primary action. `bg-tuggi-secondary` with `text-tuggi-dark` is the pairing
 * DS-COR-004 mandates; the hover token still clears AA against the same text (5.35:1). The
 * 48 px floor is the Tuggi ruler for a control on this kind of surface (WCAG 2.2 SC 2.5.8
 * floors it at 24).
 */
export const BUTTON_PRIMARY =
  "inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-md " +
  "bg-tuggi-secondary px-8 py-4 text-base font-semibold text-tuggi-dark shadow-sm " +
  "transition-colors hover:bg-tuggi-secondary-hover focus:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2";

export const CARD = "rounded-3xl border border-tuggi-border bg-white p-6 sm:p-8 shadow-sm";

export const NOTE_BOX = "rounded-xl border border-tuggi-border bg-tuggi-bg p-4";

export const ALERT_BOX = "rounded-xl border border-tuggi-error p-4";
