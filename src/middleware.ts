import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Map a legacy Portuguese cookie/locale value to the unified "pt" site locale. */
function normalizeLocale(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === "pt-br" || value === "pt-pt") return "pt";
  return routing.locales.includes(value as never) ? value : null;
}

export default function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Handle the partner download pages (/download and the friendly /d/<slug>)
  // separately so the shared URL stays locale-prefix-free — the QR code never
  // needs to embed a locale; the right UI language is resolved here per request.
  // NOTE: the welcome AUDIO/TEXT dialect (pt-br vs pt-pt) is resolved separately
  // inside the page from geo/?lang (see src/lib/ptDialect.ts) — independent of
  // this unified UI locale.
  if (pathname === "/download" || pathname.startsWith("/d/")) {
    // 1. Explicit ?lang (legacy pt-br/pt-pt normalised to pt)
    let locale = normalizeLocale(searchParams.get("lang"));

    // 2. Fallback to cookie (legacy pt-br/pt-pt normalised to pt)
    if (!locale) locale = normalizeLocale(req.cookies.get("NEXT_LOCALE")?.value);

    // 3. Fallback to IP / Accept-Language
    if (!locale) {
      const country = req.headers.get("x-vercel-ip-country") || "";
      if (country === "BR" || country === "PT") locale = "pt";
      else if (country === "IT") locale = "it";
      else if (["ES", "MX", "AR", "CO", "CL", "PE"].includes(country)) locale = "es";

      if (!locale) {
        const acceptLang = req.headers.get("accept-language") || "";
        if (acceptLang.toLowerCase().includes("pt")) locale = "pt";
        else if (acceptLang.includes("it")) locale = "it";
        else if (acceptLang.includes("es")) locale = "es";
      }
    }

    locale = locale || routing.defaultLocale;

    // Internal rewrite to /[locale]/download or /[locale]/d/<slug>
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Step 1: explicit locale already in the URL?
  const hasLocale = routing.locales.some(
    (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
  );

  // Treat a legacy pt-br/pt-pt cookie as "no valid cookie" so detection re-runs
  // and resolves to the unified "pt".
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const hasValidCookie =
    !!cookieLocale && routing.locales.includes(cookieLocale as never);
  const legacyPtCookie = cookieLocale === "pt-br" || cookieLocale === "pt-pt";

  if (!hasLocale && (!hasValidCookie || legacyPtCookie)) {
    const country = req.headers.get("x-vercel-ip-country") || "";

    let ipLocale: string | null = null;
    if (legacyPtCookie || country === "BR" || country === "PT") ipLocale = "pt";
    else if (country === "IT") ipLocale = "it";
    else if (["ES", "MX", "AR", "CO", "CL", "PE"].includes(country)) ipLocale = "es";

    if (ipLocale) req.headers.set("accept-language", ipLocale);
  }

  return intlMiddleware(req);
}

export const config = {
  // Broad next-intl matcher: run on every page path EXCEPT api, Next internals
  // and files with an extension (sitemap.xml, robots.txt, llms.txt, images…).
  // This lets next-intl redirect un-prefixed URLs (e.g. /drive → /en/drive)
  // instead of 404'ing them — recovering old indexed links. /download and
  // /d/<slug> still hit the partner handling above first.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
