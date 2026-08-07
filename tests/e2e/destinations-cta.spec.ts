import { test, expect } from "@playwright/test";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * /destinations (City OS, the B2G product page) used to end on
 * `CityOSIntelligence` — a title and a paragraph with no way out. The only
 * CTA on the page was the hero's, ~2,300px above the fold on a 390px phone.
 *
 * The fix repeats the hero's own CTA (`CityOS.Hero.cta`, same key, same
 * `<Link href="/contact">`) at the end of the last section — not new copy,
 * so this guard checks the two CTAs agree rather than pinning a string.
 */

const LOCALES = ["pt", "en", "es", "it"] as const;

function url(locale: string): string {
  return `/${locale}${localizedPathname(locale, "/destinations")}`;
}

test.describe("/destinations closes on a CTA, not a dead end", () => {
  for (const locale of LOCALES) {
    test(`/${locale}${localizedPathname(locale, "/destinations")}: the last section repeats the hero's CTA`, async ({
      page,
    }) => {
      const response = await page.goto(url(locale));
      expect(response?.status()).toBe(200);

      const contactPath = `/${locale}${localizedPathname(locale, "/contact")}`;
      // Scoped to `main`: the global footer (FatFooter.tsx) always carries
      // its own "/contact" nav link, on every page — not part of what this
      // guard checks.
      const ctaLinks = page.locator(`main a[href="${contactPath}"]`);

      // Hero + closing section. Not "at least one": a page with only the
      // hero's CTA is the exact regression this guard exists to catch.
      await expect(ctaLinks).toHaveCount(2);

      const [heroText, closingText] = await ctaLinks.allTextContents();
      expect(closingText.trim()).toBe(heroText.trim());

      // The closing CTA is the last interactive element a reader scrolling
      // to the end of the page finds — not buried above a section that
      // still has no way out.
      const lastSection = page.locator("main section").last();
      await expect(lastSection.locator(`a[href="${contactPath}"]`)).toHaveCount(1);
    });
  }
});
