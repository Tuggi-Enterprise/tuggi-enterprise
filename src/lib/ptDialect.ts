import { getDbLang } from "@/lib/partner";

export interface WelcomeLangSignals {
  /** ?lang= query param (may be "pt-pt"/"pt-br" as an explicit dialect override). */
  langParam?: string | null;
  /** x-vercel-ip-country header (e.g. "PT", "BR"). */
  country?: string | null;
  /** accept-language header. */
  acceptLanguage?: string | null;
  /** NEXT_LOCALE cookie (may hold a legacy "pt-pt"/"pt-br" value). */
  cookie?: string | null;
}

/**
 * Resolves the DB language/dialect for the partner & download welcome AUDIO and
 * TEXT — decoupled from the unified "pt" UI locale.
 *
 * The site UI was unified into a single "pt", but the welcome experience must
 * still hit the user with the CORRECT Portuguese dialect (a visitor in Portugal
 * hears pt-pt, in Brazil pt-br). For non-Portuguese locales this is just the
 * normal locale→DB-lang mapping.
 */
export function resolveWelcomeLang(
  locale: string,
  s: WelcomeLangSignals = {}
): string {
  if (locale !== "pt") return getDbLang(locale);

  // Unified "pt" UI → pick the Portuguese dialect for the welcome audio/text.
  const lang = (s.langParam || "").toLowerCase();
  if (lang === "pt-pt" || lang === "pt-br") return lang;

  const cookie = (s.cookie || "").toLowerCase();
  if (cookie === "pt-pt" || cookie === "pt-br") return cookie;

  const country = (s.country || "").toUpperCase();
  if (country === "PT") return "pt-pt";
  if (country === "BR") return "pt-br";

  const al = (s.acceptLanguage || "").toLowerCase();
  if (al.includes("pt-pt")) return "pt-pt";
  if (al.includes("pt-br")) return "pt-br";

  // Any other origin browsing in pt → default to Tuggi's base dialect.
  return "pt-br";
}
