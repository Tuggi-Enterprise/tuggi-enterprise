import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Handle the partner download pages (/download and the friendly /d/<slug>)
  // separately so the shared URL stays locale-prefix-free — the QR code never
  // needs to embed a locale; the right language is resolved here per request.
  if (pathname === "/download" || pathname.startsWith("/d/")) {
    // 1. Check for explicit lang parameter
    const langParam = searchParams.get("lang");
    const languages = routing.locales;

    let locale = languages.includes(langParam as any) ? langParam : null;

    // 2. Fallback to cookie
    if (!locale) {
      locale = req.cookies.get('NEXT_LOCALE')?.value || null;
    }

    // 3. Fallback to Accept-Language or IP detection
    if (!locale || !languages.includes(locale as any)) {
      const country = req.headers.get("x-vercel-ip-country") || "";
      if (country === "BR") locale = "pt-br";
      else if (country === "PT") locale = "pt-pt";
      else if (["ES", "MX", "AR", "CO", "CL", "PE"].includes(country)) locale = "es";

      if (!locale) {
        const acceptLang = req.headers.get("accept-language") || "";
        if (acceptLang.includes("pt-BR") || acceptLang.includes("pt-br")) locale = "pt-br";
        else if (acceptLang.includes("pt-PT") || acceptLang.includes("pt-pt")) locale = "pt-pt";
        else if (acceptLang.includes("es")) locale = "es";
      }
    }

    // Default fallback
    locale = locale || routing.defaultLocale;

    // Internal rewrite to /[locale]/download or /[locale]/d/<slug>
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Step 1: Check for explicit locale in URL or cookies
  const hasLocale = routing.locales.some(
    (loc) => req.nextUrl.pathname.startsWith(`/${loc}/`) || req.nextUrl.pathname === `/${loc}`
  );
  
  if (!hasLocale && !req.cookies.has('NEXT_LOCALE')) {
    // Step 2: Implement user IP based detection 
    const country = req.headers.get("x-vercel-ip-country") || "";
    
    let ipLocale = null;
    if (country === "BR") ipLocale = "pt-br";
    else if (country === "PT") ipLocale = "pt-pt";
    else if (["ES", "MX", "AR", "CO", "CL", "PE"].includes(country)) ipLocale = "es";
    
    if (ipLocale) {
      req.headers.set('accept-language', ipLocale);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(en|es|pt-br|pt-pt)/:path*", "/download", "/d/:path*"],
};
