import { test, expect } from "@playwright/test";
import { CONSENT_GRANTED, CONSENT_KEY } from "../../src/lib/consent";
import { sendPartnerPageEvent } from "../../src/lib/partner-page-events";
import { visitorHeaders } from "./visitor-headers";

/**
 * `partner_download_page_view` on the page `@` (#1254). It never reached GA4
 * from `/@nome`: the page's first effect ran before `GoogleAnalyticsWrapper`
 * had mounted gtag.js, and the fallback pushed the Tag Manager form
 * (`{ event }`), which gtag.js ignores. Now the event waits for `gtag` and goes
 * through it, with the parameters `/d/` sends (`partner_id`, `platform`).
 */

type Call = unknown[];

/** A browser-ish global for the sender, with a consent answer and a clock that runs. */
function fakeWindow(consent: string | null) {
  const storage = new Map<string, string>();
  if (consent !== null) storage.set(CONSENT_KEY, consent);
  const g = globalThis as unknown as Record<string, unknown>;
  const calls: Call[] = [];
  const win: Record<string, unknown> = { setInterval, clearInterval };
  g.window = win;
  g.localStorage = { getItem: (key: string) => storage.get(key) ?? null };
  return {
    calls,
    mountGtag: () => {
      win.gtag = (...args: unknown[]) => calls.push(args);
    },
    restore: () => {
      delete g.window;
      delete g.localStorage;
    },
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test.describe("sendPartnerPageEvent, in Node", () => {
  test("with gtag already mounted, the event goes through it at once, in the gtag form", () => {
    const fake = fakeWindow(CONSENT_GRANTED);
    try {
      fake.mountGtag();
      sendPartnerPageEvent("partner_download_page_view", { partner_id: "p1", platform: "ios" });
      expect(fake.calls).toEqual([["event", "partner_download_page_view", { partner_id: "p1", platform: "ios" }]]);
    } finally {
      fake.restore();
    }
  });

  test("with consent and gtag mounted later, the event waits for it and is sent once", async () => {
    const fake = fakeWindow(CONSENT_GRANTED);
    try {
      sendPartnerPageEvent("partner_download_page_view", { partner_id: "p1", platform: "android" }, 2000);
      await wait(250);
      expect(fake.calls).toHaveLength(0);
      fake.mountGtag();
      await wait(300);
      expect(fake.calls).toEqual([["event", "partner_download_page_view", { partner_id: "p1", platform: "android" }]]);
    } finally {
      fake.restore();
    }
  });

  test("without consent nothing is sent, even if a gtag shows up", async () => {
    const fake = fakeWindow("false");
    try {
      sendPartnerPageEvent("partner_download_page_view", { partner_id: "p1" }, 2000);
      fake.mountGtag();
      await wait(300);
      expect(fake.calls).toHaveLength(0);
    } finally {
      fake.restore();
    }
  });

  test("a gtag that never comes is given up after the wait", async () => {
    const fake = fakeWindow(CONSENT_GRANTED);
    try {
      sendPartnerPageEvent("partner_download_page_view", { partner_id: "p1" }, 200);
      await wait(400);
      fake.mountGtag();
      await wait(300);
      expect(fake.calls).toHaveLength(0);
    } finally {
      fake.restore();
    }
  });
});

test.describe("on the page @, with consent given", () => {
  test.use({ extraHTTPHeaders: visitorHeaders({ country: "BR", address: "2001:db8:1254:2::1" }) });

  test("partner_download_page_view reaches gtag with partner_id and platform, after gtag.js mounts", async ({ page, context }) => {
    // Nothing leaves for Google, Clarity or Apollo: the init snippet of
    // @next/third-parties still defines gtag, which queues on window.dataLayer.
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript((key) => window.localStorage.setItem(key, "true"), CONSENT_KEY);
    await page.goto("/@e2e-hotel-foto");
    const events = () =>
      page.evaluate(() =>
        ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
          .map((entry) => Array.from(entry as ArrayLike<unknown>))
          .filter((args) => args[0] === "event" && args[1] === "partner_download_page_view")
      );
    await expect.poll(async () => (await events()).length, { timeout: 15000 }).toBe(1);
    const [[, , params]] = await events();
    expect(params).toMatchObject({ partner_id: "88888888-8888-4888-8888-888888888888" });
    expect(params).toHaveProperty("platform");
  });
});
