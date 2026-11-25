import { test, expect, devices, type Page } from "@playwright/test";
import pt from "../../src/messages/pt.json";
import { CONSENT_KEY } from "../../src/lib/consent";
import { visitorHeaders } from "./visitor-headers";

/**
 * The page of a hotel or a restaurant, `tuggi.app/@nome`, as redesigned in
 * #1254 (spec `docs/design/spec-pagina-arroba-redesenho-2026-11.md`, §6).
 *
 * At 390 x 664 (Safari with its bars) and with the cookie notice still open,
 * the visitor sees the place, one line of what Tuggi is, the one store of
 * their phone, the three steps and the @, all above the notice, with or
 * without a photo, with or without the approved logo, and with a two-line
 * name. On a computer there is no blue button: the steps, the badges, the QR.
 *
 * BR-B2B-070 item 2: the logo is only the approved one, and without it the name
 * stands alone. BR-B2B-067 item 3: nothing in the first fold speaks of days,
 * gifts or benefit. DS-COR-002: blue buttons carry white ink.
 */

/** Short name, approved logo, colour pair, photo. */
const WITH_PHOTO = "/@e2e-hotel-foto";
/** Two-line name (24 characters), approved logo, neutral band, photo. */
const LONG_NAME = "/@e2e-com-logo";
/** Two-line name, no approved logo, no photo. */
const NO_LOGO_NO_PHOTO = "/@e2e-sem-logo";
/** Short name, no logo, no photo, a description and networks. */
const NO_LOGO_SHORT = "/@e2e-hotel-redes";
const ALL_PAGES = [WITH_PHOTO, LONG_NAME, NO_LOGO_NO_PHOTO, NO_LOGO_SHORT];

const HOTEL_ID = "88888888-8888-4888-8888-888888888888";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SPEC_ADDRESS = `2001:db8:1254:1::${Math.floor(Math.random() * 0xffff).toString(16)}`;
const FIRST_FOLD = ["partner-promise", "partner-promise-sub-short", "partner-page-cta", "partner-tutorial", "partner-handle-reserve"];

/** The visitor already answered the notice (declined: no tracker loads), so it is not on screen. */
async function noticeAnswered(page: Page) {
  await page.addInitScript((key) => window.localStorage.setItem(key, "false"), CONSENT_KEY);
}

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
async function expectAboveNotice(page: Page, testIds: string[], label: string) {
  const top = await noticeTop(page);
  for (const id of testIds) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, `${label} ${id}`).not.toBeNull();
    expect(box!.y, `${label} ${id}`).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, `${label} ${id} ends above the cookie notice`).toBeLessThanOrEqual(top);
  }
}

/** The sticky bar of the phone (StickyCta), told apart by its line. */
const stickyOf = (page: Page) =>
  page.locator("div[aria-hidden]", { has: page.locator("a[href]") }).filter({ hasText: pt.PartnerPage.stickySub });

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

  test("§6 item 1: promise, App Store button, the three steps and the @ are whole above the notice, with and without photo and logo", async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: pt.CookieBanner.accept })).toBeVisible();
      const cta = page.getByTestId("partner-page-cta");
      await expect(cta).toHaveText(pt.PartnerPage.download);
      await expect(cta).toHaveAttribute("href", /apps\.apple\.com/);
      await expect(page.getByTestId("partner-page-play-store")).toHaveCount(0);
      await expect(page.getByTestId("partner-promise")).toHaveText(pt.PartnerPage.heroTitle);
      // On a phone, the short line under the promise, and not the long one.
      await expect(page.getByTestId("partner-promise-sub-short")).toHaveText(pt.PartnerPage.heroSubShort);
      await expect(page.getByTestId("partner-promise-sub")).toBeHidden();
      await expect(page.getByTestId("partner-tutorial-step")).toHaveText([
        pt.PartnerPage.tutorialStep1,
        pt.PartnerPage.tutorialStep2,
        pt.PartnerPage.tutorialStep3Ios,
      ]);
      await expectAboveNotice(page, FIRST_FOLD, path);
    }
  });

  test("§3: the photo shows when the welcome POI has one, and is lower under a two-line name", async ({ page }) => {
    await page.goto(WITH_PHOTO);
    expect((await page.getByTestId("partner-photo").boundingBox())!.height).toBe(88);
    await page.goto(LONG_NAME);
    expect((await page.getByTestId("partner-photo").boundingBox())!.height).toBe(64);
    // The name of 24 characters takes its two lines (24/28 at 390 px).
    expect((await page.getByTestId("partner-name").boundingBox())!.height).toBeGreaterThanOrEqual(56);
    await page.goto(NO_LOGO_NO_PHOTO);
    await expect(page.getByTestId("partner-photo")).toHaveCount(0);
  });

  test("BR-B2B-009 item 1, BR-B2B-067 item 3: the first fold has no days, gift nor benefit", async ({ page }) => {
    await page.goto(WITH_PHOTO);
    const text = [
      await page.getByTestId("partner-identity").innerText(),
      await page.getByTestId("partner-promise").innerText(),
      await page.getByTestId("partner-tutorial").innerText(),
      await page.getByTestId("partner-handle-reserve").innerText(),
    ].join(" ");
    expect(text).not.toMatch(/\bdias?\b|presente|gr[aá]tis|desconto|\bhoras?\b/i);
  });

  test("the copy button copies the @ the app answers to, in a 44 x 44 target", async ({ page }) => {
    await page.goto(LONG_NAME);
    await expect(page.getByTestId("partner-handle-reserve")).toContainText("@e2e-com-logo");
    const copy = page.getByTestId("partner-handle-copy");
    const box = (await copy.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await copy.click();
    await expect(copy).toHaveText(pt.PartnerPage.handleCopied);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("@e2e-com-logo");
  });

  test("§6 item 6, DS-COR-002: the store button and the notice's Accept are Tuggi blue with white ink", async ({ page }) => {
    await page.goto(WITH_PHOTO);
    for (const el of [page.getByTestId("partner-page-cta"), page.getByRole("button", { name: pt.CookieBanner.accept })]) {
      await expect(el).toHaveCSS("background-color", "rgb(0, 168, 232)");
      await expect(el).toHaveCSS("color", "rgb(255, 255, 255)");
    }
    expect((await page.getByTestId("partner-page-cta").boundingBox())!.height).toBe(52);
  });

  test("§6 item 7: the sticky bar does not appear while the cookie notice is open", async ({ page }) => {
    await page.goto(WITH_PHOTO);
    await noticeTop(page);
    await page.evaluate(() => {
      const cta = document.getElementById("partner-cta")!;
      window.scrollTo(0, cta.getBoundingClientRect().bottom + window.scrollY + 10);
    });
    await page.waitForTimeout(500);
    await expect(stickyOf(page)).toHaveAttribute("aria-hidden", "true");
  });

  test("§6 item 10, BR-B2B-002: the tap on the button records the click with partner_id and writes the link", async ({ page, context }) => {
    // A stand-in for gtag.js, so the store click is observable without sending anything to GA4.
    await page.addInitScript(() => {
      const w = window as unknown as { gtag: (...args: unknown[]) => void; __gtag: unknown[][] };
      w.__gtag = [];
      w.gtag = (...args: unknown[]) => w.__gtag.push(args);
      // What the tap writes to the pasteboard, kept before the store tab takes the focus.
      const clip = window as unknown as { __clipboard: string[] };
      clip.__clipboard = [];
      const write = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = (text: string) => {
        clip.__clipboard.push(text);
        return write(text).catch(() => undefined);
      };
    });
    await context.route(/apps\.apple\.com/, (route) => route.fulfill({ status: 204, body: "" }));
    const captures: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && new URL(req.url()).pathname === "/api/attribution") captures.push(req.postData() ?? "");
    });
    await page.goto(WITH_PHOTO);
    await expect.poll(() => captures.length).toBe(1);
    expect(JSON.parse(captures[0]).partner_id).toBe(HOTEL_ID);

    await page.getByTestId("partner-page-cta").click();
    const clicks = () =>
      page.evaluate(() =>
        (window as unknown as { __gtag: unknown[][] }).__gtag.filter((call) => call[0] === "event" && call[1] === "click_store")
      );
    await expect.poll(async () => (await clicks()).length).toBe(1);
    expect((await clicks())[0][2]).toMatchObject({ store: "app_store", placement: "partner_page", partner_id: HOTEL_ID });
    const written = await page.evaluate(() => (window as unknown as { __clipboard: string[] }).__clipboard);
    expect(written).toHaveLength(1);
    expect(written[0]).toMatch(/tuggi_click_[0-9a-f-]{36}/);
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

  test("§6 item 1: the Google Play button and the Android steps are whole above the notice, with and without photo and logo", async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      await expect(page.getByTestId("partner-page-cta")).toHaveAttribute("href", /play\.google\.com/);
      await expect(page.getByTestId("partner-tutorial-step").nth(2)).toHaveText(pt.PartnerPage.tutorialStep3Android);
      await expectAboveNotice(page, FIRST_FOLD, path);
    }
  });
});

test.describe("iPhone, 390 x 844, notice answered", () => {
  test.use({
    userAgent: devices["iPhone 13"].userAgent,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
  });

  test("§6 item 2: the promise and the button end above 400 px", async ({ page }) => {
    await noticeAnswered(page);
    for (const path of ALL_PAGES) {
      await page.goto(path);
      for (const id of ["partner-promise", "partner-page-cta"]) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box.y + box.height, `${path} ${id}`).toBeLessThanOrEqual(400);
      }
    }
  });

  test("§6 item 7: the sticky bar appears once the button leaves the screen and leaves at the footer", async ({ page }) => {
    await noticeAnswered(page);
    await page.goto(LONG_NAME);
    const sticky = stickyOf(page);
    await expect(sticky).toHaveAttribute("aria-hidden", "true");
    await page.evaluate(() => {
      const cta = document.getElementById("partner-cta")!;
      window.scrollTo(0, cta.getBoundingClientRect().bottom + window.scrollY + 10);
    });
    await expect(sticky).toHaveAttribute("aria-hidden", "false");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(sticky).toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("the page in the server HTML", () => {
  test.use({ userAgent: devices["iPhone 13"].userAgent });

  const mainOf = async (page: Page, path: string) => {
    const response = await page.request.get(path, { headers: { "user-agent": devices["iPhone 13"].userAgent } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    return html.slice(html.indexOf("<main"), html.lastIndexOf("</main>"));
  };

  test("§6 item 5: the steps are said once, and the old band and app preview are gone", async ({ page }) => {
    for (const path of ALL_PAGES) {
      const main = await mainOf(page, path);
      expect(main.split('data-testid="partner-tutorial"').length - 1, path).toBe(1);
      expect(main.split("<ol").length - 1, path).toBe(1);
      expect(main).not.toContain('data-testid="partner-app-preview"');
      expect(main).not.toContain(pt.PartnerPage.step1Title);
    }
  });

  test("§6 item 3: no chip on any partner page, and 'by' with the Tuggi lockup by the name", async ({ page }) => {
    for (const path of [...ALL_PAGES, "/@e2e.criadora"]) {
      const main = await mainOf(page, path);
      expect(main).not.toContain("partner-page-chip");
      expect(main).not.toContain("Parceiro do Tuggi");
      expect(main).not.toContain("Criadores Tuggi");
      expect(main).toContain('data-testid="partner-by-tuggi"');
    }
  });

  test("§6 item 4, BR-B2B-070 item 2: the plate shows only the approved logo; without it, the name alone", async ({ page }) => {
    const branded = await mainOf(page, WITH_PHOTO);
    expect(branded).toMatch(/data-testid="partner-logo"[^>]*partner-logos|partner-logos[^>]*data-testid="partner-logo"/);
    const plain = await mainOf(page, NO_LOGO_NO_PHOTO);
    expect(plain).not.toContain('data-testid="partner-logo"');
    expect(plain).not.toContain('data-testid="partner-initial"');
  });

  test("DS-COMPONENTE-110: a description that is missing leaves no 'about' block and no generic line", async ({ page }) => {
    const main = await mainOf(page, NO_LOGO_NO_PHOTO);
    expect(main).not.toContain(pt.PartnerPage.aboutTitle);
    expect(main).not.toContain(pt.PartnerPage.partnerLead);
  });
});

test.describe("§6 item 3: the colour of the band", () => {
  test.use({ userAgent: devices["iPhone 13"].userAgent, viewport: { width: 390, height: 844 } });

  test("on, the band is the pair the function returned and the lockup has one ink; off, the band is --color-tuggi-bg", async ({ page }) => {
    await noticeAnswered(page);
    await page.goto(WITH_PHOTO);
    const band = page.getByTestId("partner-identity");
    await expect(band).toHaveCSS("background-color", "rgb(15, 90, 107)");
    await expect(band).toHaveCSS("color", "rgb(255, 255, 255)");
    const fills = await page
      .getByTestId("partner-by-tuggi")
      .locator("path, ellipse")
      .evaluateAll((nodes) => [...new Set(nodes.map((n) => getComputedStyle(n).fill))]);
    expect(fills).toEqual(["rgb(255, 255, 255)"]);

    await page.goto(LONG_NAME);
    await expect(page.getByTestId("partner-identity")).toHaveCSS("background-color", "rgb(247, 249, 252)");
  });
});

test.describe("a computer, 1440", () => {
  test.use({
    userAgent: MAC_UA,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
  });

  test("§6 item 8: no blue button; the steps with both phones, the badges and the QR on the first screen", async ({ page }) => {
    await noticeAnswered(page);
    await page.goto(WITH_PHOTO);
    await expect(page.getByTestId("partner-page-cta")).toHaveCount(0);
    // The header lost its "Baixar o Tuggi".
    await expect(page.getByRole("link", { name: pt.PartnerPage.download })).toHaveCount(0);
    await expect(page.getByTestId("app-preview-qr")).toHaveCount(1);
    // From 640 px, the long line under the promise, and not the short one.
    await expect(page.getByTestId("partner-promise-sub")).toHaveText(pt.PartnerPage.heroSub);
    await expect(page.getByTestId("partner-promise-sub-short")).toBeHidden();
    for (const id of ["partner-hero-qr", "partner-page-app-store", "partner-page-play-store"]) {
      const box = (await page.getByTestId(id).boundingBox())!;
      expect(box.y + box.height, id).toBeLessThanOrEqual(900);
    }
    const steps = page.getByTestId("partner-tutorial-step");
    await expect(steps.nth(0)).toHaveText(pt.AppPreview.qr_caption);
    await expect(steps.nth(2)).toContainText(pt.PartnerPage.tutorialStep3Ios);
    await expect(steps.nth(2)).toContainText(pt.PartnerPage.tutorialStep3Android);
  });

  test("§2: the identity band lines up with the column of the promise, with and without the photo", async ({ page }) => {
    await noticeAnswered(page);
    for (const path of [WITH_PHOTO, NO_LOGO_SHORT]) {
      await page.goto(path);
      const promise = (await page.getByTestId("partner-promise").boundingBox())!;
      const first = path === WITH_PHOTO ? page.getByTestId("partner-logo") : page.getByTestId("partner-name");
      const start = (await first.boundingBox())!;
      // The plate's padding puts the logo a few pixels in; the name starts at the column.
      expect(Math.abs(start.x - promise.x), path).toBeLessThanOrEqual(12);
    }
  });
});
