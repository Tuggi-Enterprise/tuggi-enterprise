import { test, expect, devices, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT, E2E_PUBLISHABLE_KEY } from "../../playwright.config";

/**
 * The invite page of the referral programme — `/c/<code>`, card #840 (rule in
 * card #836; the BR id is pending at the `produto`, cite it here once it exists).
 *
 * What is proven:
 *  - two states only, valid and inactive — no "exhausted" for the friend
 *    (#836, update of 2026-10-04);
 *  - the inviter is named by nickname and nothing else (BR-USUARIO-042);
 *  - the code reaches the clipboard only through the Copy tap, inside the
 *    gesture (#836 item 1), and a store tap afterwards does not overwrite it
 *    with a partner token (#840 item 5);
 *  - the page is noindex (#840 item 7) and reads with the publishable key.
 *
 * The data comes from `get_referral_code_public` in mock-supabase-server.mjs,
 * fixture `7K3MQ2` → `PioneerMystic510`.
 */

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;
const VALID = "7K3MQ2";
const NICKNAME = "PioneerMystic510";

test.use({
  ...devices["iPhone 13"],
  browserName: "chromium",
  extraHTTPHeaders: { "accept-language": "en-US,en;q=0.9" },
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

test.describe("invite page /c/<code> — card #840, BR-USUARIO-042", () => {
  test("a valid code shows the nickname, the code and Copy, and is noindex", async ({ page }) => {
    await page.goto(`/c/${VALID}`);

    await expect(page.getByTestId("referral-valid")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${NICKNAME} invited you`);
    await expect(page.getByTestId("referral-code")).toHaveText(VALID);
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();

    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      new RegExp(NICKNAME)
    );
  });

  test("a code typed in lower case is the same invite", async ({ page }) => {
    await page.goto(`/c/${VALID.toLowerCase()}`);
    await expect(page.getByTestId("referral-code")).toHaveText(VALID);
  });

  test("an unknown code renders the inactive page, still with the stores", async ({ page }) => {
    await page.goto("/c/ZZZZZZ");

    await expect(page.getByTestId("referral-inactive")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "This invite isn't active anymore"
    );
    await expect(page.getByTestId("referral-code")).toHaveCount(0);
    await expect(page.getByTestId("referral-stores").locator('a[href^="https://apps.apple.com/"]')).toHaveCount(1);
    await expect(page.getByTestId("referral-stores").locator('a[href^="https://play.google.com/"]')).toBeVisible();
    // The dead segment is not echoed into the share tags.
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  });

  test("a segment that can never be a code is not forwarded to the database", async ({
    page,
    request,
  }) => {
    // `O` and `0` are outside the alphabet (#836), so this is malformed by shape.
    await page.goto("/c/O0O0O0");
    await expect(page.getByTestId("referral-inactive")).toBeVisible();

    const lookups = (await (await request.get(`${MOCK_BASE}/__referral-lookups`)).json()) as string[];
    expect(lookups).not.toContain("O0O0O0");
  });

  test("Copy writes the code inside the tap, and a store tap does not overwrite it (#836 item 1, #840 item 5)", async ({
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

    expect(writes.map((w) => w.text)).toEqual([VALID]);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(VALID);
  });

  test("store links carry the stamps tag and no partner token", async ({ page }) => {
    await page.goto(`/c/${VALID}`);
    const play = await page.getByTestId("referral-stores").locator('a[href^="https://play.google.com/"]').getAttribute("href");
    expect(play).toBeTruthy();
    const referrer = new URL(play!).searchParams.get("referrer") ?? "";
    expect(referrer).toContain("utm_campaign=stamps");
    expect(referrer).not.toContain("tuggi_click_");
  });

  test("the lookup uses the publishable key, not service_role", async ({ page, request }) => {
    await page.goto(`/c/${VALID}`);
    const keys = (await (await request.get(`${MOCK_BASE}/__apikeys`)).json()) as {
      byRoute: Record<string, string>;
    };
    expect(keys.byRoute["POST /rest/v1/rpc/get_referral_code_public"]).toBe(E2E_PUBLISHABLE_KEY);
  });
});

test.describe("invite page /c/<code> — language", () => {
  // `locale` and not an `accept-language` header: Chromium derives the header
  // from the context locale, and the device preset above sets it to en-US.
  test.use({ locale: "it-IT", extraHTTPHeaders: {} });

  test("the language follows the visitor, with no locale in the shared URL", async ({ page }) => {
    const response = await page.goto(`/c/${VALID}`);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(`/c/${VALID}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
  });
});
