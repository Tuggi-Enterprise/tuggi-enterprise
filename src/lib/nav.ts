/**
 * The main menu, as data.
 *
 * Spec: docs/design/spec-template-segmento-2026-08.md §8. Six flat items, in
 * this order, and the "Plataforma" grouper is gone: it opened on
 * `onMouseEnter` (which does not exist on touch, so it opened by itself while
 * scrolling) and it hid three destinations behind an abstract label.
 *
 * The list lives here rather than inside GlobalHeader because the header
 * renders it twice — the desktop row and the mobile panel — and those two used
 * to be two different menus, with different contents, on the same site: the
 * desktop had a dropdown of three and no Contact, the panel had seven flat
 * items including Contact. One registry, two presentations (§8.5).
 *
 * Contact is deliberately not here. It lives in the CTA of each partner page
 * and in the footer (§8.6): the header CTA is "Download app", which is the
 * traveller; contact is the partner, and he arrives through Partners.
 */
import type { StaticAppPathname } from "@/i18n/pathnames";

/**
 * The partners hub (`/partners`). True since #195: the page and its copy in
 * the four locales landed together, and the item is the first of the menu.
 *
 * The flag stays because it is half of a pair. `src/app/[locale]/partners/
 * page.tsx` is the other half, and tests/e2e/routing.spec.ts fails if the two
 * disagree in either direction: the flag alone puts a 404 in the menu, the
 * page alone leaves a published page nobody can navigate to.
 */
export const PARTNERS_HUB_PUBLISHED = true;

export type NavItem = {
  /** Key inside the `Header` i18n namespace. */
  labelKey: string;
  /** Internal pathname; the public slug per locale comes from the route map. */
  href: StaticAppPathname;
  /** False while the destination has no page. */
  published: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { labelKey: "navPartners", href: "/partners", published: PARTNERS_HUB_PUBLISHED },
  { labelKey: "navDestinations", href: "/destinations", published: true },
  { labelKey: "navTech", href: "/technology", published: true },
  // "Plans" is the visible label and has been for a while; the slug is still
  // /drive and moves in its own card, with its own 301s (spec §8.3).
  { labelKey: "navPlans", href: "/drive", published: true },
  { labelKey: "navAudioGuides", href: "/tours", published: true },
  { labelKey: "navPurpose", href: "/purpose", published: true },
];

/** What the header actually renders, desktop and mobile alike. */
export const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.published);
