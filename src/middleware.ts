import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  // Step 1: Check for explicit locale in URL or cookies
  const hasLocale = routing.locales.some(
    (loc) => req.nextUrl.pathname.startsWith(`/${loc}/`) || req.nextUrl.pathname === `/${loc}`
  );
  
  if (!hasLocale && !req.cookies.has('NEXT_LOCALE')) {
    // Step 2: Implement user IP based detection 
    // Fallback if Vercel `x-vercel-ip-country` is not present will rely on Accept-Language inside intlMiddleware
    const country = req.headers.get("x-vercel-ip-country") || "";
    
    let ipLocale = null;
    if (country === "BR") ipLocale = "pt-br";
    else if (country === "PT") ipLocale = "pt-pt";
    else if (["ES", "MX", "AR", "CO", "CL", "PE"].includes(country)) ipLocale = "es";
    
    if (ipLocale) {
      // If we found a matching IP locale, we can rewrite the request or let next-intl handle it
      // The easiest way is to inject an override so next-intl respects it as default
      req.headers.set('accept-language', ipLocale);
    }
  }

  // Next-intl automatically reads the modified headers / negotiated accept-language
  return intlMiddleware(req);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ["/", "/(en|es|pt-br|pt-pt)/:path*"],
};
