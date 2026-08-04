import { test, expect, type Locator, type Page } from "@playwright/test";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../src/lib/app-meta";

/**
 * Covers the two layouts /d/<slug> can render (see PartnerHero.tsx):
 *
 *   - no seal  → the default hero. The common case by a wide margin, and the
 *                one that must never regress when the campaign work moves.
 *   - a seal   → the campaign layout (PartnerCampaignHero.tsx), which mirrors
 *                the printed table-top piece: seal-anchored masthead, serif
 *                headline with a coloured stress, three numbered steps, photo
 *                band and a dark download band where the seal returns.
 *
 * Runs against a local production build (`npm run build && npm run start`,
 * wired by playwright.config.ts) talking to the mock PostgREST double in
 * mock-supabase-server.mjs — never the real Supabase project.
 *
 * Fixture slugs (see mock-supabase-server.mjs):
 *   /d/e2e-sem-logo  — a partner with no avatar_url.
 *   /d/e2e-com-logo  — the same partner, with an avatar_url set.
 * Both use the festival's real name ("Delícias do Vale do Café") so the
 * overflow checks exercise the actual long name that triggered this task.
 */

const NO_LOGO_PATH = "/d/e2e-sem-logo";
const WITH_LOGO_PATH = "/d/e2e-com-logo";
const PARTNER_NAME = "Delícias do Vale do Café";

/** --color-tuggi-primary / --color-tuggi-secondary, as the browser reports them. */
const TUGGI_PRIMARY = "rgb(0, 168, 232)";
const TUGGI_SECONDARY = "rgb(255, 111, 0)";
/** Distinctive part of the fixture's avatar_url, to count seal renders. */
const SEAL_SRC_FRAGMENT = "e2e-logo.png";

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

  test("does not pick up any campaign furniture", async ({ page }) => {
    // The campaign layout is gated on the seal alone. A partner without one is
    // the majority of this route, and must keep the hero it had before the
    // campaign work — not a half-dressed version of it.
    await page.goto(NO_LOGO_PATH);
    await waitForLockup(page);

    await expect(page.locator("ol")).toHaveCount(0);
    // `:visible` because the site's global footer stays in the DOM on this
    // route — `.no-layout` only hides it — and it carries its own store links.
    await expect(page.locator('a[href*="apps.apple.com"]:visible')).toHaveCount(0);
    await expect(page.locator('a[href*="play.google.com"]:visible')).toHaveCount(0);
    // The single CTA button stays the only way out of the page.
    await expect(page.getByRole("button", { name: /discover more in the app/i })).toBeVisible();
  });

  test("lockup screenshot baseline (no logo)", async ({ page }) => {
    await page.goto(NO_LOGO_PATH);
    const lockup = await waitForLockup(page);
    await expect(lockup).toHaveScreenshot("lockup-no-logo.png");
  });
});

test.describe("campaign layout — with avatar_url", () => {
  test("anchors the masthead with a seal at campaign scale, inside the viewport", async ({ page }) => {
    await page.goto(WITH_LOGO_PATH);
    const lockup = await waitForLockup(page);

    await expect(lockup.locator("img")).toHaveCount(2);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const box = await lockup.boundingBox();
    expect(box).not.toBeNull();
    // The masthead (Tuggi logo + seal) must fit inside the viewport on its own
    // — this is the exact regression the seal could cause.
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);

    // The complaint that started this task was "the only thing that landed was
    // a logo" — a 40px mark lost at the top. Assert the seal has real presence
    // and is still bounded, by box rather than by class name.
    const sealBox = await lockup.locator("img").nth(1).boundingBox();
    expect(sealBox).not.toBeNull();
    expect(sealBox!.height).toBeGreaterThanOrEqual(60);
    expect(sealBox!.width).toBeLessThanOrEqual(140);
  });

  test("leads with the campaign headline, stressed in the Tuggi blue", async ({ page }) => {
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    const h1 = page.locator("h1");
    await expect(h1).toContainText("Between one dish and the next");
    // The stress is part of the message, not decoration: the sentence has to
    // arrive with "its own story" set apart.
    const accent = h1.locator("span");
    await expect(accent).toHaveText("its own story");
    await expect(accent).toHaveCSS("color", TUGGI_PRIMARY);
  });

  test("explains the product in three numbered steps, numbered in the campaign orange", async ({ page }) => {
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    const steps = page.locator("ol > li");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("Open it and forget it");
    await expect(steps.nth(1)).toContainText("The audio starts on its own");
    await expect(steps.nth(2)).toContainText("The route is yours");

    for (const [i, label] of ["01", "02", "03"].entries()) {
      const number = steps.nth(i).locator('span[aria-hidden="true"]');
      await expect(number).toHaveText(label);
      await expect(number).toHaveCSS("color", TUGGI_SECONDARY);
    }
  });

  test("closes on a download band carrying both stores and the seal again", async ({ page }) => {
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    // Both stores, because this band is the fallback for whoever the
    // platform sniff behind the floating CTA gets wrong (desktop included).
    // `:visible` skips the global footer, which stays in the DOM behind
    // `.no-layout` with store links of its own.
    await expect(page.locator(`a[href="${APP_STORE_URL}"]:visible`)).toHaveCount(1);
    await expect(page.locator(`a[href="${PLAY_STORE_URL}"]:visible`)).toHaveCount(1);

    // The seal signs off the piece the same way it opens it.
    await expect(page.locator(`img[src*="${SEAL_SRC_FRAGMENT}"]`)).toHaveCount(2);
  });

  test("the download band is readable once scrolled to the end, banner or no banner", async ({ page }) => {
    // The band lives under a fixed CTA that itself sits above the consent
    // banner. Its trailing spacer is sized off the banner's published height,
    // so reaching the bottom has to expose the band whatever consent is doing.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    const band = page.getByText("Download free");
    const cta = page.getByRole("button", { name: /discover more in the app/i });

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(async () => {
        const bandBox = await band.boundingBox();
        const ctaBox = await cta.boundingBox();
        if (!bandBox || !ctaBox) return false;
        return bandBox.y >= 0 && bandBox.y + bandBox.height <= ctaBox.y;
      }, { message: "download band fully visible above the floating CTA at the end of the scroll" })
      .toBe(true);
  });

  test("masthead screenshot baseline (campaign)", async ({ page }) => {
    await page.goto(WITH_LOGO_PATH);
    const lockup = await waitForLockup(page);
    // NOTE: Next's image optimizer refuses the fixture's avatar_url (SSRF
    // guard: 127.0.0.1 is a private IP — see mock-supabase-server.mjs), so
    // the seal's slot renders a broken-image glyph instead of real artwork.
    // The browser's own broken-image glyph isn't pixel-stable across runs
    // (this masking was added after the baseline flaked with a ~3% pixel
    // diff on a rerun with no code change), so that one image is masked out
    // of the comparison. Everything else in the masthead — the Tuggi logo, the
    // seal's reserved box and their positions — is still a real, strict baseline.
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
