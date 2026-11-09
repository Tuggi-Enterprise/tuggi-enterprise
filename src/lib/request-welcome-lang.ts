import { cookies, headers } from "next/headers";
import { resolveWelcomeLang } from "@/lib/ptDialect";
import { countryOf } from "@/lib/territory";

/**
 * The database language (`pt-br`, `pt-pt`, `en-us`…) of the partner page for
 * this request, from geo, `?lang` and the cookie, decoupled from the unified
 * "pt" UI locale: a visitor in Portugal hears pt-pt and in Brazil pt-br even
 * though the UI is a single "pt". `/d/{slug}` and `/@nome` read it here, so the
 * welcome audio, the featured route and its stop speak the same language.
 */
export async function requestWelcomeLang(locale: string, langParam?: string | null): Promise<string> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return resolveWelcomeLang(locale, {
    langParam,
    country: countryOf(h),
    acceptLanguage: h.get("accept-language"),
    cookie: c.get("NEXT_LOCALE")?.value,
  });
}
