import { test, expect, type Locator, type Page } from "@playwright/test";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../src/lib/app-meta";

/**
 * Covers the two layouts /d/<slug> can render (see PartnerHero.tsx):
 *
 *   - no seal  → the default hero. The common case by a wide margin, and the
 *                one that must never regress when the campaign work moves.
 *   - a seal   → the campaign layout (PartnerCampaignHero.tsx), which mirrors
 *                the printed table-top piece and reads as three acts: the
 *                headline with a coloured stress, then the place and its host
 *                (referral line, the host's own words, the player), then the
 *                three numbered steps that explain the product, closing on a
 *                dark download band where the seal returns.
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

/** iPhone 12/13/14 class — the viewport this page is actually read on. */
const PHONE = { width: 390, height: 844 } as const;
/**
 * The campaign page is a QR landing read standing at a restaurant table. The
 * budget is stated in folds, not in pixels of taste: everything the visitor
 * needs fits in two screens of a 390x844 phone, and the whole document stays
 * under 2000px. It was 4809px before this budget existed.
 */
const MAX_PAGE_HEIGHT = 2000;

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

  test("sets the campaign in the site's own typeface, headline included", async ({ page }) => {
    // The headline and the step numbers were set in the system serif stack.
    // The site is Inter end to end (see the [locale] layout), and a second
    // family on the one page a visitor meets first read as a different site.
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    const families = await page.evaluate(() => {
      const family = (el: Element | null) => (el ? getComputedStyle(el).fontFamily : null);
      return {
        body: family(document.body),
        headline: family(document.querySelector("h1")),
        stepNumber: family(document.querySelector("ol > li span[aria-hidden='true']")),
      };
    });

    expect(families.body).toMatch(/Inter/i);
    // Compared against the body rather than to a literal: next/font hashes the
    // family name at build time, and the claim here is "the same as the rest of
    // the site", not "this exact string".
    expect(families.headline).toBe(families.body);
    expect(families.stepNumber).toBe(families.body);
  });

  test("reads as three acts: the title, the place and its host, then how it works", async ({ page }) => {
    // The ordering *is* the feature: the host's words frame the audio, and the
    // three steps explain a product the visitor has already heard. Asserted by
    // vertical position, because a DOM-order check would still pass if CSS
    // reshuffled the blocks on screen.
    await page.setViewportSize(PHONE);
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);
    await expect(page.locator("[data-block='player']")).toBeVisible();

    const layout = await page.evaluate(() => {
      const box = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) };
      };
      return {
        headline: box("h1"),
        subtext: box("[data-block='subtext']"),
        referral: box("[data-block='referral']"),
        description: box("[data-block='description']"),
        player: box("[data-block='player']"),
        steps: box("[data-block='steps']"),
        band: box("[data-block='band']"),
      };
    });

    for (const [name, value] of Object.entries(layout)) {
      expect(value, `${name} must render`).not.toBeNull();
    }

    const sequence = [
      "headline",
      "subtext",
      "referral",
      "description",
      "player",
      "steps",
      "band",
    ] as const;
    for (let i = 1; i < sequence.length; i++) {
      const previous = sequence[i - 1];
      const current = sequence[i];
      expect(
        layout[current]!.top,
        `${current} must start below ${previous}`
      ).toBeGreaterThanOrEqual(layout[previous]!.bottom);
    }
  });

  test("names the partner that referred the visit, above their own words", async ({ page }) => {
    // The seal in the masthead is a mark; this line says what it means. The
    // default layout carries it in the h1, and the campaign layout lost it
    // when it stopped using that h1.
    await page.setViewportSize(PHONE);
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    const referral = page.locator("[data-block='referral']");
    await expect(referral).toHaveText(`Referred by ${PARTNER_NAME}`);
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
    // Prefix, not equality: the Play link carries the partner's install
    // referrer. What that referrer must contain is asserted in
    // download-attribution.spec.ts, which owns that rule.
    await expect(page.locator(`a[href^="${PLAY_STORE_URL}"]:visible`)).toHaveCount(1);

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

  test("the whole page fits the mobile height budget", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);
    // The trailing spacer grows with the consent banner, so measure with the
    // banner up: that is the worst case and the state a first scan lands in.
    await expect(page.getByText(/we use cookies/i)).toBeVisible();

    const height = await page.evaluate(() => document.body.scrollHeight);
    expect(height, `document height at ${PHONE.width}px`).toBeLessThanOrEqual(MAX_PAGE_HEIGHT);
  });

  test("the player is the first fold, not something to scroll for", async ({ page }) => {
    // The 12s welcome clip proves the promise before the visitor has decided to
    // trust the page. Below the fold, or clipped by the floating CTA, it is not
    // the product any more — it is a detail. This is the tightest budget on the
    // page: the host's text now sits between the headline and the player, and
    // on a first visit the consent banner lifts the CTA to ~450px, so the whole
    // of act 1 + act 2 has to fit above that. If this goes red, the fix is the
    // teaser length in PartnerHero (maxDescLength), not a looser bound here.
    await page.setViewportSize(PHONE);
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    const player = page.locator("[data-block='player']");
    await expect(player).toBeVisible();

    const ctaBlock = page
      .getByRole("button", { name: /discover more in the app/i })
      .locator("..");

    await expect
      .poll(
        async () => {
          const playerBox = await player.boundingBox();
          const ctaBox = await ctaBlock.boundingBox();
          if (!playerBox || !ctaBox) return null;
          return {
            insideFold: playerBox.y + playerBox.height <= PHONE.height,
            clearOfCta: playerBox.y + playerBox.height <= ctaBox.y,
          };
        },
        { message: "player box against the first fold and the floating CTA, unscrolled" }
      )
      .toEqual({ insideFold: true, clearOfCta: true });
  });

  test("keeps the partner's own welcome text, collapse control and all", async ({ page }) => {
    // Compacting the page must not cost the host their voice: the welcome text
    // is the only copy on the page the partner wrote.
    await page.setViewportSize(PHONE);
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);

    const description = page.locator("[data-block='description']");
    await expect(description).toContainText("Conservatória");

    const more = description.getByRole("button", { name: "MORE" });
    // Scrolled into view first: the CTA is fixed over the lower third of the
    // viewport, so an unscrolled tap here would land on the CTA instead.
    await more.scrollIntoViewIfNeeded();
    const collapsed = (await description.innerText()).length;
    await more.click();
    await expect(description.getByRole("button", { name: "LESS" })).toBeVisible();
    expect((await description.innerText()).length).toBeGreaterThan(collapsed);
  });

  test("carries no photo band", async ({ page }) => {
    // The band used to hold an app screenshot of Lisbon — 500px of the wrong
    // region on a Vale do Café campaign. Nothing may quietly put it back.
    await page.goto(WITH_LOGO_PATH);
    await waitForLockup(page);
    await expect(page.locator('img[src*="partner-hero"]')).toHaveCount(0);
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
