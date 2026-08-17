/**
 * Where the partnership proposal lives, and in which language it answers.
 *
 * ONE ADDRESS FOR EVERY ESTABLISHMENT, with no token in it (operator, 2026-08-16): the same
 * link is sent to everybody and, from #396, it is also reachable from the partnership landing
 * page. What keeps one establishment from being registered twice is the CNPJ, checked on
 * submission. Nothing here is a credential, so nothing here needs to be secret.
 *
 * THE SURFACE IS PINNED TO `pt`, and that is a product fact rather than a translation backlog.
 * The proposal asks for a CNPJ with a check digit, a Brazilian UF and an eight-digit CEP
 * (`schema.ts`), so an establishment reading the site in Italian cannot finish it. The page
 * therefore serves `pt` and redirects the other three, and the bridge on the landing page only
 * renders where the destination can be completed — the régua is `DS-COMPONENTE-026` of
 * `docs/design/spec-move-proposta-parceria-para-o-site-2026-08.md`, §6.
 *
 * Accepting an establishment outside Brazil is scope, is the operator's, and would change the
 * fields before it changed the copy. Until then, translating the form would publish a door
 * nobody on the other side of it can walk through.
 */

import type { SiteLocale } from "@/i18n/locales";

/** The one locale this surface answers in. */
export const PROPOSAL_LOCALE = "pt" satisfies SiteLocale;

/**
 * The INTERNAL pathname, the key of `src/i18n/pathnames.ts`. Every `<Link>` and every redirect
 * uses this, and the four public slugs are resolved from the map — nobody writes a slug twice
 * (CLAUDE.md §6).
 */
export const PROPOSAL_ROUTE = "/partners/proposal";

/** Whether the proposal can be completed by somebody reading the site in this locale. */
export function proposalIsReachable(locale: string): boolean {
  return locale === PROPOSAL_LOCALE;
}
