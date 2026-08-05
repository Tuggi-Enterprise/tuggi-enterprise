import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import { getStorageHost, STORAGE_PUBLIC_PATH } from "./src/lib/storage";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Partner logos (core.clients.avatar_url) are the only remote images the site
// renders. next/image rejects every host absent from this allowlist with a 400,
// so the list is also the guard on a column an admin types by hand in the CMS.
// Host derived from SUPABASE_URL — see src/lib/storage.ts, which the runtime
// side reads too. Empty list when the env var is missing: no allowlist is the
// safe answer, and no partner logo renders (the fallback layout, already the
// common case).
const storageHost = getStorageHost();

const nextConfig: NextConfig = {
  /* config options here */
  // Lets a build opt out of the shared `.next/`. `next dev` and `next build`
  // both own that directory, so building while a dev server is up on 3000
  // swaps its chunks out mid-flight and nothing hydrates any more. The e2e
  // suite sets this (see playwright.config.ts); production leaves it unset.
  distDir: process.env.TUGGI_DIST_DIR || ".next",
  reactCompiler: false,
  images: {
    remotePatterns: storageHost
      ? [
          {
            protocol: "https",
            hostname: storageHost,
            // `search` stays unset (Next implies `**`) on purpose: a cache-busting
            // query on our own object must not turn a partner logo into a 400.
            pathname: `${STORAGE_PUBLIC_PATH}**`,
          },
        ]
      : [],
  },
  // 301 (Moved Permanently) redirects for old indexed URLs so SEO equity
  // transfers and nobody hits a 404. (Runs before the next-intl middleware.)
  async redirects() {
    // Legal pages moved under /trust-center/ — keep the old URLs alive (some
    // are linked from the App Store / Play Store listings).
    const LEGAL: [string, string][] = [
      ["terms-of-use", "trust-center/terms-of-use"],
      ["privacy-policy", "trust-center/privacy-policy"],
      ["accessibility", "trust-center/accessibility"],
      ["data-deletion", "trust-center/data-deletion"],
      ["security-sla", "trust-center/security-sla"],
      ["terms", "trust-center/terms-of-use"],
      ["privacy", "trust-center/privacy-policy"],
    ];

    return [
      // Unified Portuguese locale (pt-br / pt-pt → pt).
      { source: "/pt-br", destination: "/pt", statusCode: 301 },
      { source: "/pt-pt", destination: "/pt", statusCode: 301 },
      { source: "/pt-br/:path*", destination: "/pt/:path*", statusCode: 301 },
      { source: "/pt-pt/:path*", destination: "/pt/:path*", statusCode: 301 },

      // Old legal URLs → /trust-center/ (per-locale + un-prefixed → /en canonical).
      ...LEGAL.flatMap(([from, to]) => [
        {
          source: `/:locale(en|es|pt|it)/${from}`,
          destination: `/:locale/${to}`,
          statusCode: 301 as const,
        },
        { source: `/${from}`, destination: `/en/${to}`, statusCode: 301 as const },
      ]),
    ];
  },
};

export default withNextIntl(nextConfig);
