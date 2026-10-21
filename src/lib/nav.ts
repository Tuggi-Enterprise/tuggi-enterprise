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
 * traveller; contact is the partner, and he arrives through Partners, which is the Locais
 * portal since #990.
 */
import type { StaticAppPathname } from "@/i18n/pathnames";
import { PARTNER_PORTAL_URL } from "@/lib/partner-portal";

/** A destination that is another product, not a page of this site. */
export type ExternalHref = `https://${string}`;

export type NavItem = {
  /** Key inside the `Header` i18n namespace. */
  labelKey: string;
  /**
   * Internal pathname, whose public slug per locale comes from the route map, or the absolute
   * URL of another product, which the header opens in a new tab.
   */
  href: StaticAppPathname | ExternalHref;
  /** False while the destination has no page. */
  published: boolean;
};

/** Whether a menu destination lives outside the site. */
export function isExternalHref(href: NavItem["href"]): href is ExternalHref {
  return href.startsWith("https://");
}

export const NAV_ITEMS: readonly NavItem[] = [
  // Partners is the Locais portal since #990: the site's own partnership page is gone and its
  // URLs answer 301 there (`EXTERNAL_ROUTES` in src/i18n/pathnames.ts).
  { labelKey: "navPartners", href: PARTNER_PORTAL_URL, published: true },
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

/**
 * The three destinations the rail of an editorial article carries —
 * `DS-COMPONENTE-059`, in this order.
 *
 * They answer the sequence a reader who just finished a piece about the product
 * is in: what it is (`/tours`), where it works (`/destinations`) and what it
 * costs (`/drive`). `/partners` is another audience, `/purpose` answers "why"
 * and is not a decision, and `/technology` answers "how" — which is what the
 * article just did, so sending the reader there is sending them to re-read.
 *
 * Derived from `VISIBLE_NAV_ITEMS` and never typed out, which is the whole
 * point: the label of a rail link is the `Header.nav*` the menu already
 * publishes, so the site cannot end up with two names for the same place, and a
 * destination unpublished in `NAV_ITEMS` disappears from both at once. Two links
 * is a valid rail; zero means the page stopped being a candidate for
 * `DS-LAYOUT-013`.
 *
 * The order is the one of this list, not the one of the menu: the menu is
 * ordered by the site's own hierarchy and the rail by the reader's decision.
 */
const ARTICLE_RAIL_HREFS: readonly StaticAppPathname[] = ["/tours", "/destinations", "/drive"];

export const ARTICLE_RAIL_ITEMS: readonly (NavItem & { href: StaticAppPathname })[] =
  ARTICLE_RAIL_HREFS.map((href) => VISIBLE_NAV_ITEMS.find((item) => item.href === href)).filter(
    (item): item is NavItem & { href: StaticAppPathname } =>
      item !== undefined && !isExternalHref(item.href)
  );
