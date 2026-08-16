/**
 * The published price of the three hour passes — BR-MONETIZACAO-069.
 *
 * A number is published only where it is a **base price we set ourselves**: the
 * three base markets of BR-MONETIZACAO-048 — BRL, USD and EUR. Everywhere else
 * `resolvePricing` returns `null`, and the card sends the visitor to the store
 * without a number. That absence is the rule, not a gap to fill.
 *
 * Why there is no fallback, and why there can never be one again
 * ---------------------------------------------------------------------------
 * This file used to hold eighteen territories with a cascade — exact country →
 * Latin America → the US tier. Thirteen of those amounts were written by hand and
 * never checked against either store, and the cascade published the US price to
 * every country with no entry. A published price is a binding offer (CDC art.
 * 30), and the two stores already charge different amounts from each other in
 * the same territory: Apple re-prices on tax and FX moves on its own ("Apple
 * will never change the price in your base country or region" — App Store
 * Connect, *Set a price*), while Play freezes the rate of the day the price was
 * set until the operator clicks *Update exchange rates*. Any conversion of ours
 * would be a third number, wrong in both stores at once.
 *
 * So: three zones, an explicit country list, and `null` for the rest.
 * `resolvePricing(undefined)` is `null` as well — "I do not know where you are"
 * is never a base market (`/api/geo` and `useGeoPricing` carry the same rule).
 */

/** The catalogue of BR-MONETIZACAO-048, named by hours. The GA `pass` dimension
 *  of `DrivePricing` reads the same three strings — one vocabulary, not two. */
export type PassKey = "10h" | "25h" | "45h";
export type PassPrices = Record<PassKey, number>;
export interface BaseMarketPricing {
  currency: string;
  prices: PassPrices;
}

/** The table of BR-MONETIZACAO-048, verbatim. Changing a number here changes
 *  what the site charges people to believe: it is the rule's copy, and
 *  tests/e2e/base-market-price.spec.ts holds an independent one beside it. */
const BRAZIL: BaseMarketPricing = {
  currency: "BRL",
  prices: { "10h": 9.9, "25h": 19.9, "45h": 29.9 },
};
const UNITED_STATES: BaseMarketPricing = {
  currency: "USD",
  prices: { "10h": 2.99, "25h": 5.99, "45h": 9.99 },
};
const EURO_AREA: BaseMarketPricing = {
  currency: "EUR",
  prices: { "10h": 2.99, "25h": 5.99, "45h": 9.99 },
};

/**
 * The euro area, written out and not inferred: "Europe" is not a currency, and
 * a visitor in Switzerland, the UK, Norway, Poland or Sweden pays in something
 * else. The 21 member states of the euro area, ECB, *The euro area* (checked
 * 2026-08-16) — Bulgaria adopted the euro on 2026-01-01, Croatia in 2023.
 *
 * Deliberately absent: Andorra, Monaco, San Marino and Vatican City (euro by
 * monetary agreement) and Montenegro and Kosovo (euro unilaterally). They spend
 * euros, but we never set a base price for them, and BR-MONETIZACAO-069 lets us
 * publish only what we set. Omitting a territory shows the store note; adding
 * one wrongly publishes an offer — the two mistakes do not cost the same.
 */
const EURO_AREA_COUNTRIES = new Set([
  "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR",
  "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

/**
 * The base market for a two-letter ISO 3166-1 alpha-2 code, or `null` when
 * there is none — including for a missing, empty or malformed code.
 */
export function resolvePricing(country?: string | null): BaseMarketPricing | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  if (code === "BR") return BRAZIL;
  if (code === "US") return UNITED_STATES;
  if (EURO_AREA_COUNTRIES.has(code)) return EURO_AREA;
  return null;
}

/**
 * Currency-format an amount for the page locale. `Intl` and not string
 * concatenation: "R$ " + value is wrong in `en` (R$9.90) and in `es`/`it`
 * (9,90 BRL, with the ISO code, which is correct there) — and the assistive
 * technology reads the currency from the format, not from a glued prefix.
 *
 * Two decimals always: every amount in the three base markets has them, and a
 * price that renders "R$ 10" for 9.9 would be a different offer.
 */
export function formatPrice(amount: number, currency: string, locale: string): string {
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  try {
    return new Intl.NumberFormat(locale, options).format(amount);
  } catch {
    // An unknown locale throws a RangeError, and a throw inside render blanks
    // the section. English is a format, not a price change.
    return new Intl.NumberFormat("en", options).format(amount);
  }
}
