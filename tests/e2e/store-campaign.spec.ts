import { test, expect, type Page } from "@playwright/test";
import {
  APP_STORE_PROVIDER_TOKEN,
  APP_STORE_URL,
  PLAY_STORE_URL,
  buildAppStoreUrl,
  buildPlayStoreUrl,
  campaignToken,
} from "../../src/lib/app-meta";
import { sendStoreClick, storeClickParams, visitUtmOf } from "../../src/lib/store-click";

/**
 * #1060: the App Store campaign of a visit and the single `click_store` event.
 *
 * - With `utm_campaign`, every App Store link carries `pt`, `ct` and `mt=8`;
 *   without it, the link is APP_STORE_URL, exactly.
 * - `ct` is the campaign sanitized: lower case, `[a-z0-9-_]`, 40 characters.
 * - The Play link is the partner attribution channel (BR-B2B-002, contract §2)
 *   and does not change with the campaign.
 * - Every store button sends `click_store` with `store`, `placement` and the
 *   visit's `utm_*`.
 */

const CLICK_ID = "3f2c6a1e-9b7d-4c2a-8e51-0d6b9f4a7c13";

test.describe("App Store campaign link", () => {
  test("the provider token is the Tuggi account's", () => {
    expect(APP_STORE_PROVIDER_TOKEN).toBe("127712004");
  });

  test("no campaign keeps today's link, exactly", () => {
    expect(buildAppStoreUrl()).toBe(APP_STORE_URL);
    expect(buildAppStoreUrl(null)).toBe(APP_STORE_URL);
    expect(buildAppStoreUrl("")).toBe(APP_STORE_URL);
    expect(buildAppStoreUrl("   ")).toBe(APP_STORE_URL);
  });

  test("a campaign adds pt, ct and mt=8", () => {
    expect(buildAppStoreUrl("bio")).toBe(
      `${APP_STORE_URL}?pt=${APP_STORE_PROVIDER_TOKEN}&ct=bio&mt=8`
    );
    const url = new URL(buildAppStoreUrl("bio"));
    expect(url.searchParams.get("pt")).toBe("127712004");
    expect(url.searchParams.get("ct")).toBe("bio");
    expect(url.searchParams.get("mt")).toBe("8");
  });

  test("a dirty campaign is sanitized: case, accents, blanks, symbols", () => {
    expect(campaignToken("BIO")).toBe("bio");
    expect(campaignToken("  Verão Búzios  2026 ")).toBe("verao-buzios-2026");
    expect(campaignToken("reels_out-26")).toBe("reels_out-26");
    expect(campaignToken("a&b=c?d#e/f")).toBe("abcdef");
    expect(campaignToken("<script>")).toBe("script");
    expect(buildAppStoreUrl("Verão 2026")).toBe(
      `${APP_STORE_URL}?pt=${APP_STORE_PROVIDER_TOKEN}&ct=verao-2026&mt=8`
    );
  });

  test("a long campaign is cut at 40 characters", () => {
    const token = campaignToken("x".repeat(60));
    expect(token).toBe("x".repeat(40));
    expect(new URL(buildAppStoreUrl("y".repeat(41))).searchParams.get("ct")).toHaveLength(40);
  });

  test("a campaign with nothing usable keeps the bare link", () => {
    expect(campaignToken("!!! ???")).toBeNull();
    expect(campaignToken("@@@")).toBeNull();
    expect(buildAppStoreUrl("@@@")).toBe(APP_STORE_URL);
  });

  test("BR-B2B-002: the Play link is untouched by the campaign work", () => {
    expect(buildPlayStoreUrl(null)).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl(CLICK_ID)).toBe(
      `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`tuggi_click_${CLICK_ID}`)}`
    );
  });
});

test.describe("click_store event", () => {
  test("reads utm_source, utm_medium and utm_campaign from the visit, skipping empty ones", () => {
    expect(visitUtmOf("?utm_source=instagram&utm_medium=social&utm_campaign=bio&lang=pt")).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "bio",
    });
    expect(visitUtmOf("utm_source=&utm_campaign=bio")).toEqual({ utm_campaign: "bio" });
    expect(visitUtmOf("")).toEqual({});
  });

  test("carries store, placement, the visit's utm and the placement's own params", () => {
    const utm = visitUtmOf("?utm_source=instagram&utm_medium=social&utm_campaign=bio");
    expect(storeClickParams({ store: "app_store", placement: "footer", utm })).toEqual({
      store: "app_store",
      placement: "footer",
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "bio",
    });
    expect(
      storeClickParams({ store: "play_store", placement: "route_link", extra: { route_slug: "rio" } })
    ).toEqual({ store: "play_store", placement: "route_link", route_slug: "rio" });
    // A placement param can never overwrite the two the report is built on.
    expect(
      storeClickParams({ store: "play_store", placement: "pricing", extra: { store: "x", placement: "y" } })
    ).toEqual({ store: "play_store", placement: "pricing" });
  });

  test("goes out as gtag('event', 'click_store', params), and is silent without gtag", () => {
    const calls: unknown[][] = [];
    const g = globalThis as unknown as { window?: unknown };
    const previous = g.window;
    try {
      g.window = {};
      expect(() => sendStoreClick({ store: "app_store", placement: "hero" })).not.toThrow();

      g.window = { gtag: (...args: unknown[]) => calls.push(args) };
      sendStoreClick({ store: "app_store", placement: "hero", utm: { utm_campaign: "bio" } });
      expect(calls).toEqual([
        ["event", "click_store", { store: "app_store", placement: "hero", utm_campaign: "bio" }],
      ]);
    } finally {
      g.window = previous;
    }
  });
});

test.describe("/d/ in the browser", () => {
  test("the campaign badge links to the App Store with the visit's campaign, and its tap sends click_store", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __storeEvents: unknown[][]; gtag: (...a: unknown[]) => void };
      w.__storeEvents = [];
      w.gtag = (...args: unknown[]) => {
        w.__storeEvents.push(args);
      };
    });
    await page.goto("/d/e2e-com-logo?utm_source=instagram&utm_medium=social&utm_campaign=Bio");

    const badge = page.locator('section a[href^="https://apps.apple.com/"]').first();
    await expect(badge).toHaveAttribute(
      "href",
      `${APP_STORE_URL}?pt=${APP_STORE_PROVIDER_TOKEN}&ct=bio&mt=8`
    );
    // The Play badge next to it keeps the attribution link as it was.
    const play = page.locator('section a[href^="https://play.google.com/"]').first();
    expect(await play.getAttribute("href")).not.toContain("ct=");

    const popup = page.waitForEvent("popup").catch(() => null);
    await badge.click();
    await popup;
    const events = await page.evaluate(
      () => (window as unknown as { __storeEvents: unknown[][] }).__storeEvents
    );
    expect(events).toContainEqual([
      "event",
      "click_store",
      expect.objectContaining({
        store: "app_store",
        placement: "partner_badge",
        utm_source: "instagram",
        utm_medium: "social",
        utm_campaign: "Bio",
      }),
    ]);
  });

  test("without utm_campaign the badge is today's App Store link", async ({ page }) => {
    await page.goto("/d/e2e-com-logo");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('section a[href^="https://apps.apple.com/"]').first()).toHaveAttribute(
      "href",
      APP_STORE_URL
    );
  });

  test("BR-B2B-037 item 4: the slug redirect keeps the utm tags and drops k", async ({ request }) => {
    const res = await request.get(
      "/d/e2e-slug-impresso?k=d&utm_source=instagram&utm_medium=social&utm_campaign=bio",
      { maxRedirects: 0 }
    );
    expect(res.status()).toBe(308);
    const location = res.headers()["location"];
    expect(location).toMatch(/\/d\/e2e-sem-logo\?/);
    const forwarded = new URL(location, "http://x").searchParams;
    expect(forwarded.get("utm_source")).toBe("instagram");
    expect(forwarded.get("utm_medium")).toBe("social");
    expect(forwarded.get("utm_campaign")).toBe("bio");
    expect(forwarded.has("k")).toBe(false);
  });
});

/**
 * #1060, field test of 2026-10-29: the store button of /d/<slug> sent no
 * click_store to GA4, while every other store button of the site did.
 *
 * gtag.js holds an event in a batch for about five seconds and empties the
 * batch early only when the page is hidden. Every store button of the site
 * opens the store in a new tab, so the page stays alive and the batch goes out.
 * The partner CTA was the one that took the page itself to the store, and on a
 * phone that hands the link to the store app with the batch still waiting.
 *
 * These run the real gtag.js (the GA4 id is fixed in the layout) with analytics
 * consent given, and read the hit gtag sends to /g/collect. The hit is
 * answered here and never reaches Google, so the property stays clean.
 */
test.describe("#1060: the partner page's store buttons reach GA4 as click_store", () => {
  const IPHONE_UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const ANDROID_UA =
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

  /** Every `en=` gtag sends to /g/collect from now on, URL and batched body alike. */
  async function collectedEvents(page: Page): Promise<string[]> {
    const names: string[] = [];
    const context = page.context();
    await context.addInitScript(() => localStorage.setItem("tuggi_cookie_consent", "true"));
    await context.route(/apps\.apple\.com|play\.google\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>store stub</html>" })
    );
    await context.route(/google-analytics\.com\/g\/collect/, (route) => {
      const request = route.request();
      const payload = `${request.url()}\n${request.postData() ?? ""}`;
      for (const match of payload.matchAll(/(?:^|[?&\n])en=([^&\s]+)/g)) names.push(match[1]);
      return route.fulfill({ status: 204 });
    });
    return names;
  }

  async function openWithGtag(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await page.waitForFunction(() => typeof (window as unknown as { gtag?: unknown }).gtag === "function");
  }

  for (const [label, userAgent] of [
    ["iPhone", IPHONE_UA],
    ["Android", ANDROID_UA],
  ] as const) {
    test.describe(label, () => {
      test.use({ userAgent, viewport: { width: 390, height: 844 } });

      test(`the floating CTA sends click_store before the visitor is at the store (${label})`, async ({ page }) => {
        test.setTimeout(45_000);
        const events = await collectedEvents(page);
        await openWithGtag(page, "/d/e2e-sem-logo?lang=en");

        await page.getByRole("button", { name: /discover more in the app/i }).click();

        await expect
          .poll(() => events.includes("click_store"), { timeout: 15_000, message: "click_store in /g/collect" })
          .toBe(true);
      });
    });
  }

  test("the campaign badge sends click_store too", async ({ page }) => {
    test.setTimeout(45_000);
    const events = await collectedEvents(page);
    await openWithGtag(page, "/d/e2e-com-logo?lang=en");

    await page.locator('section a[href^="https://apps.apple.com/"]').first().click();

    await expect
      .poll(() => events.includes("click_store"), { timeout: 15_000, message: "click_store in /g/collect" })
      .toBe(true);
  });
});
