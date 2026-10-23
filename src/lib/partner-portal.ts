/**
 * Where a business that wants to partner with Tuggi goes: the Locais portal (`tuggi-places`).
 *
 * Since #990 the site has no partnership page of its own. The menu item and the 301 of the old
 * `/partners` URLs, the proposal under them included, point here, because the portal is the
 * one door through which an establishment registers and pays (BR-B2B-043). The portal
 * writes the same origin in `tuggi-places` `src/lib/portal-origin.ts` `PORTAL_ORIGIN`; the
 * contract is `docs/contracts/places-cms.md`, section on the portal domain.
 *
 * Import-free on purpose: `next.config.ts` reads it through `src/i18n/pathnames.ts`.
 */
export const PARTNER_PORTAL_URL = "https://partner.tuggi.app";
