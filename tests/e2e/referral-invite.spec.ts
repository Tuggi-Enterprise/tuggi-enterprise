import { test, expect, devices, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT, E2E_PUBLISHABLE_KEY } from "../../playwright.config";
import { visitorHeaders } from "./visitor-headers";

/**
 * The invite page of the referral programme — `/c/@nome` and `/c/<code>`,
 * cards #840 and #1135, BR-MONETIZACAO-085 item 2.
 *
 * What is proven:
 *  - the link carries an @ or a code, and both open the same page (item 2.a);
 *  - two states only, valid and inactive, and the inactive one is the same for
 *    an unknown @ and an invalid code (item 2.b); no "exhausted" for the friend
 *    (#836, update of 2026-10-04);
 *  - the inviter is named by @ and nothing else (BR-USUARIO-042), and nothing
 *    on the page promises the friend hours or any gain (ceiling 1);
 *  - the invite reaches the clipboard only inside a tap, Copy or the App Store
 *    badge (#836 item 1, item 2.e.ii), never with a partner token (#840 item 5);
 *  - the Play badge carries the invite in `referrer` (item 2.e.i);
 *  - the page is noindex (#840 item 7) and reads with the publishable key.
 *
 * The data comes from `get_referral_code_public` in mock-supabase-server.mjs:
 * code `7K3MQ2` and the names `@PioneerMystic510` and `@oldpioneer`, all
 * pointing to `PioneerMystic510`.
 */

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;
const VALID = "7K3MQ2";
const NICKNAME = "PioneerMystic510";
const AT = `@${NICKNAME}`;
/** Words of a gain the friend may not be promised (BR-MONETIZACAO-085, ceiling 1), in en. */
const GAIN_WORDS = /\b(hours?|free|earn|gift|unlock|discount|win)\b/i;

test.use({
  ...devices["iPhone 13"],
  browserName: "chromium",
  extraHTTPHeaders: { ...visitorHeaders(), "accept-language": "en-US,en;q=0.9" },
  permissions: ["clipboard-read", "clipboard-write"],
});

/** Store links never resolve in the harness; the tap is what is under test. */
async function stubTheStores(page: Page): Promise<void> {
  await page.context().route(/apps\.apple\.com|play\.google\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html>store stub</html>" })
  );
}

/**
 * Records every `clipboard.writeText` and whether a click was being dispatched
 * at the call — `navigator.userActivation` is `true` under automation and
 * cannot tell a tap from a mount effect (see clipboard-attribution.spec.ts).
 */
async function spyOnClipboard(page: Page): Promise<{ text: string; insideTap: boolean }[]> {
  const writes: { text: string; insideTap: boolean }[] = [];
  await page.exposeFunction("__recordReferralWrite", (w: { text: string; insideTap: boolean }) => {
    writes.push(w);
  });
  await page.addInitScript(() => {
    const record = (window as unknown as {
      __recordReferralWrite?: (w: { text: string; insideTap: boolean }) => void;
    }).__recordReferralWrite;
    let dispatching = 0;
    window.addEventListener(
      "click",
      () => {
        dispatching++;
        setTimeout(() => {
          dispatching--;
        }, 0);
      },
      true
    );
    const real = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: navigator.clipboard?.readText?.bind(navigator.clipboard),
        writeText: (text: string) => {
          record?.({ text, insideTap: dispatching > 0 });
          return real ? real(text) : Promise.resolve();
        },
      },
    });
  });
  return writes;
}

test.describe("invite page /c/ — BR-MONETIZACAO-085 item 2, BR-USUARIO-042", () => {
  test("BR-MONETIZACAO-085 2.b: a valid code shows the @ heading, the code and Copy, and is noindex", async ({ page }) => {
    await page.goto(`/c/${VALID}`);

    await expect(page.getByTestId("referral-valid")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Join ${AT}'s caravan`);
    await expect(page.getByTestId("referral-code")).toHaveText(VALID);
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();

    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      new RegExp(NICKNAME)
    );
  });

  test("BR-MONETIZACAO-085 2.a: the @ link opens the same page, showing the @ next to Copy", async ({ page }) => {
    await page.goto(`/c/${AT}`);

    await expect(page.getByTestId("referral-valid")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Join ${AT}'s caravan`);
    await expect(page.getByTestId("referral-code")).toHaveText(AT);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /\/c\/@PioneerMystic510$/);
  });

  test("BR-MONETIZACAO-085 2.d: another spelling or an old @ shows the inviter's current @", async ({ page, request }) => {
    await page.goto("/c/@pioneer.mystic510");
    await expect(page.getByTestId("referral-code")).toHaveText(AT);

    await page.goto("/c/%40oldpioneer");
    await expect(page.getByTestId("referral-code")).toHaveText(AT);

    const lookups = (await (await request.get(`${MOCK_BASE}/__referral-lookups`)).json()) as string[];
    expect(lookups).toContain("@pioneer.mystic510");
    expect(lookups).toContain("@oldpioneer");
  });

  test("a code typed in lower case is the same invite", async ({ page }) => {
    await page.goto(`/c/${VALID.toLowerCase()}`);
    await expect(page.getByTestId("referral-code")).toHaveText(VALID);
  });

  test("BR-MONETIZACAO-085 2.b: an unknown @ and an unknown code render the same inactive page, still with the stores", async ({
    page,
  }) => {
    const inactive = async (path: string) => {
      await page.goto(path);
      await expect(page.getByTestId("referral-inactive")).toBeVisible();
      await expect(page.getByTestId("referral-code")).toHaveCount(0);
      await expect(page.getByTestId("app-preview")).toHaveCount(0);
      await expect(page.getByTestId("referral-stores").locator('a[href^="https://apps.apple.com/"]')).toHaveCount(1);
      await expect(page.getByTestId("referral-stores").locator('a[href^="https://play.google.com/"]')).toBeVisible();
      // The dead segment is not echoed into the share tags.
      await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
      return page.locator("main").innerText();
    };

    const byCode = await inactive("/c/ZZZZZZ");
    const byName = await inactive("/c/@nobody.here");
    expect(byName).toBe(byCode);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find this invite");
  });

  test("a segment that can never be a code or an @ is not forwarded to the database", async ({
    page,
    request,
  }) => {
    // `O` and `0` are outside the alphabet (#836); `@a` is under the three
    // characters of an @ (BR-USUARIO-050 item 1.b); `@-ana` opens with a separator.
    for (const segment of ["O0O0O0", "@a", "@-ana"]) {
      await page.goto(`/c/${segment}`);
      await expect(page.getByTestId("referral-inactive")).toBeVisible();
    }

    const lookups = (await (await request.get(`${MOCK_BASE}/__referral-lookups`)).json()) as string[];
    expect(lookups).not.toContain("O0O0O0");
    expect(lookups).not.toContain("@a");
    expect(lookups).not.toContain("@-ana");
  });

  test("BR-MONETIZACAO-085 ceiling 1: nothing on the friend's page promises hours or a gain", async ({ page }) => {
    for (const path of [`/c/${VALID}`, `/c/${AT}`]) {
      await page.goto(path);
      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(GAIN_WORDS);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description ?? "").not.toMatch(GAIN_WORDS);
    }
  });

  test("#836 item 1: Copy writes the code inside the tap, and the App Store tap writes the same, never a partner token (#840 item 5)", async ({
    page,
  }) => {
    await stubTheStores(page);
    const writes = await spyOnClipboard(page);
    await page.goto(`/c/${VALID}`);
    await page.waitForLoadState("networkidle");

    // Nothing reaches the clipboard on load.
    expect(writes).toEqual([]);

    await page.getByRole("button", { name: "Copy" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(writes).toEqual([{ text: VALID, insideTap: true }]);

    const appStore = page.getByTestId("referral-stores").locator('a[href^="https://apps.apple.com/"]');
    const [popup] = await Promise.all([page.waitForEvent("popup"), appStore.click()]);
    await popup.close();

    expect(writes).toEqual([
      { text: VALID, insideTap: true },
      { text: VALID, insideTap: true },
    ]);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(VALID);
  });

  test("BR-MONETIZACAO-085 2.e.ii: on the @ page, the App Store tap copies the @ inside the tap", async ({ page }) => {
    await stubTheStores(page);
    const writes = await spyOnClipboard(page);
    await page.goto(`/c/${AT}`);
    await page.waitForLoadState("networkidle");
    expect(writes).toEqual([]);

    const appStore = page.getByTestId("referral-stores").locator('a[href^="https://apps.apple.com/"]');
    const [popup] = await Promise.all([page.waitForEvent("popup"), appStore.click()]);
    await popup.close();

    expect(writes).toEqual([{ text: AT, insideTap: true }]);
    expect(writes.some((w) => w.text.includes("tuggi_click_"))).toBe(false);
  });

  test("BR-MONETIZACAO-085 2.e.i: the Play badge carries the invite in referrer, with the stamps tag and no partner token", async ({
    page,
  }) => {
    const referrerOf = async (path: string) => {
      await page.goto(path);
      const play = await page
        .getByTestId("referral-stores")
        .locator('a[href^="https://play.google.com/"]')
        .getAttribute("href");
      expect(play).toBeTruthy();
      return new URLSearchParams(new URL(play!).searchParams.get("referrer") ?? "");
    };

    const byCode = await referrerOf(`/c/${VALID}`);
    expect(byCode.get("utm_campaign")).toBe("stamps");
    expect(byCode.get("tuggi_invite")).toBe(VALID);
    expect(byCode.toString()).not.toContain("tuggi_click_");

    const byName = await referrerOf("/c/@pioneer.mystic510");
    expect(byName.get("tuggi_invite")).toBe(AT);

    // No invite, nothing to carry.
    const dead = await referrerOf("/c/ZZZZZZ");
    expect(dead.get("utm_campaign")).toBe("stamps");
    expect(dead.has("tuggi_invite")).toBe(false);
  });

  test("the lookup uses the publishable key, not service_role", async ({ page, request }) => {
    await page.goto(`/c/${VALID}`);
    const keys = (await (await request.get(`${MOCK_BASE}/__apikeys`)).json()) as {
      byRoute: Record<string, string>;
    };
    expect(keys.byRoute["POST /rest/v1/rpc/get_referral_code_public"]).toBe(E2E_PUBLISHABLE_KEY);
  });
});

/**
 * The preview of what happens in the app — DS-COMPONENTE-117, spec §6. Chosen
 * on the server from the user agent: one frame on a phone, the QR and both
 * frames on a computer. Inert: the frame is hidden from assistive technology
 * and holds no button.
 */
test.describe("invite page /c/ — app preview, DS-COMPONENTE-117", () => {
  test("DS-COMPONENTE-117: an iPhone sees the iPhone frame with Paste, and the result names the @", async ({ page }) => {
    await page.goto(`/c/${AT}`);
    const preview = page.getByTestId("app-preview");
    await expect(preview).toBeVisible();
    await expect(preview.getByTestId("app-preview-frame-ios")).toBeVisible();
    await expect(preview.getByTestId("app-preview-frame-android")).toHaveCount(0);
    await expect(page.getByTestId("app-preview-qr")).toHaveCount(0);
    await expect(preview.getByTestId("app-preview-step-ios")).toHaveText(
      "On the “Did someone invite you to Tuggi?” screen, tap Paste."
    );
    await expect(preview.getByTestId("app-preview-result")).toHaveText(`You're in ${AT}'s caravan`);
  });

  test("DS-COMPONENTE-117: the frame is inert — hidden from assistive technology, with no button inside", async ({ page }) => {
    await page.goto(`/c/${AT}`);
    const frame = page.getByTestId("app-preview-frame-ios");
    await expect(frame).toHaveAttribute("aria-hidden", "true");
    await expect(frame.locator("button, a, input")).toHaveCount(0);
    expect(await frame.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    // The accessible content is the steps.
    const snapshot = await page.getByTestId("app-preview").ariaSnapshot();
    expect(snapshot).toContain("tap Paste");
    expect(snapshot).not.toContain("Paste the invite you got");
    expect(snapshot).not.toContain("button");
  });

  test("DS-COMPONENTE-117: the variant is in the server HTML, chosen by the user agent", async ({ request }) => {
    const html = async (ua: string) =>
      (await request.get(`/c/${VALID}`, { headers: { "user-agent": ua, ...visitorHeaders() } })).text();

    const iphone = await html(devices["iPhone 13"].userAgent);
    expect(iphone).toContain('data-testid="app-preview-frame-ios"');
    expect(iphone).not.toContain('data-testid="app-preview-frame-android"');

    const android = await html(devices["Pixel 7"].userAgent);
    expect(android).toContain('data-testid="app-preview-frame-android"');
    expect(android).not.toContain('data-testid="app-preview-frame-ios"');
    // Android shows the field already filled with what the Play referrer carries.
    expect(android).toContain(`>${VALID}<`);

    const desktop = await html(devices["Desktop Chrome"].userAgent);
    expect(desktop).toContain('data-testid="app-preview-qr"');
    expect(desktop).toContain('data-testid="app-preview-frame-ios"');
    expect(desktop).toContain('data-testid="app-preview-frame-android"');
  });
});

test.describe("invite page /c/ — on a computer, DS-COMPONENTE-117", () => {
  const desktop = devices["Desktop Chrome"];
  test.use({ viewport: desktop.viewport, userAgent: desktop.userAgent, deviceScaleFactor: 1, isMobile: false, hasTouch: false, extraHTTPHeaders: { ...visitorHeaders(), "accept-language": "en-US,en;q=0.9" } });

  test("DS-COMPONENTE-117: the QR of the page comes before the badges, with its short address", async ({ page }) => {
    await page.goto("/c/@pioneer.mystic510");
    const qr = page.getByTestId("app-preview-qr");
    await expect(qr).toBeVisible();
    await expect(qr.getByRole("img", { name: "Point your phone's camera here to get Tuggi." })).toBeVisible();
    // The canonical address, never the spelling that came in the URL.
    await expect(page.getByTestId("app-preview-qr-url")).toHaveText(`tuggi.app/c/${AT}`);
    const qrBox = (await qr.boundingBox())!;
    const badgeBox = (await page.getByTestId("referral-stores").locator("a").first().boundingBox())!;
    expect(qrBox.y).toBeLessThan(badgeBox.y);
    await expect(page.getByTestId("app-preview-frame-ios")).toBeVisible();
    await expect(page.getByTestId("app-preview-frame-android")).toBeVisible();
  });
});

/**
 * The partner page gets the same preview (spec §6.3), naming the partner and
 * nothing else — BR-B2B-067 item 3: no benefit on the partner's page.
 */
test.describe("partner page /d/ — app preview, DS-COMPONENTE-117, BR-B2B-067", () => {
  test("DS-COMPONENTE-117, BR-B2B-067 item 3: both hero variants show the preview with the partner's @ and no caravan body", async ({
    page,
  }) => {
    for (const slug of ["e2e-sem-logo", "e2e-com-logo"]) {
      await page.goto(`/d/${slug}?lang=en`);
      const preview = page.getByTestId("app-preview");
      await expect(preview).toBeVisible();
      await expect(preview.getByTestId("app-preview-frame-ios")).toHaveCount(1);
      await expect(preview.getByTestId("app-preview-frame-android")).toHaveCount(0);
      await expect(preview.getByTestId("app-preview-result")).toHaveText(`You came through @${slug}`);
      const text = await preview.innerText();
      expect(text).not.toMatch(/caravan/i);
      expect(text).not.toMatch(GAIN_WORDS);
    }
  });

  test("DS-COMPONENTE-117: a slug with no partner gets no preview", async ({ page }) => {
    for (const slug of ["e2e-desconhecido", "e2e-em-breve", "e2e-recusado"]) {
      await page.goto(`/d/${slug}?lang=en`);
      await expect(page.getByTestId("app-preview")).toHaveCount(0);
    }
  });
});

test.describe("invite page /c/ — language", () => {
  // `locale` and not an `accept-language` header: Chromium derives the header
  // from the context locale, and the device preset above sets it to en-US.
  test.use({ locale: "it-IT", extraHTTPHeaders: visitorHeaders() });

  test("the language follows the visitor, with no locale in the shared URL", async ({ page }) => {
    const response = await page.goto(`/c/${VALID}`);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(`/c/${VALID}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
  });
});
