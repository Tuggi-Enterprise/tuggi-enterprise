import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Covers the /d/<slug> co-branding lockup added in PartnerHero.tsx (Tuggi
 * logo + optional partner seal). Runs against a local production build
 * (`npm run build && npm run start`, wired by playwright.config.ts) talking
 * to the mock PostgREST double in mock-supabase-server.mjs — never the real
 * Supabase project. See that file for why: the one real-world partner this
 * feature ships for (the Delícias do Vale do Café festival) has a NULL
 * avatar_url in production today, so the "with logo" branch has no real
 * fixture to point at yet.
 *
 * Fixture slugs (see mock-supabase-server.mjs):
 *   /d/e2e-sem-logo  — a partner with no avatar_url (the common case: almost
 *                       no partner has uploaded a logo).
 *   /d/e2e-com-logo  — the same partner, with an avatar_url set.
 * Both use the festival's real name ("Delícias do Vale do Café") so the
 * overflow checks exercise the actual long name that triggered this task.
 */

const NO_LOGO_PATH = "/d/e2e-sem-logo";
const WITH_LOGO_PATH = "/d/e2e-com-logo";
const PARTNER_NAME = "Delícias do Vale do Café";

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

test.describe("partner brand lockup — no avatar_url (the common case)", () => {
  test("renders the bare Tuggi logo with no orphaned divider or empty seal slot", async ({ page }) => {
    await page.goto(NO_LOGO_PATH);
    const lockup = await waitForLockup(page);

    // Exactly one logo image (Tuggi's) — no partner <Image>, no divider span.
    await expect(lockup.locator("img")).toHaveCount(1);
    await expect(lockup.locator("img")).toHaveAttribute("alt", "Tuggi");
    await expect(lockup.locator('span[aria-hidden="true"]')).toHaveCount(0);

    // The referral heading still renders using the partner's name — this is
    // the real festival name, confirming the no-logo path is not a
    // degraded/error state, just the ordinary layout.
    await expect(page.locator("h1")).toContainText(PARTNER_NAME);
  });

  test("lockup screenshot baseline (no logo)", async ({ page }) => {
    await page.goto(NO_LOGO_PATH);
    const lockup = await waitForLockup(page);
    await expect(lockup).toHaveScreenshot("lockup-no-logo.png");
  });
});

test.describe("partner brand lockup — with avatar_url", () => {
  test("renders the partner seal beside the Tuggi logo without exceeding the lockup width", async ({ page }) => {
    await page.goto(WITH_LOGO_PATH);
    const lockup = await waitForLockup(page);

    await expect(lockup.locator("img")).toHaveCount(2);
    await expect(lockup.locator('span[aria-hidden="true"]')).toHaveCount(1);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const box = await lockup.boundingBox();
    expect(box).not.toBeNull();
    // The lockup (Tuggi logo + divider + seal) must fit inside the viewport
    // on its own — this is the exact regression the added seal could cause.
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);

    // The seal itself is capped by className="... max-w-[140px] ..." in
    // PartnerHero.tsx — assert the box, not the class name, so this fails
    // if a future edit changes the cap without updating the intent.
    const sealBox = await lockup.locator("img").nth(1).boundingBox();
    expect(sealBox).not.toBeNull();
    expect(sealBox!.width).toBeLessThanOrEqual(140);
  });

  test("lockup screenshot baseline (with logo)", async ({ page }) => {
    await page.goto(WITH_LOGO_PATH);
    const lockup = await waitForLockup(page);
    // NOTE: Next's image optimizer refuses the fixture's avatar_url (SSRF
    // guard: 127.0.0.1 is a private IP — see mock-supabase-server.mjs), so
    // the seal's slot renders a broken-image glyph instead of real artwork.
    // The browser's own broken-image glyph isn't pixel-stable across runs
    // (this masking was added after the baseline flaked with a ~3% pixel
    // diff on a rerun with no code change), so that one image is masked out
    // of the comparison. Everything else in the lockup — the Tuggi logo, the
    // divider, and their positions — is still a real, strict baseline.
    await expect(lockup).toHaveScreenshot("lockup-with-logo.png", {
      mask: [lockup.locator("img").nth(1)],
    });
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
    await page.goto(NO_LOGO_PATH);
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
    await page.goto(NO_LOGO_PATH);
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
