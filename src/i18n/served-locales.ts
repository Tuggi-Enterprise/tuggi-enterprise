/**
 * Which of the four languages a given route can actually be read in.
 *
 * The site serves `LOCALES` everywhere — except where a surface is pinned to one language by a
 * product fact rather than by a translation backlog. On such a route the locale switcher used to
 * offer four destinations and deliver one: clicking EN on the partnership proposal changed the
 * URL and landed back on `/pt/parcerias/proposta`, so three of the four controls were a no-op
 * with a flash of URL — which reads as a broken site (#403, and the same family as
 * `DS-COMPONENTE-026`: no path is offered where the destination does not exist).
 *
 * IT IS A PREDICATE AND NOT A LIST IN THE HEADER, deliberately. "Only `pt`" is reversible: it
 * hangs on whether the Tuggi accepts a partner outside Brazil (open question 96, with the
 * operator), and the day the answer changes, the proposal starts serving more languages. What
 * has to change then is `link.ts` — the module that owns the fact — and this map, which reads it.
 * A list of locales spelled out inside `GlobalHeader` would be a third copy of the same decision
 * and the one nobody would think to look at.
 */

import { LOCALES, type SiteLocale } from "./locales";
import { PROPOSAL_LOCALE, PROPOSAL_ROUTE } from "@/lib/partner-proposal/link";

/**
 * Keyed by INTERNAL pathname — the key of `src/i18n/pathnames.ts`, which is what
 * `usePathname()` from `@/i18n/routing` returns. Keying by the public slug would need one entry
 * per language for the same route, which is how the four slugs of one page start disagreeing.
 */
const SINGLE_LOCALE_ROUTES: Readonly<Record<string, readonly SiteLocale[]>> = {
  [PROPOSAL_ROUTE]: [PROPOSAL_LOCALE],
};

/** The languages this route can be finished in. Every route serves all four unless named above. */
export function localesServedOn(pathname: string): readonly SiteLocale[] {
  return SINGLE_LOCALE_ROUTES[pathname] ?? LOCALES;
}
