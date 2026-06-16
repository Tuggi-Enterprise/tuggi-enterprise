import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
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
