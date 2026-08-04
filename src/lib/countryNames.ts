/**
 * Country naming.
 *
 * Two different questions live here, keyed differently on purpose:
 *
 *  - `getCountryDisplayName(label)` cleans up a raw DB country label for the
 *    coverage tree, which is keyed by the label itself (`state_coverage_cache`
 *    carries ~200 of them, in English).
 *  - `localizedCountryName(countrySlug, locale, fallback)` answers "how do we
 *    write this country in the page's language?" for the tour pages, which are
 *    keyed by the stable `countrySlug` the snapshot builds.
 */

/**
 * Country display name overrides.
 * Maps internal/DB country keys (used in snapshot) to clean display names.
 * Intentionally NOT in i18n — country names in English are universally understood
 * and are also used in server-side JSON-LD structured data.
 */
export const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  "United States of America": "United States",
  "United Kingdom": "United Kingdom",
};

export function getCountryDisplayName(country: string): string {
  return COUNTRY_DISPLAY_NAMES[country] ?? country;
}

/**
 * countrySlug → ISO 3166-1 alpha-2, the only input `Intl.DisplayNames` accepts.
 *
 * Deliberately derived from the slug instead of stored in the snapshot: the
 * country identity is already the slug, and a second copy of the same fact is
 * a second thing to keep in sync. Covers exactly the countries that
 * `countrySlugOf()` in scripts/update-routes.mjs knows how to produce.
 */
const COUNTRY_CODES: Record<string, string> = {
  brazil: "BR",
  france: "FR",
  italy: "IT",
  portugal: "PT",
  spain: "ES",
  "united-kingdom": "GB",
  "united-states": "US",
};

/**
 * ISO code for a country slug, or null when we have none mapped.
 *
 * Callers use it to look up the `Tours.countryIn.<CODE>` phrase — "no Brasil",
 * "negli Stati Uniti". Portuguese and Italian contract the preposition with the
 * country's article, so the phrase has to be translated as a whole; gluing a
 * preposition onto a name in code produces "em Brasil".
 */
export function countryCodeOf(countrySlug: string): string | null {
  return COUNTRY_CODES[countrySlug] ?? null;
}

/** One `Intl.DisplayNames` per locale — SSG calls this once per route/locale. */
const displayNamesByLocale = new Map<string, Intl.DisplayNames>();

function displayNamesFor(locale: string): Intl.DisplayNames | null {
  const cached = displayNamesByLocale.get(locale);
  if (cached) return cached;
  try {
    // `fallback: "none"` makes an unknown code return undefined instead of the
    // code itself, so we can fall back to the DB label rather than print "BR".
    const dn = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
    displayNamesByLocale.set(locale, dn);
    return dn;
  } catch {
    return null;
  }
}

/**
 * Country name written in the page's language — "Brasil" on a pt page,
 * "Brasile" on it, "Brazil" on en.
 *
 * Falls back to the raw DB label when the slug has no ISO code mapped, so a new
 * country appearing in the snapshot degrades to today's behaviour instead of
 * breaking the page.
 */
export function localizedCountryName(
  countrySlug: string,
  locale: string,
  fallbackLabel: string
): string {
  const code = COUNTRY_CODES[countrySlug];
  if (!code) return getCountryDisplayName(fallbackLabel);
  return displayNamesFor(locale)?.of(code) ?? getCountryDisplayName(fallbackLabel);
}
