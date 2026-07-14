/**
 * Local price map for the Travel Passes, keyed by ISO country code.
 * Resolution order: exact country → regional (Latin America) fallback →
 * global fallback (US). Prices are informational (the store is the source of
 * truth); the card keeps the "price in the store" disclaimer regardless.
 */

export type PassKey = "d7" | "d30" | "annual";
export type PassPrices = Record<PassKey, number>;
export interface CountryPricing {
  currency: string;
  prices: PassPrices;
}

const GLOBAL_FALLBACK: CountryPricing = {
  currency: "USD",
  prices: { d7: 9.99, d30: 19.99, annual: 79.99 },
};

const PRICING: Record<string, CountryPricing> = {
  BR: { currency: "BRL", prices: { d7: 29.9, d30: 49.9, annual: 199.9 } },
  PT: { currency: "EUR", prices: { d7: 5.99, d30: 11.99, annual: 49.99 } },
  ES: { currency: "EUR", prices: { d7: 6.99, d30: 13.99, annual: 59.99 } },
  IT: { currency: "EUR", prices: { d7: 6.99, d30: 13.99, annual: 59.99 } },
  FR: { currency: "EUR", prices: { d7: 7.99, d30: 15.99, annual: 69.99 } },
  DE: { currency: "EUR", prices: { d7: 7.99, d30: 15.99, annual: 69.99 } },
  GB: { currency: "GBP", prices: { d7: 7.99, d30: 15.99, annual: 69.99 } },
  US: { currency: "USD", prices: { d7: 9.99, d30: 19.99, annual: 79.99 } },
  CA: { currency: "CAD", prices: { d7: 11.99, d30: 23.99, annual: 89.99 } },
  AU: { currency: "AUD", prices: { d7: 12.99, d30: 24.99, annual: 89.99 } },
  MX: { currency: "MXN", prices: { d7: 119, d30: 229, annual: 899 } },
  CL: { currency: "CLP", prices: { d7: 5900, d30: 11900, annual: 49900 } },
  UY: { currency: "USD", prices: { d7: 5.99, d30: 11.99, annual: 49.99 } },
  CO: { currency: "COP", prices: { d7: 19900, d30: 39900, annual: 159900 } },
  PE: { currency: "PEN", prices: { d7: 19.9, d30: 39.9, annual: 159.9 } },
  BO: { currency: "BOB", prices: { d7: 34.99, d30: 69.99, annual: 249.9 } },
  AR: { currency: "USD", prices: { d7: 3.99, d30: 7.99, annual: 39.99 } },
};

// Remaining Latin-American markets share a USD tier.
const LATAM_FALLBACK_COUNTRIES = new Set([
  "SV", "GT", "HN", "NI", "CR", "PA", "DO", "EC", "PY", "VE", "CU",
]);
const LATAM_FALLBACK: CountryPricing = {
  currency: "USD",
  prices: { d7: 4.99, d30: 9.99, annual: 39.99 },
};

export function resolvePricing(country?: string | null): CountryPricing {
  if (!country) return GLOBAL_FALLBACK;
  const cc = country.toUpperCase();
  if (PRICING[cc]) return PRICING[cc];
  if (LATAM_FALLBACK_COUNTRIES.has(cc)) return LATAM_FALLBACK;
  return GLOBAL_FALLBACK;
}

/**
 * Currency-format a price for the given page locale. Integer amounts (e.g.
 * CLP/COP/MXN) render without decimals; decimal amounts keep two.
 */
export function formatPrice(amount: number, currency: string, locale: string): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }
}
