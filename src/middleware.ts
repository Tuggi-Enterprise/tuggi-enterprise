import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { countryOf } from "./lib/territory";
import { PUBLIC_NAME_HEADER } from "./lib/public-page-header";

const intlMiddleware = createMiddleware(routing);

/** Map a legacy Portuguese cookie/locale value to the unified "pt" site locale. */
function normalizeLocale(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === "pt-br" || value === "pt-pt") return "pt";
  return routing.locales.includes(value as never) ? value : null;
}

/**
 * The UI language of a locale-free shared URL (`/@nome`, `/d/<slug>`, `/c/`,
 * `/r/`…): `?lang`, then the cookie, then where the visitor is, then the
 * browser. The QR and the link never carry a locale.
 */
function visitorLocale(req: NextRequest): string {
  // 1. Explicit ?lang (legacy pt-br/pt-pt normalised to pt)
  let locale = normalizeLocale(req.nextUrl.searchParams.get("lang"));

  // 2. Fallback to cookie (legacy pt-br/pt-pt normalised to pt)
  if (!locale) locale = normalizeLocale(req.cookies.get("NEXT_LOCALE")?.value);

  // 3. Fallback to IP / Accept-Language. `countryOf` is the one reader of
  // where the visitor is, on Vercel and on the Cloudflare Worker alike.
  if (!locale) {
    const country = countryOf(req.headers) ?? "";
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

  return locale || routing.defaultLocale;
}

/**
 * The partner page (BR-B2B-037, BR-B2B-067). `tuggi.app/@nome` is the address;
 * the page lives at `/[locale]/at/[name]` because a folder named `@x` is a
 * parallel-route slot to Next. The internal path is not a third entry: asked
 * for directly, it answers a permanent redirect to `/@nome`.
 */
const PUBLIC_PAGE_PREFIX = /^\/(?:@|%40)/i;
const PUBLIC_PAGE_INTERNAL = new RegExp(`^/(?:(?:${routing.locales.join("|")})/)?at/([^/]+)/?$`);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PAGE_PREFIX.test(pathname)) {
    const rest = pathname.replace(PUBLIC_PAGE_PREFIX, "");
    const url = req.nextUrl.clone();
    url.pathname = `/${visitorLocale(req)}/at/${rest}`;
    const headers = new Headers(req.headers);
    headers.set(PUBLIC_NAME_HEADER, rest.split("/")[0].slice(0, 64));
    return NextResponse.rewrite(url, { request: { headers } });
  }

  const internal = PUBLIC_PAGE_INTERNAL.exec(pathname);
  if (internal) {
    const url = req.nextUrl.clone();
    url.pathname = `/@${internal[1]}`;
    return NextResponse.redirect(url, 308);
  }

  // Handle the partner download pages (/download and the friendly /d/<slug>)
  // separately so the shared URL stays locale-prefix-free — the QR code never
  // needs to embed a locale; the right UI language is resolved here per request.
  // NOTE: the welcome AUDIO/TEXT dialect (pt-br vs pt-pt) is resolved separately
  // inside the page from geo/?lang (see src/lib/ptDialect.ts) — independent of
  // this unified UI locale.
  //
  // The invite link of the referral programme (/c/<code>, card #840) takes the
  // same path for the same reason: it is typed once into a share sheet and
  // opened by a friend in any language.
  //
  // The route link (/r/<slug>, card #946) and the /route/<uuid> the app shared
  // before it: printed on a hotel's QR card, read in any language.
  if (
    pathname === "/download" ||
    pathname.startsWith("/d/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/route/")
  ) {
    const locale = visitorLocale(req);

    // Internal rewrite to /[locale]/download, /[locale]/d/<slug>, /[locale]/c/<code>,
    // /[locale]/r/<slug> or /[locale]/route/<id>
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
    const country = countryOf(req.headers) ?? "";

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
  // `/c/:path*` on its own: an @ may carry a dot (`/c/@joao.silva`,
  // BR-USUARIO-050 item 1.b), which the first pattern reads as a file.
  // The partner page for the same reason: `/@joao.silva` and the same name
  // after `/d/` (BR-B2B-067), plus its internal path, which redirects. A
  // `/@:path*` pattern never matched; the group form does.
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/c/:path*",
    "/d/:path*",
    "/(@.*)",
    "/(%40.*)",
    "/:locale/at/:path*",
  ],
};
