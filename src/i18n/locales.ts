/**
 * The interface locales of the site — BR-IDIOMA-001 item 3.
 *
 * Declared here, and nowhere else, because three modules need the list and one
 * of them (next.config.ts) cannot import `routing.ts`: that file pulls in
 * next-intl's navigation factory, which pulls in React. Everything in this
 * module is plain data with no dependency.
 */
export const LOCALES = ["en", "es", "pt", "it"] as const;

export type SiteLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: SiteLocale = "en";
