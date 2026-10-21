import { test, expect, type Locator } from "@playwright/test";
import { LOCALES } from "../../src/i18n/locales";
import { EXTERNAL_ROUTES, localizedPathname } from "../../src/i18n/pathnames";
import { PARTNER_PORTAL_URL } from "../../src/lib/partner-portal";
import { PROPOSAL_LOCALE, PROPOSAL_ROUTE } from "../../src/lib/partner-proposal/link";

/**
 * #990 — Partners is the Locais portal.
 *
 * BR-B2B-043 makes the portal (`tuggi-places`, at `PARTNER_PORTAL_URL`) the one door through
 * which an establishment registers and pays, and the site's partnership page was a detour in
 * front of it. So the page left: its four URLs answer 301 to the portal, the menu item opens
 * the portal in a new tab, and the sitemap stops asking Google to index it. The whole subtree
 * leaves with it, the proposal subroute (`/partners/proposal`) included.
 *
 * Every URL here is derived from the route map, never typed, so a renamed slug moves the test
 * with it (CLAUDE.md §6).
 */

const PORTAL = PARTNER_PORTAL_URL;
const HUB = "/partners";

/** Every public form of the old hub URL: the four prefixed slugs and their bare forms. */
function hubSources(): string[] {
  const slugs = LOCALES.map((locale) => [locale, localizedPathname(locale, HUB)] as const);
  return [
    ...slugs.map(([locale, slug]) => `/${locale}${slug}`),
    ...new Set(slugs.map(([, slug]) => slug)),
  ];
}

async function expectPortalLink(link: Locator, where: string) {
  await expect(link, `${where}: one Partners item`).toHaveCount(1);
  await expect(link, `${where}: href`).toHaveAttribute("href", PORTAL);
  await expect(link, `${where}: target`).toHaveAttribute("target", "_blank");
  await expect(link, `${where}: rel`).toHaveAttribute("rel", /\bnoopener\b/);
}

test.describe("BR-B2B-043 / #990 — the partnership page answers 301 to the Locais portal", () => {
  test("the registry still names /partners, and only it", () => {
    // A guard on the guard: if the entry left the registry, every loop below would iterate over
    // a URL nobody redirects any more and the 301s would quietly stop being asserted.
    expect(EXTERNAL_ROUTES.map(({ from, to }) => [from, to])).toEqual([[HUB, PORTAL]]);
  });

  for (const source of hubSources()) {
    test(`#990: ${source} answers 301 with the portal as location`, async ({ request }) => {
      const response = await request.get(source, { maxRedirects: 0 });
      expect(response.status(), `${source} must be a permanent redirect`).toBe(301);
      // Next serializes the absolute destination with the root slash; same URL either way.
      expect(new URL(response.headers()["location"]).href, source).toBe(new URL(PORTAL).href);
    });
  }

  test("#990: the proposal subroute leaves for the portal too", async ({ request }) => {
    const proposal = `/${PROPOSAL_LOCALE}${localizedPathname(PROPOSAL_LOCALE, PROPOSAL_ROUTE)}`;
    expect(proposal.startsWith(`/${PROPOSAL_LOCALE}${localizedPathname(PROPOSAL_LOCALE, HUB)}/`))
      .toBe(true);

    const response = await request.get(proposal, { maxRedirects: 0 });
    expect(response.status(), proposal).toBe(301);
    // Next writes the root of a `/:path*` destination with its trailing slash.
    expect(new URL(response.headers()["location"]).href, proposal).toBe(new URL(PORTAL).href);
  });

  test("#990: the sitemap lists none of the four hub URLs", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("<loc>");
    for (const locale of LOCALES) {
      const hub = `https://www.tuggi.app/${locale}${localizedPathname(locale, HUB)}`;
      // Closed on both sides: as a <loc> and as an hreflang alternate of another entry.
      expect(xml, `sitemap <loc> ${hub}`).not.toContain(`<loc>${hub}</loc>`);
      expect(xml, `sitemap alternate ${hub}`).not.toContain(`href="${hub}"`);
    }
  });
});

test.describe("#990 — the Partners menu item opens the portal in a new tab", () => {
  // One test per locale and width: four page loads in one test do not fit its time budget when
  // the whole suite shares the server.
  for (const locale of LOCALES) {
    test(`desktop, at 1440 px, in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}`);
      const link = page.locator('nav[data-nav-scope="desktop"] a[data-nav-item="navPartners"]');
      await expectPortalLink(link, `desktop ${locale}`);
      await expect(link).toBeVisible();
    });

    test(`mobile panel, at 390 px, in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}`);
      await page.locator("[data-menu-trigger]").click();
      const link = page.locator('nav[data-nav-scope="mobile"] a[data-nav-item="navPartners"]');
      await expectPortalLink(link, `mobile ${locale}`);
      await expect(link).toBeVisible();
    });
  }

  test("the new tab is announced, not only drawn", async ({ page }) => {
    // A link that opens another window without saying so moves a screen reader user out of the
    // site unannounced (WCAG technique G201). The words are `A11y.opensInNewTab`.
    await page.goto("/pt");
    const link = page.locator('nav[data-nav-scope="desktop"] a[data-nav-item="navPartners"]');
    await expect(link.locator(".sr-only")).toHaveText(/\S/);
  });
});
