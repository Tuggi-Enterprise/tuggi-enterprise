/**
 * The class strings of the partnership proposal, in one place instead of retyped per field.
 *
 * The surface moved from the CMS to the site (#396) and the tokens moved with it: nothing here
 * is a hex, every colour is a `--color-tuggi-*` of `src/app/globals.css` (DS-COR-001), and the
 * two that the palette did not have — the error red and the resting control border — were added
 * there with their measurements rather than typed here.
 *
 * What survives the move unchanged is the geometry, because it was never about the CMS:
 *
 *   - 48 px minimum height on every control (HIG 44 pt, Material 48 dp; WCAG 2.2 SC 2.5.8 floors
 *     it at 24×24 and 44 is the Tuggi ruler for this surface);
 *   - `text-base` = 16 px in every entry field (SC 1.4.4, and it is also what stops Safari on
 *     iOS from zooming when the field takes focus);
 *   - single column at any width — the segment is a phone behind a counter (DS-LAYOUT-005).
 *
 * The page keeps the site's chrome (`GlobalHeader`, `FatFooter`, `CookieBanner`) from the
 * locale layout: in the CMS the form had no frame at all, and here somebody arriving from the
 * landing page has to recognise that they are still on the Tuggi.
 */

export const FIELD_LABEL = "block text-base font-semibold text-tuggi-dark";

export const FIELD_HELP = "mt-1 text-sm text-tuggi-slate";

export const FIELD_CONTROL =
  "mt-2 block w-full min-h-[48px] rounded-xl border border-tuggi-border bg-white px-4 py-3 " +
  "text-base text-tuggi-dark placeholder:text-tuggi-slate focus:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-tuggi-primary-text";

export const FIELD_CONTROL_INVALID = "border-tuggi-error";

export const FIELD_ERROR =
  "mt-2 flex items-start gap-2 text-sm font-medium text-tuggi-error";

/**
 * The page's primary action. `bg-tuggi-secondary` with `text-tuggi-dark` is the pairing
 * DS-COR-004 mandates and the one the landing page's own submit already uses; the hover token
 * still clears AA against the same text (5.35:1).
 */
export const BUTTON_PRIMARY =
  "inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-md " +
  "bg-tuggi-secondary px-8 py-4 text-base font-semibold text-tuggi-dark shadow-sm " +
  "transition-colors hover:bg-tuggi-secondary-hover focus:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2";

export const BUTTON_SECONDARY =
  "inline-flex w-full min-h-[48px] items-center justify-center rounded-md border " +
  "border-tuggi-border bg-white px-4 py-3 text-base font-semibold text-tuggi-primary-text " +
  "transition-colors hover:bg-tuggi-bg focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2";

export const BUTTON_QUIET =
  "inline-flex min-h-[44px] items-center justify-center rounded-md px-3 py-2 text-base " +
  "font-semibold text-tuggi-primary-text underline underline-offset-2 focus:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2";

/** An inline link inside a sentence — the same treatment the landing page's policy link has. */
export const LINK_INLINE =
  "font-semibold text-tuggi-primary-text underline underline-offset-2";

/** Single column at any width, and a comfortable measure on a desktop. */
export const PAGE_SHELL = "mx-auto w-full max-w-xl px-4 pb-24 pt-10";

export const CARD = "rounded-3xl border border-tuggi-border bg-white p-6 sm:p-8 shadow-sm";

export const NOTE_BOX = "rounded-xl border border-tuggi-border bg-tuggi-bg p-4";

export const ALERT_BOX = "rounded-xl border border-tuggi-error p-4";
