import { SITE_URL, APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";

// /llms.txt — an LLM-friendly map of the site (https://llmstxt.org/).
// English, locale-prefixed canonical links (the site serves localePrefix="always").
export const dynamic = "force-static";

export function GET() {
  const body = `# TUGGI

> TUGGI is a self-guided audio travel guide app (iOS & Android). Audio stories about the places around you trigger automatically by GPS as you drive, walk, or cycle — hands-free, screen-off, and fully offline. Free to start, available in 8+ languages with synchronized closed captions.

Key facts:
- Category: travel app / self-guided audio tours / cultural audio guide
- Platforms: iOS and Android — free to download, optional Travel Passes (7-day, 30-day, annual)
- Works offline; audio triggers automatically by location; 8+ languages with captions
- Not a navigation app — it runs alongside your GPS and music and narrates the places you pass
- App Store: ${APP_STORE_URL}
- Google Play: ${PLAY_STORE_URL}

## Main pages
- [Home](${SITE_URL}/en): What TUGGI is and how it works
- [Download / Drive](${SITE_URL}/en/drive): Features, pricing, FAQ, and app download
- [Global Coverage](${SITE_URL}/en/coverage): Countries and number of attractions covered (live stats)
- [Technology](${SITE_URL}/en/technology): How the location-triggered audio engine works
- [Purpose](${SITE_URL}/en/purpose): Mission and accessibility

## For businesses
- [City-OS](${SITE_URL}/en/enterprise/city-os): For cities and tourism boards
- [Fleets](${SITE_URL}/en/enterprise/fleets): For car-rental and mobility fleets
- [Contact](${SITE_URL}/en/contact): Talk to the team

## Trust & legal
- [Privacy Policy](${SITE_URL}/en/trust-center/privacy-policy)
- [Terms of Use](${SITE_URL}/en/trust-center/terms-of-use)
- [Accessibility](${SITE_URL}/en/trust-center/accessibility)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
