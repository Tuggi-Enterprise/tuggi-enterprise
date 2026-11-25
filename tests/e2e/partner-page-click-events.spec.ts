import { test, expect, devices, type BrowserContext, type Page } from "@playwright/test";
import { CONSENT_KEY } from "../../src/lib/consent";
import { visitorHeaders } from "./visitor-headers";

/**
 * Every tap of the page `@` and of `/d/` sends a GA4 event with `partner_id`
 * (#1289): the interest a partner raised, read per partner. A store button
 * sends `click_store` (`store-click.ts`); every other tap goes through
 * `usePartnerEvents`, which adds `partner_id` and `platform`.
 *
 * The tracker is the gtag of the page, read where the `@next/third-parties`
 * snippet queues it, `window.dataLayer`: nothing leaves for Google. A link's
 * navigation is cancelled before it happens, so a tap measures and stays.
 */

const HOTEL = "/@e2e-hotel-redes";
const HOTEL_ID = "66666666-6666-4666-8666-666666666666";
const HOTEL_WITH_AUDIO = "/@e2e-hotel-foto";
const HOTEL_WITH_AUDIO_ID = "88888888-8888-4888-8888-888888888888";
const CREATOR = "/@e2e.criadora";
const CREATOR_ID = "7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a";

/**
 * A page measurer's agent: the creator's openings are counted by difference in
 * partner-public-page.spec.ts, and a declared robot opens without counting.
 */
const MEASURER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Chrome-Lighthouse";

const address = () => `2001:db8:1289::${Math.floor(Math.random() * 0xffff).toString(16)}`;

type Params = Record<string, unknown>;

async function prepare(context: BrowserContext, page: Page) {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({ status: 204, body: "" }));
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
    // The tap runs its handlers; the link does not leave the page.
    window.addEventListener(
      "click",
      (e) => {
        if ((e.target as Element | null)?.closest?.("a[href]")) e.preventDefault();
      },
      true
    );
  }, CONSENT_KEY);
}

/** The parameters of each `gtag("event", name, ...)` the page queued, in order. */
async function eventsOf(page: Page, name: string): Promise<Params[]> {
  return page.evaluate(
    (eventName) =>
      ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
        .map((entry) => Array.from(entry as ArrayLike<unknown>))
        .filter((args) => args[0] === "event" && args[1] === eventName)
        .map((args) => args[2] as Record<string, unknown>),
    name
  );
}

/** Waits for gtag.js to be mounted: the page view is its first event. */
async function gtagReady(page: Page) {
  await expect.poll(async () => (await eventsOf(page, "partner_download_page_view")).length, { timeout: 15000 }).toBe(1);
}

/** Taps and returns the events of that name the tap added. */
async function tap(page: Page, selector: string, name: string, dispatch = false): Promise<Params[]> {
  const before = (await eventsOf(page, name)).length;
  const target = page.locator(selector).first();
  if (dispatch) await target.dispatchEvent("click");
  else await target.click();
  await expect.poll(async () => (await eventsOf(page, name)).length).toBe(before + 1);
  return (await eventsOf(page, name)).slice(before);
}

test.describe("on a computer, the page @ of a hotel", () => {
  test.use({ extraHTTPHeaders: visitorHeaders({ country: "BR", address: address() }) });

  test("the website, each network, the two badges and the @ copied carry partner_id", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await prepare(context, page);
    await page.goto(HOTEL);
    await gtagReady(page);

    const [website] = await tap(page, '[data-testid="partner-contacts"] a[href^="https://hotelredes.example"]', "partner_contact_click");
    expect(website).toMatchObject({ partner_id: HOTEL_ID, kind: "website", platform: "desktop" });

    for (const network of ["instagram", "tiktok", "youtube", "facebook"]) {
      const [social] = await tap(page, `[data-testid="partner-social-${network}"]`, "partner_contact_click");
      expect(social).toMatchObject({ partner_id: HOTEL_ID, kind: "social", network, platform: "desktop" });
    }

    const [appStore] = await tap(page, '[data-testid="partner-page-app-store"]', "click_store");
    expect(appStore).toMatchObject({ partner_id: HOTEL_ID, store: "app_store", placement: "partner_page" });
    const [playStore] = await tap(page, '[data-testid="partner-page-play-store"]', "click_store");
    expect(playStore).toMatchObject({ partner_id: HOTEL_ID, store: "play_store", placement: "partner_page" });

    const [copied] = await tap(page, '[data-testid="partner-handle-copy"]', "partner_handle_copied");
    expect(copied).toEqual({ partner_id: HOTEL_ID, platform: "desktop", result: "copied" });
  });

  test("the @ refused by the browser is measured as failed, without the @ itself", async ({ page, context }) => {
    await prepare(context, page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("denied")) },
        configurable: true,
      });
    });
    await page.goto(HOTEL);
    await gtagReady(page);
    const [failed] = await tap(page, '[data-testid="partner-handle-copy"]', "partner_handle_copied");
    expect(failed).toEqual({ partner_id: HOTEL_ID, platform: "desktop", result: "failed" });
  });
});

test.describe("on a phone, the page @ of a hotel", () => {
  test.use({
    userAgent: devices["iPhone 13"].userAgent,
    viewport: { width: 390, height: 664 },
    isMobile: true,
    hasTouch: true,
    extraHTTPHeaders: visitorHeaders({ country: "BR", address: address() }),
  });

  test("the store button and the sticky bar carry partner_id", async ({ page, context }) => {
    await prepare(context, page);
    await page.goto(HOTEL);
    await gtagReady(page);

    const [cta] = await tap(page, '[data-testid="partner-page-cta"]', "click_store");
    expect(cta).toMatchObject({ partner_id: HOTEL_ID, store: "app_store", placement: "partner_page" });

    // The bar is off screen until the button scrolls away: the tap is dispatched to it.
    const [sticky] = await tap(page, '[data-testid="sticky-cta-store"]', "click_store", true);
    expect(sticky).toMatchObject({ partner_id: HOTEL_ID, store: "app_store", placement: "partner_page_sticky" });
  });

  test("the story: started once from its beginning, a resume is not a new listen, finished at the end", async ({ page, context }) => {
    await prepare(context, page);
    // The clips do not have to decode: play() resolves, and each Audio is kept to be driven.
    await page.addInitScript(() => {
      const kept: HTMLAudioElement[] = [];
      (window as unknown as { __audios: HTMLAudioElement[] }).__audios = kept;
      HTMLMediaElement.prototype.play = function () {
        return Promise.resolve();
      };
      const Native = window.Audio;
      window.Audio = function (src?: string) {
        const a = new Native(src);
        kept.push(a);
        return a;
      } as unknown as typeof Audio;
    });
    await page.goto(HOTEL_WITH_AUDIO);
    await gtagReady(page);

    const drive = (which: "main" | "call", action: "canplaythrough" | "ended" | "seek") =>
      page.evaluate(
        ([w, a]) => {
          const audios = (window as unknown as { __audios: HTMLAudioElement[] }).__audios;
          // The hook makes the story first and the call after it; the fixture's story is a call clip too.
          const el = audios[audios.length - (w === "call" ? 1 : 2)];
          if (a === "seek") Object.defineProperty(el, "currentTime", { value: 3, writable: true, configurable: true });
          else el.dispatchEvent(new Event(a));
        },
        [which, action] as const
      );

    await drive("main", "canplaythrough");
    const play = '[data-testid="partner-welcome-audio"] button';
    const [started] = await tap(page, play, "partner_story_played");
    expect(started).toEqual({ partner_id: HOTEL_WITH_AUDIO_ID, platform: "ios", completion: "started" });

    await tap(page, play, "download_page_play_button_click"); // pause
    await drive("main", "seek");
    await tap(page, play, "download_page_play_button_click"); // resume
    expect(await eventsOf(page, "partner_story_played")).toHaveLength(1);

    await drive("call", "ended");
    await expect.poll(async () => (await eventsOf(page, "partner_story_played")).length).toBe(2);
    expect((await eventsOf(page, "partner_story_played"))[1]).toEqual({
      partner_id: HOTEL_WITH_AUDIO_ID,
      platform: "ios",
      completion: "finished",
    });
  });
});

test.describe("on a computer, the page @ of a creator", () => {
  test.use({ userAgent: MEASURER_UA, extraHTTPHeaders: visitorHeaders({ country: "BR", address: address() }) });

  test("an itinerary, a network and a badge carry partner_id", async ({ page, context }) => {
    await prepare(context, page);
    await page.goto(CREATOR);
    // A creator's page sends no page view: gtag is ready once its snippet queued the config.
    await expect
      .poll(() => page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag), { timeout: 15000 })
      .toBe("function");

    const [route] = await tap(page, '[data-testid="creator-route-card"]', "partner_route_opened");
    expect(route).toMatchObject({ partner_id: CREATOR_ID, source: "partner_page", route_slug: "centro-de-gramado-a-pe" });

    const [social] = await tap(page, '[data-testid="partner-social-instagram"]', "partner_contact_click");
    expect(social).toMatchObject({ partner_id: CREATOR_ID, kind: "social", network: "instagram" });

    const [store] = await tap(page, '[data-testid="partner-page-app-store"]', "click_store");
    expect(store).toMatchObject({ partner_id: CREATOR_ID, store: "app_store", placement: "partner_page" });
  });
});
