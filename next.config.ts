import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  // The pt-br / pt-pt site locales were unified into a single "pt". Redirect any
  // old indexed URLs with an explicit 301 (Moved Permanently) so SEO equity
  // transfers and nobody hits a 404. (Runs before the next-intl middleware.)
  async redirects() {
    return [
      { source: "/pt-br", destination: "/pt", statusCode: 301 },
      { source: "/pt-pt", destination: "/pt", statusCode: 301 },
      { source: "/pt-br/:path*", destination: "/pt/:path*", statusCode: 301 },
      { source: "/pt-pt/:path*", destination: "/pt/:path*", statusCode: 301 },
    ];
  },
};

export default withNextIntl(nextConfig);
