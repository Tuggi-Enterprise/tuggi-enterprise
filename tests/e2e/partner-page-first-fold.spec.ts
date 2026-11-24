import { test, expect, devices, type Page } from "@playwright/test";
import pt from "../../src/messages/pt.json";
import { visitorHeaders } from "./visitor-headers";

/**
 * The first fold of a hotel's or a restaurant's page, `tuggi.app/@nome` (#1254,
 * spec onda 1 §1, copy onda 1 §1).
 *
 * At 390 x 664 (Safari with its bars) and with the cookie notice still open,
 * the visitor sees the partner, the one store of their phone and the three
 * steps, with the @ under them. On a computer there is no store button: the
 * steps, the two badges and the QR.
 *
 * BR-B2B-009 item 1 and BR-B2B-067 item 3: nothing in the first fold speaks of
 * days, gifts or benefit. DS-COR-002: the blue buttons carry white ink.
 */

const PAGE = "/@e2e-com-logo";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SPEC_ADDRESS = `2001:db8:1254:1::${Math.floor(Math.random() * 0xffff).toString(16)}`;

/** The top of the cookie notice, from the height it publishes on <html> (CookieBanner). */
async function noticeTop(page: Page): Promise<number> {
  await expect
    .poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cookie-banner-height")) || 0))
    .toBeGreaterThan(0);
  return page.evaluate(
    () => window.innerHeight - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cookie-banner-height"))
  );
}

/** Every one of these sits whole between the top of the screen and the cookie notice. */
async function expectAboveNotice(page: Page, testIds: string[]) {
  const top = await noticeTop(page);
  for (const id of testIds) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.y, id).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, `${id} ends above the cookie notice`).toBeLessThanOrEqual(top);
  }
}

const firstFoldText = async (page: Page) =>
  [
    await page.locator("h1").innerText(),
    await page.getByTestId("partner-tutorial").innerText(),
    await page.getByTestId("partner-handle-reserve").innerText(),
  ].join(" ");

test.describe("iPhone, 390 x 664, cookie notice open", () => {
  test.use({
    userAgent: devices["iPhone 13"].userAgent,
    viewport: { width: 390, height: 664 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
    permissions: ["clipboard-read", "clipboard-write"],
  });

  test("the App Store button, the three steps and the @ are whole above the notice", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole("button", { name: pt.CookieBanner.accept })).toBeVisible();
    const cta = page.getByTestId("partner-page-cta");
    await expect(cta).toHaveText(pt.PartnerPage.download);
    await expect(cta).toHaveAttribute("href", /apps\.apple\.com/);
    await expect(page.getByTestId("partner-page-play-store")).toHaveCount(0);
    await expect(page.getByTestId("partner-tutorial-step")).toHaveText([
      pt.PartnerPage.tutorialStep1,
      pt.PartnerPage.tutorialStep2,
      pt.PartnerPage.tutorialStep3Ios,
    ]);
    await expectAboveNotice(page, ["partner-page-cta", "partner-tutorial", "partner-handle-reserve"]);
  });

  test("BR-B2B-009 item 1, BR-B2B-067 item 3: the first fold has no days, gift nor benefit", async ({ page }) => {
    await page.goto(PAGE);
    expect(await firstFoldText(page)).not.toMatch(/\bdias?\b|presente|gr[aá]tis|desconto|\bhoras?\b/i);
  });

  test("the copy button copies the @ the app answers to", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByTestId("partner-handle-reserve")).toContainText("@e2e-com-logo");
    await page.getByTestId("partner-handle-copy").click();
    await expect(page.getByTestId("partner-handle-copy")).toHaveText(pt.PartnerPage.handleCopied);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("@e2e-com-logo");
  });

  test("DS-COR-002: the store button and the notice's Accept are Tuggi blue with white ink", async ({ page }) => {
    await page.goto(PAGE);
    for (const el of [page.getByTestId("partner-page-cta"), page.getByRole("button", { name: pt.CookieBanner.accept })]) {
      await expect(el).toHaveCSS("background-color", "rgb(0, 168, 232)");
      await expect(el).toHaveCSS("color", "rgb(255, 255, 255)");
    }
  });
});

test.describe("Android, 390 x 664, cookie notice open", () => {
  test.use({
    userAgent: ANDROID_UA,
    viewport: { width: 390, height: 664 },
    isMobile: true,
    hasTouch: true,
    extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
  });

  test("the Google Play button and the Android steps are whole above the notice", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByTestId("partner-page-cta")).toHaveAttribute("href", /play\.google\.com/);
    await expect(page.getByTestId("partner-tutorial-step").nth(2)).toHaveText(pt.PartnerPage.tutorialStep3Android);
    await expectAboveNotice(page, ["partner-page-cta", "partner-tutorial", "partner-handle-reserve"]);
  });
});

test.describe("a computer, 1440", () => {
  test.use({
    userAgent: MAC_UA,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
  });

  test("no store button: the QR beside the steps, both phones' third step and the two badges", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByTestId("partner-page-cta")).toHaveCount(0);
    await expect(page.getByTestId("partner-hero-qr")).toBeVisible();
    // One QR on the page: the band below does not draw a second one.
    await expect(page.getByTestId("app-preview-qr")).toHaveCount(1);
    await expect(page.getByTestId("partner-page-app-store")).toBeVisible();
    await expect(page.getByTestId("partner-page-play-store")).toBeVisible();
    const steps = page.getByTestId("partner-tutorial-step");
    await expect(steps.nth(0)).toHaveText(pt.AppPreview.qr_caption);
    await expect(steps.nth(2)).toContainText(pt.PartnerPage.tutorialStep3Ios);
    await expect(steps.nth(2)).toContainText(pt.PartnerPage.tutorialStep3Android);
  });
});
