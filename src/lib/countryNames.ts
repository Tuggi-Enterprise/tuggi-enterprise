/**
 * Country naming — and the whole file turns on one distinction: **a country's
 * identity is not the country's label.**
 *
 * The identity is English and never moves: it keys the snapshot
 * (`state_coverage_cache` carries ~200 of them), it is what the Natural Earth
 * TopoJSON is matched against, it is what the tours hub map is keyed by
 * (`getStateHubPaths` in lib/routes.ts), and it is what JSON-LD publishes. The
 * label is what a visitor reads, and it follows the language of the page.
 *
 * Conflating the two is a live defect, not a hypothetical: `groupCoverage` used
 * `getCountryDisplayName()` for both, so translating the text would have used a
 * translated string as the hub key and dropped every route link on /coverage
 * without an error anywhere (#215).
 *
 * Three questions, keyed differently on purpose:
 *
 *  - `getCountryDisplayName(label)` — the **identity**: a raw DB label cleaned
 *    up, still in English. Keys and structured data only.
 *  - `localizedCountryLabel(label, locale)` — the **label** for the same DB
 *    label, written in the page's language.
 *  - `localizedCountryName(countrySlug, locale, fallback)` — the label again,
 *    for the tour pages, which are keyed by the stable `countrySlug` the routes
 *    snapshot builds rather than by the DB label.
 */

/**
 * Raw DB country key → the canonical English name.
 *
 * This is the **identity**, not the display string: it is a key in
 * `getStateHubPaths`, the name JSON-LD's `areaServed` publishes, and the value
 * the TopoJSON layer matches. It stays in English on purpose and is never what
 * a visitor reads — that is `localizedCountryLabel`.
 */
export const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  "United States of America": "United States",
  "United Kingdom": "United Kingdom",
};

export function getCountryDisplayName(country: string): string {
  return COUNTRY_DISPLAY_NAMES[country] ?? country;
}

/**
 * DB country label → ISO 3166-1 alpha-2, the only input `Intl.DisplayNames`
 * accepts. Covers every country the coverage snapshot has active today; a new
 * one appearing there falls back to the English label instead of breaking the
 * page (#215).
 *
 * Keyed by the label and not by the slug because the coverage snapshot has no
 * slug — `state_coverage_cache` carries the label the database wrote, and
 * `countrySlugOf()` in scripts/update-routes.mjs derives its slugs from raw
 * country strings that are not always English ("Brasil" → `brazil`). The two
 * maps below therefore answer the same question from two keys that cannot be
 * derived from one another, which is why both exist.
 */
const COUNTRY_CODES_BY_LABEL: Record<string, string> = {
  "United States of America": "US",
  France: "FR",
  Canada: "CA",
  Italy: "IT",
  Spain: "ES",
  "United Kingdom": "GB",
  Brazil: "BR",
  Mexico: "MX",
  Argentina: "AR",
  Ireland: "IE",
  Peru: "PE",
  Chile: "CL",
  Colombia: "CO",
  Portugal: "PT",
  Venezuela: "VE",
  Ecuador: "EC",
  "Costa Rica": "CR",
  Nicaragua: "NI",
  Bolivia: "BO",
  Guatemala: "GT",
  Cuba: "CU",
  Honduras: "HN",
  "El Salvador": "SV",
  Paraguay: "PY",
  Panama: "PA",
  "Dominican Republic": "DO",
  Haiti: "HT",
  Uruguay: "UY",
  Switzerland: "CH",
  Belgium: "BE",
  Belize: "BZ",
  Jamaica: "JM",
  Guyana: "GY",
  Austria: "AT",
  Germany: "DE",
  Suriname: "SR",
  Morocco: "MA",
  Slovenia: "SI",
  Luxembourg: "LU",
};

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
 * The one place a code becomes a written name — both public helpers below go
 * through it, so "how do we write a country" has a single answer whichever key
 * the caller happens to hold.
 */
function writeCountry(
  code: string | undefined,
  locale: string,
  fallbackLabel: string
): string {
  const english = getCountryDisplayName(fallbackLabel);
  if (!code) return english;
  return displayNamesFor(locale)?.of(code) ?? english;
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
  return writeCountry(COUNTRY_CODES[countrySlug], locale, fallbackLabel);
}

/**
 * The same answer for callers that hold the DB label instead of the slug —
 * everything fed by `coverage-snapshot.json`: the country pills, the textual
 * alternative of the map, the share card's country panel.
 *
 * **Display only.** The return value changes with the locale, so it may never
 * be used as a key: `getCountryDisplayName()` is the identity (#215).
 */
export function localizedCountryLabel(country: string, locale: string): string {
  return writeCountry(COUNTRY_CODES_BY_LABEL[country], locale, country);
}
