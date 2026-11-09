import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * What /d/<slug> keeps across its layouts (see ClientPartnerPage.tsx):
 *
 *   - a hotel or a restaurant → the frame of the one partner page
 *     (DS-COMPONENTE-110, mockup w02), proved block by block in
 *     partner-public-page.spec.ts. Here: the trade name, and no horizontal
 *     overflow at the phone widths.
 *   - a coupon → the download layout with its floating CTA, which has to
 *     stay clear of the cookie banner.
 *
 * Runs against a local production build (`npm run build && npm run start`,
 * wired by playwright.config.ts) talking to the mock PostgREST double in
 * mock-supabase-server.mjs — never the real Supabase project.
 *
 * Fixture slugs (see mock-supabase-server.mjs):
 *   /d/e2e-sem-logo  — a partner with no avatar_url.
 *   /d/e2e-com-logo  — the same partner, with an avatar_url, contacts and audio.
 * Both use the festival's real name ("Delícias do Vale do Café") so the
 * overflow checks exercise the actual long name that triggered this task.
 */

const NO_LOGO_PATH = "/d/e2e-sem-logo";
const WITH_LOGO_PATH = "/d/e2e-com-logo";
/** A partner's coupon: the page that keeps the download layout and its floating CTA (DS-COMPONENTE-110, edge case). */
const COUPON_PATH = "/d/E2EPARCEIRO?lang=en";

/** The fixture whose trade name and legal name disagree (mock-supabase-server.mjs). */
const TRADE_NAME_PATH = "/d/e2e-nome-fantasia";
const TRADE_NAME = "Cozi +";
const LEGAL_NAME = "Cozimais Restaurante e Café";

/**
 * The lockup's entrance is a framer-motion fade/slide, and each <img> inside
 * resolves (loads or errors) asynchronously — both settle a beat after the
 * element becomes visible. Screenshot/bounding-box assertions taken before
 * that settles are flaky (Playwright's own "two consecutive stable
 * screenshots" retry loop caught this during authoring: the seal's <img>
 * box kept shifting between its pending and final size while the browser
 * was still resolving its src).
 */
async function waitForLockup(page: Page) {
  const lockup = page.locator('img[alt="Tuggi"]').locator("..");
  await expect(lockup).toBeVisible();
  await expect(lockup).toHaveCSS("opacity", "1");
  await lockup.locator("img").evaluateAll((imgs) =>
    Promise.all(
      imgs.map((img) =>
        (img as HTMLImageElement).complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
      )
    )
  );
  return lockup;
}

test.describe("the partner page names the place", () => {
  test("shows the trade name, never the legal name", async ({ page }) => {
    // `partner.clients` carries both: `name` is the trade name (what is on the
    // sign and on the QR material), `company_name` is the legal name (what the
    // contract is signed with). The page resolved the legal name first, so
    // `Cozi +` published as `Cozimais Restaurante e Café`. Same order the slug
    // already uses — migration 20260826_01_client_slug_from_trade_name.
    await page.goto(TRADE_NAME_PATH);
    await waitForLockup(page);

    await expect(page.locator("h1")).toContainText(TRADE_NAME);
    await expect(page.locator("body")).not.toContainText(LEGAL_NAME);
    // The title/OG read the same resolved name, and that is the string that
    // travels on WhatsApp when the partner shares their own link.
    await expect(page).toHaveTitle(new RegExp(TRADE_NAME.replace("+", "\\+")));
  });
});

test.describe("no horizontal overflow on mobile viewports", () => {
  // 390 = iPhone 12/13/14 class, 360 = a common small Android width, 320 =
  // iPhone SE — the three widths named in the investigation that flagged
  // this suite.
  for (const width of [390, 360, 320] as const) {
    for (const path of [NO_LOGO_PATH, WITH_LOGO_PATH] as const) {
      test(`scrollWidth stays within innerWidth at ${width}px on ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(path);
        await waitForLockup(page);

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));

        expect(scrollWidth, `document.documentElement.scrollWidth vs window.innerWidth at ${width}px`).toBeLessThanOrEqual(innerWidth);
      });
    }
  }
});

test.describe("cookie consent banner vs. the floating download CTA", () => {
  /**
   * Reads whatever the browser considers topmost at the CTA's own center. The
   * CTA slides up over the banner's height (a 300ms CSS transition on `bottom`,
   * see PartnerHero.tsx), so the box is re-measured on every poll instead of
   * once up front — sampling mid-slide is otherwise a coin flip.
   */
  async function elementAtCtaCenter(page: Page, cta: Locator) {
    const box = await cta.boundingBox();
    if (!box) return null;
    return page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el?.closest("button")?.textContent ?? el?.tagName ?? null;
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    );
  }

  /** True once the CTA has finished being lifted clear of the banner. */
  async function ctaClearsBanner(cta: Locator, banner: Locator) {
    const ctaBox = await cta.boundingBox();
    const bannerBox = await banner.boundingBox();
    if (!ctaBox || !bannerBox) return false;
    return ctaBox.y >= 0 && ctaBox.y + ctaBox.height <= bannerBox.y;
  }

  test("the download CTA remains the element under its own center point", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(COUPON_PATH);
    await waitForLockup(page);

    const cta = page.getByRole("button", { name: /discover more in the app/i });
    await expect(cta).toBeVisible();
    // First visit: no tuggi_cookie_consent, so the legally required banner is
    // up. It must stay up — the fix stacks the CTA above it, it does not
    // suppress or lower the banner.
    const banner = page.getByText(/we use cookies/i);
    await expect(banner).toBeVisible();

    await expect
      .poll(() => elementAtCtaCenter(page, cta), {
        message: "topmost element at the CTA's center point while the consent banner is showing",
      })
      .toContain("DISCOVER MORE IN THE APP");

    // ...and the two stop overlapping entirely, not merely at that one pixel,
    // with the whole button still on screen after the lift.
    await expect
      .poll(() => ctaClearsBanner(cta, banner), {
        message: "CTA sits fully above the banner and fully inside the viewport",
      })
      .toBe(true);
  });

  test("the CTA drops back to the bottom once consent is answered", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(COUPON_PATH);
    await waitForLockup(page);

    const cta = page.getByRole("button", { name: /discover more in the app/i });
    const banner = page.getByText(/we use cookies/i);
    await expect.poll(() => ctaClearsBanner(cta, banner)).toBe(true);
    const liftedTop = (await cta.boundingBox())!.y;

    // Decline (not accept): accepting reloads the page, which would prove
    // nothing about the banner unmounting.
    await page.getByRole("button", { name: /decline/i }).click();
    await expect(banner).toBeHidden();

    await expect
      .poll(async () => (await cta.boundingBox())!.y, {
        message: "CTA top edge after the banner is dismissed",
      })
      .toBeGreaterThan(liftedTop);
    await expect.poll(() => elementAtCtaCenter(page, cta)).toContain("DISCOVER MORE IN THE APP");
  });
});
