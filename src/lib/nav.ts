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
import type { AppPathname, StaticAppPathname } from "@/i18n/pathnames";
import { TUGGI_CLIENT_SLUG } from "@/lib/app-meta";

/**
 * Where the chrome's "Download app" CTA goes — the header (three renderings)
 * and the footer.
 *
 * The Tuggi landing, not the bare `/download`. Two reasons, and neither is
 * cosmetic (decision: Tech Lead, 2026-08-07):
 *
 *  - `/d/tuggi` plays our own welcome audio; `/download` with no query plays
 *    nothing. That is the point of sending the visitor there, and it is the
 *    same call `AppDownloadButton` already made for its desktop fallback.
 *  - It resolves the internal Tuggi client, which is a row in `core.clients`
 *    but not a partner: `isAttributablePartnerId` returns false for it by
 *    name, so nothing is credited and no commission moves. Stamping it is
 *    what "organic" means here — see src/lib/app-meta.ts.
 *
 * `/download` stays up, untouched and un-redirected: it is the URL printed on
 * QR codes and living in partner links, and it resolves a partner from `?ID=`
 * (DS-COPY-006, edge case 1). Changing it drops commission in silence.
 */
export const DOWNLOAD_CTA_HREF = {
  pathname: "/d/[slug]",
  params: { slug: TUGGI_CLIENT_SLUG },
} as const satisfies { pathname: AppPathname; params: Record<string, string> };

/**
 * Every rendering of that CTA, by its `data-download-cta` value. The chrome
 * draws the same call four times — the header at two breakpoints, the mobile
 * drawer, and the footer — and all four used to point at `/download` because
 * each was written by hand.
 *
 * tests/e2e/routing.spec.ts walks this list and pins the destination of each,
 * so a fifth CTA added without an entry fails rather than quietly shipping the
 * wrong URL. The anchor is the attribute and not the visible label, which is
 * copy and moves.
 */
export const DOWNLOAD_CTA_SCOPES = [
  "header-desktop",
  "header-compact",
  "header-drawer",
  "footer",
] as const;

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
