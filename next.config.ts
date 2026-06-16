import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  // The pt-br / pt-pt site locales were unified into a single "pt". Permanently
  // redirect any old indexed URLs so SEO equity transfers and nobody hits a 404.
  // (Runs before the next-intl middleware.)
  async redirects() {
    return [
      { source: "/pt-br", destination: "/pt", permanent: true },
      { source: "/pt-pt", destination: "/pt", permanent: true },
      { source: "/pt-br/:path*", destination: "/pt/:path*", permanent: true },
      { source: "/pt-pt/:path*", destination: "/pt/:path*", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
