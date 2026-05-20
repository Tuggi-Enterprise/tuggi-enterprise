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
