/**
 * The route map — single source of truth for every public URL of the site.
 *
 * Decision (operator, 2026-08-06): a new or rewritten route has a **slug
 * translated per locale**, declared here. Legacy routes migrate as each one is
 * rewritten; there is no single migration. Everything that needs to know a URL
 * — the next-intl middleware, every internal `<Link>`, hreflang, the sitemap
 * and the 301s in next.config.ts — reads this map. Nobody writes a URL twice
 * (CLAUDE.md §6, SSOT).
 *
 * Three rules the entries follow:
 *
 *  - **Segment entries are derived from `SEGMENTS`, never typed here.** Adding
 *    a segment is one object in the registry, not a line in this file
 *    (DS-COMPONENTE-005). Only *published* segments enter the map: a reserved
 *    route has its word decided and no URL (spec §1.2).
 *  - **`/download` and `/d/[slug]` never translate**, and this is not a
 *    preference: `middleware.ts` rewrites them *before* next-intl,
 *    deliberately without a locale prefix, because the URL is printed on QR
 *    codes and lives in partner links. Translating the slug breaks physical
 *    material already handed out and drops commission attribution in silence
 *    (DS-COPY-006, edge case 1).
 *  - **A route with no page still 404s.** Declaring a word here does not
 *    publish anything; `/partners` is in the map and the hub does not exist
 *    yet. tests/e2e/routing.spec.ts asserts exactly that.
 *
 * Not translated yet, by cost and not by preference (spec §8.3 and §8.4):
 * `/tours` and its subtree (49 routes × 4 locales = 244 indexable URLs — its
 * own card, with its own measured 301s), `/drive`, `/purpose`, `/contact`,
 * `/coverage`, `/enterprise/fleets`, `/trust-center/*` and `/unsubscribe`.
 * The words for `/tours` are already decided in spec §8.4 so that card costs
 * zero decisions. `/enterprise/fleets` is the one that has a decided
 * destination (`/partners/car-rental`) and cannot move yet: that page does not
 * exist, and redirecting to it would trade a bad URL for a 404.
 */
import { LOCALES, type SiteLocale } from "./locales";
import { SEGMENTS, segmentPathname } from "../lib/segments";

/** An entry is either one slug for every locale, or a slug per locale. */
type PathnameEntry = string | Record<SiteLocale, string>;

/**
 * Routes whose public slug is the same in every locale.
 * Listed as data so the map below stays one object literal.
 */
const SHARED_SLUG_ROUTES = [
  "/",
  "/download",
  "/d/[slug]",
  "/drive",
  "/purpose",
  "/contact",
  "/coverage",
  "/unsubscribe",
  "/enterprise/fleets",
  "/tours",
  "/tours/[country]",
  "/tours/[country]/[slug]",
  "/tours/[country]/state/[state]",
  "/trust-center/terms-of-use",
  "/trust-center/privacy-policy",
  "/trust-center/accessibility",
  "/trust-center/data-deletion",
  "/trust-center/security-sla",
] as const;

const sharedSlugPathnames = Object.fromEntries(
  SHARED_SLUG_ROUTES.map((route) => [route, route])
) as Record<(typeof SHARED_SLUG_ROUTES)[number], string>;

/** Routes whose slug is translated. Words from spec §8.3. */
const TRANSLATED_ROUTES = {
  "/partners": {
    pt: "/parcerias",
    en: "/partners",
    es: "/alianzas",
    it: "/partner",
  },
  "/destinations": {
    pt: "/destinos",
    en: "/destinations",
    es: "/destinos",
    it: "/destinazioni",
  },
  "/technology": {
    pt: "/tecnologia",
    en: "/technology",
    es: "/tecnologia",
    it: "/tecnologia",
  },
} as const satisfies Record<string, Record<SiteLocale, string>>;

/**
 * The partnership proposal (#396) — the leaf only.
 *
 * It lives under the hub, so the four words above it are NOT retyped here: the
 * entry is composed from `TRANSLATED_ROUTES["/partners"]`, and renaming the hub
 * moves the proposal with it. `it` reuses `proposta` because that is the word
 * the Italian privacy policy already publishes, and `es` reuses `propuesta` for
 * the same reason.
 *
 * The static file `partners/proposal/page.tsx` wins over the dynamic
 * `partners/[segment]/page.tsx` in the App Router, so the route keeps resolving
 * after a segment is published — and none of the six segment slugs is one of
 * these words.
 *
 * Declared in four locales because this map is typed
 * `Record<SiteLocale, string>` and does not take half a route. The PAGE answers
 * in `pt` and redirects the other three, which is a different question — see
 * `src/lib/partner-proposal/link.ts`.
 */
const PROPOSAL_LEAF = {
  pt: "proposta",
  en: "proposal",
  es: "propuesta",
  it: "proposta",
} as const satisfies Record<SiteLocale, string>;

const proposalPathnames = {
  "/partners/proposal": Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      `${TRANSLATED_ROUTES["/partners"][locale]}/${PROPOSAL_LEAF[locale]}`,
    ])
  ) as Record<SiteLocale, string>,
};

/**
 * Segment routes, derived — never written by hand.
 *
 * A published segment's internal pathname (`/partners/car-rental`) matches the
 * dynamic file `src/app/[locale]/partners/[segment]/page.tsx`: next-intl
 * rewrites the localized pathname to the internal one and the App Router
 * resolves `[segment]` from it. That is why five segments with translated
 * slugs in four languages cost one page file, not five.
 */
export function buildSegmentPathnames(
  segments: readonly (typeof SEGMENTS)[number][]
): Record<string, Record<SiteLocale, string>> {
  return Object.fromEntries(
    segments
      .filter((segment) => segment.published)
      .map((segment) => [
        segmentPathname(segment.key),
        Object.fromEntries(
          LOCALES.map((locale) => [locale, `/${segment.slugs[locale]}`])
        ) as Record<SiteLocale, string>,
      ])
  );
}

export const pathnames = {
  ...sharedSlugPathnames,
  ...TRANSLATED_ROUTES,
  ...proposalPathnames,
  ...buildSegmentPathnames(SEGMENTS),
} satisfies Record<string, PathnameEntry>;

/** Every internal pathname the site declares. */
export type AppPathname = keyof typeof pathnames;

/**
 * The internal pathnames without a dynamic segment — the ones a `<Link>` can
 * take as a bare string, and the ones the sitemap lists.
 */
export type StaticAppPathname = Exclude<AppPathname, `${string}[${string}`>;

/** Normalizes "", "/", "drive" and "/drive/" to a single internal form. */
function normalizeInternal(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? `/${trimmed}` : "/";
}

function localizeEntry(entry: PathnameEntry, locale: string): string {
  if (typeof entry === "string") return entry;
  return (entry as Record<string, string>)[locale] ?? entry.en;
}

/**
 * Declared prefixes, longest first — used to localize a path whose *ancestor*
 * is translated but whose leaf is dynamic (a tour detail page, say). "/" is out
 * because it prefixes everything.
 */
const PREFIX_KEYS = (Object.keys(pathnames) as AppPathname[])
  .filter((key) => key !== "/" && !key.includes("["))
  .sort((a, b) => b.length - a.length);

/**
 * The public pathname of an internal pathname, for one locale.
 *
 * Falls back to the input when the route is not declared, which keeps every
 * caller that passes a built-at-runtime path (`/tours/portugal/<slug>`)
 * correct — those live under a route whose slug is not translated.
 *
 * @example
 *   localizedPathname("pt", "technology")           // "/tecnologia"
 *   localizedPathname("pt", "/destinations")        // "/destinos"
 *   localizedPathname("pt", "tours/portugal/x")     // "/tours/portugal/x"
 */
export function localizedPathname(locale: string, internalPathname: string): string {
  const path = normalizeInternal(internalPathname);

  const exact = (pathnames as Record<string, PathnameEntry>)[path];
  if (exact !== undefined) return localizeEntry(exact, locale);

  for (const key of PREFIX_KEYS) {
    if (path.startsWith(`${key}/`)) {
      const head = localizeEntry((pathnames as Record<string, PathnameEntry>)[key], locale);
      return `${head}${path.slice(key.length)}`;
    }
  }

  return path;
}

/**
 * Routes that moved, and are answered with a permanent redirect.
 *
 * `from` is the URL that is already indexed — the old, untranslated one.
 * `to` is the internal pathname it now lives at; the destination per locale is
 * derived from the map, so nobody writes a slug twice. next.config.ts turns
 * this into `redirects()`; the 301s are asserted in tests/e2e/routing.spec.ts.
 *
 * `/technology` keeps its internal name and only the *slug* moved, so `en` is
 * a no-op there and gets no redirect. `/enterprise/city-os` moved in all four.
 */
export const MOVED_ROUTES = [
  { from: "/technology", to: "/technology" },
  { from: "/enterprise/city-os", to: "/destinations" },
] as const satisfies readonly { from: string; to: StaticAppPathname }[];
