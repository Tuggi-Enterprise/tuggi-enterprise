import { test, expect, devices, type Page } from "@playwright/test";
import { APP_STORE_URL } from "../../src/lib/app-meta";
import { ATTRIBUTION_COOKIE, UUID_PATTERN, serializeAttribution } from "../../src/lib/attribution";
import { CONSENT_GRANTED, CONSENT_KEY } from "../../src/lib/consent";
import { writeClickTokenToClipboard } from "../../src/lib/conversionHooks";

/**
 * The iOS half of the attribution — contract §5, BR-B2B-002.
 *
 * There is no equivalent of the Play Install Referrer on the App Store: no URL
 * parameter reaches the app after an install, and a Universal Link without the
 * app installed dies in the browser (Apple's own documentation, measured
 * 2026-08-18). The pasteboard is the only deterministic channel for a visitor
 * who does not have the app yet, which makes it the whole iOS channel.
 *
 * Two things this file exists to keep true, and both were false in production
 * without anything going red:
 *
 *  1. THE WRITE HAPPENS INSIDE THE GESTURE. WebKit rejects
 *     `clipboard.writeText` called outside a user gesture and the `catch` that
 *     wrapped it swallowed the rejection, so the channel never worked once.
 *     What tells a handler apart from an effect is `insideTap` below, and it
 *     is not the obvious signal — see the field's own note.
 *  2. IT HAPPENS AT EVERY WAY OUT, not only on the partner page. It used to
 *     live in `PartnerHero` and in the campaign badge alone, so a tourist who
 *     scanned the QR and then downloaded from the home page, the footer, the
 *     pricing page or a tour page lost the attribution entirely on iOS — the
 *     same defect the Android side had until 9a96cfc, where the referrer was
 *     on 2 of the 11 exits.
 *
 * The whole file emulates an iPhone. It is not decoration: `AppDownloadButton`,
 * `StickyCta` and `DrivePricing` choose their store from the UA, so on a
 * desktop UA their link is not the App Store at all and the CTA under test
 * would not be the one a tourist taps.
 */

test.use({
  ...devices["iPhone 13"],
  // The suite has one Chromium project; what is borrowed above is the phone,
  // not the engine.
  browserName: "chromium",
  // Brazil: exempt from prior consent (BR-USUARIO-033, item 1) and the only
  // territory with partners today. The gated half is at the bottom of the file.
  // A local build carries no country header, and "not determined" is gated.
  extraHTTPHeaders: { "x-forwarded-for": "198.51.100.231", "x-vercel-ip-country": "BR" },
  permissions: ["clipboard-read", "clipboard-write"],
});

/** A partner page whose capture plants the first touch this file spends. */
const PARTNER_PATH = "/d/e2e-sem-logo?lang=en";
const CAMPAIGN_PATH = "/d/e2e-com-logo?lang=en";
/** A tour page: the only place `AppDownloadButton` is rendered. */
const TOUR_PATH = "/en/tours/brazil/as-maravilhas-do-rio-em-um-dia";

interface ClipboardWrite {
  text: string;
  /**
   * Whether the call happened while a click event was being dispatched — which
   * is what WebKit means by "within the scope of a user gesture (such as click
   * or touch event handlers)".
   *
   * IT IS NOT `navigator.userActivation`, AND THAT WAS MEASURED. Chromium
   * grants transient activation to a page it navigated to under automation, so
   * `userActivation.isActive` reads `true` inside a mount effect for the first
   * five seconds of the page: a spy that trusted it passed a deliberately
   * broken build that wrote from `useEffect`. The flag below is raised by a
   * capture-phase listener and lowered by a task queued from it, so it is up
   * only while a real click is being handled.
   */
  insideTap: boolean;
}

/**
 * Records every `clipboard.writeText` with the activation state at the call,
 * and still performs the real one.
 *
 * The record is kept in the TEST process and not in the page: the partner
 * page's floating CTA assigns `window.location`, which throws away anything
 * the document was holding — and that CTA is one of the exits under test.
 */
async function spyOnClipboard(page: Page): Promise<ClipboardWrite[]> {
  const writes: ClipboardWrite[] = [];
  await page.exposeFunction("__recordClipboardWrite", (write: ClipboardWrite) => {
    writes.push(write);
  });
  // Installed before any script of the page runs, so a write from a mount
  // effect is caught as well as one from a handler — telling them apart is the
  // whole point.
  await page.addInitScript(() => {
    const record = (window as unknown as {
      __recordClipboardWrite?: (w: { text: string; insideTap: boolean }) => void;
    }).__recordClipboardWrite;

    // Up while a click is being dispatched, down on the task queued from the
    // capture phase — which runs after the whole dispatch, and before anything
    // a handler may have deferred with a timer of its own.
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

/** Store links never resolve in the harness; the tap is what is under test. */
async function stubTheStores(page: Page): Promise<void> {
  await page.context().route(/apps\.apple\.com|play\.google\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html>store stub</html>" })
  );
}

/** The click id this browser is carrying, as the site itself reads it. */
async function storedClickId(page: Page): Promise<string | null> {
  const cookie = (await page.context().cookies()).find((c) => c.name === ATTRIBUTION_COOKIE);
  if (!cookie) return null;
  const parsed = JSON.parse(decodeURIComponent(cookie.value)) as { click_id?: string };
  return parsed.click_id ?? null;
}

/** Visits a partner page and returns the click id its capture planted. */
async function captureFirstTouch(page: Page): Promise<string> {
  await page.goto(PARTNER_PATH);
  await expect.poll(async () => await storedClickId(page)).toMatch(UUID_PATTERN);
  return (await storedClickId(page))!;
}

/**
 * Taps every App Store link of the current page that a thumb could reach, and
 * answers how many it tapped.
 *
 * The links are matched by their destination and not by their label: the
 * destination is what makes a CTA the iOS way out, and a badge translated into
 * four languages would need four locators. What is skipped is what a tourist
 * cannot tap either — the sticky bar parked off-screen under
 * `pointer-events: none`, which has a test of its own below.
 */
async function tapEveryAppStoreLink(page: Page): Promise<number> {
  const links = page.locator(`a[href="${APP_STORE_URL}"]`);
  const count = await links.count();
  let tapped = 0;
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const reachable = await link.evaluate((el) => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return false;
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.pointerEvents === "none" ||
          style.opacity === "0"
        ) {
          return false;
        }
      }
      return true;
    });
    if (!reachable) continue;
    await link.scrollIntoViewIfNeeded();
    await link.click();
    tapped++;
  }
  return tapped;
}

/* ---------------------------------------------------------------------------
 * 1. What may reach the pasteboard, decided before any page is involved
 * ------------------------------------------------------------------------- */

test.describe("the token, and nothing else", () => {
  /** Runs the writer against a stub navigator and reports what it wrote. */
  async function writesOf(clickId: string | null | undefined): Promise<string[]> {
    const written: string[] = [];
    const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: (text: string) => {
            written.push(text);
            return Promise.resolve();
          },
        },
      },
    });
    try {
      await writeClickTokenToClipboard(clickId);
    } finally {
      if (previous) Object.defineProperty(globalThis, "navigator", previous);
      else delete (globalThis as { navigator?: unknown }).navigator;
    }
    return written;
  }

  test("BR-B2B-002: a captured click is written as tuggi_click_<uuid>", async () => {
    const clickId = "9f0b1a2c-3d4e-4f50-8a1b-2c3d4e5f6071";
    expect(await writesOf(clickId)).toEqual([`tuggi_click_${clickId}`]);
  });

  test("BR-B2B-002: with no click id nothing is written, and nothing is invented", async () => {
    // No fallback exists on purpose. A partner id, a slug or an already-built
    // token in the pasteboard would be a string the app tries to resolve
    // against a row nobody wrote.
    expect(await writesOf(null)).toEqual([]);
    expect(await writesOf(undefined)).toEqual([]);
    expect(await writesOf("")).toEqual([]);
    expect(await writesOf("e2e-sem-logo")).toEqual([]);
    expect(await writesOf("tuggi_click_9f0b1a2c-3d4e-4f50-8a1b-2c3d4e5f6071")).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * 2. Every App Store CTA of the site, on the device that needs it
 * ------------------------------------------------------------------------- */

test.describe("every App Store CTA writes the token, inside the tap", () => {
  /**
   * The pages a tourist can leave from, with the exits each one owns and the
   * floor of how many must answer. They are the same exits the Android
   * referrer already covers; before this card the iOS token was written on the
   * partner page alone.
   */
  const EXITS = [
    { name: "the home hero and the footer badges", path: "/en", atLeast: 2 },
    { name: "the plans hero, the pass CTAs and the final band", path: "/en/drive", atLeast: 3 },
    { name: "a tour page's download button", path: TOUR_PATH, atLeast: 1 },
  ];

  for (const exit of EXITS) {
    test(`BR-B2B-002: ${exit.name}`, async ({ page }) => {
      const writes = await spyOnClipboard(page);
      await stubTheStores(page);
      const clickId = await captureFirstTouch(page);

      await page.goto(exit.path);
      const tapped = await tapEveryAppStoreLink(page);

      expect(tapped).toBeGreaterThanOrEqual(exit.atLeast);
      expect(writes.length).toBe(tapped);
      for (const write of writes) {
        expect(write.text).toBe(`tuggi_click_${clickId}`);
        // The one assertion the old code would have failed: a write started
        // from a mount effect is not inside a tap, and WebKit rejects it.
        expect(write.insideTap).toBe(true);
      }
    });
  }

  test("BR-B2B-002: the sticky bar that follows the tourist down the page", async ({ page }) => {
    const writes = await spyOnClipboard(page);
    await stubTheStores(page);
    const clickId = await captureFirstTouch(page);

    await page.goto("/en/drive");
    // The bar is parked off-screen until the hero scrolls away, so it is the
    // one exit that cannot be tapped from a page load.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
    const bar = page.locator(`a[href="${APP_STORE_URL}"]`).last();
    await expect(bar).toBeVisible();
    await bar.click();

    expect(writes).toEqual([{ text: `tuggi_click_${clickId}`, insideTap: true }]);
  });

  test("BR-B2B-002: the partner page's own two exits still write it", async ({ page }) => {
    const writes = await spyOnClipboard(page);
    await stubTheStores(page);
    const clickId = await captureFirstTouch(page);

    // The campaign layout's App Store badge, and the floating CTA that assigns
    // window.location — the two the contract already named.
    await page.goto(CAMPAIGN_PATH);
    await expect.poll(async () => await storedClickId(page)).toBe(clickId);
    // Scoped to the printed piece's download band: this page also carries the
    // site footer, which the partner layout keeps in the DOM and out of sight.
    await page.locator(`[data-block="band"] a[href="${APP_STORE_URL}"]`).click();
    await page.getByRole("button", { name: /discover more in the app/i }).click();
    await page.waitForURL(/apps\.apple\.com/);

    expect(writes.length).toBe(2);
    for (const write of writes) {
      expect(write).toEqual({ text: `tuggi_click_${clickId}`, insideTap: true });
    }
  });

  test("BR-B2B-002: it is the real pasteboard, not just the call", async ({ page }) => {
    await spyOnClipboard(page);
    await stubTheStores(page);
    const clickId = await captureFirstTouch(page);

    await page.goto("/en");
    await page.locator(`a[href="${APP_STORE_URL}"]`).first().click();

    // The spy delegates to the real API, so this reads what an iPhone would
    // hand `InstallReferrerService.readClipboardToken` on first launch.
    await page.bringToFront();
    await expect
      .poll(async () => await page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`tuggi_click_${clickId}`);
  });
});

/* ---------------------------------------------------------------------------
 * 3. No first touch — the pasteboard is left alone
 * ------------------------------------------------------------------------- */

test.describe("a visitor nobody referred", () => {
  test("BR-B2B-002: no click id, no write — the tourist's clipboard is his", async ({ page }) => {
    const writes = await spyOnClipboard(page);
    await stubTheStores(page);

    await page.goto("/en");
    expect(await storedClickId(page)).toBeNull();
    expect(await tapEveryAppStoreLink(page)).toBeGreaterThan(0);

    expect(writes).toEqual([]);
  });

  test("BR-B2B-002: a first-touch cookie that is not a click id writes nothing", async ({
    page,
  }) => {
    const writes = await spyOnClipboard(page);
    await stubTheStores(page);

    // The cookie is not `HttpOnly` — every store CTA is a client component that
    // reads it — so it is editable, and a junk value must read as "no first
    // touch" rather than as a token the app will try to resolve.
    await page.context().addCookies([
      {
        name: ATTRIBUTION_COOKIE,
        value: serializeAttribution({
          partner_id: "not-a-uuid",
          click_id: "e2e-sem-logo",
          ts: new Date().toISOString(),
        }),
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/en");
    expect(await tapEveryAppStoreLink(page)).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * 4. The gate: writing to the pasteboard is writing to the device
 * ------------------------------------------------------------------------- */

test.describe("in a territory that requires consent", () => {
  // Portugal, covered by the ePrivacy line of BR-USUARIO-033, item 3. The
  // device write it forbids is the same one this file is about: item 5 names
  // the four things a refusal costs, and the pasteboard is the fourth.
  test.use({
    extraHTTPHeaders: { "x-forwarded-for": "198.51.100.232", "x-vercel-ip-country": "PT" },
  });

  test("BR-USUARIO-033: without consent nothing is captured, so nothing is written", async ({
    page,
  }) => {
    const writes = await spyOnClipboard(page);
    await stubTheStores(page);

    await page.goto(PARTNER_PATH);
    await page.waitForLoadState("networkidle");
    expect(await storedClickId(page)).toBeNull();

    // The partner page itself, and then an ordinary page — the gate reaches
    // the new exits by the same mechanism it reached the old one: there is no
    // click id to write anywhere (item 6, no second door).
    await page.getByRole("button", { name: /discover more in the app/i }).click();
    await page.waitForURL(/apps\.apple\.com/);
    expect(writes).toEqual([]);

    await page.goto("/en");
    expect(await tapEveryAppStoreLink(page)).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });

  test("BR-USUARIO-033: declining leaves the pasteboard untouched at every exit", async ({
    page,
  }) => {
    const writes = await spyOnClipboard(page);
    await stubTheStores(page);

    await page.goto(PARTNER_PATH);
    await page.getByRole("button", { name: /^decline$/i }).click();
    await page.waitForLoadState("networkidle");
    expect(await storedClickId(page)).toBeNull();

    await page.goto("/en/drive");
    expect(await tapEveryAppStoreLink(page)).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });

  test("BR-USUARIO-033: after consent the same exits write it", async ({ page }) => {
    const writes = await spyOnClipboard(page);
    await stubTheStores(page);

    await page.goto(PARTNER_PATH);
    await page.getByRole("button", { name: /^accept$/i }).click();
    await expect.poll(async () => await storedClickId(page)).toMatch(UUID_PATTERN);
    const clickId = (await storedClickId(page))!;

    // The consent flag is what changed, and it is the one both halves read.
    expect((await page.context().cookies()).find((c) => c.name === CONSENT_KEY)?.value).toBe(
      CONSENT_GRANTED
    );

    await page.goto("/en");
    const tapped = await tapEveryAppStoreLink(page);
    expect(tapped).toBeGreaterThan(0);
    expect(writes.length).toBe(tapped);
    for (const write of writes) {
      expect(write).toEqual({ text: `tuggi_click_${clickId}`, insideTap: true });
    }
  });
});
