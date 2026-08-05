import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import {
  PLAY_STORE_URL,
  TUGGI_PARTNER_ID,
  buildPlayStoreUrl,
} from "../../src/lib/app-meta";

/**
 * Attribution of a download to the partner who caused it — the only reason
 * /d/<slug> exists, and the basis of the partner's commission.
 *
 * Two halves, both regressions that reached production:
 *
 *  1. Android reads `referrer=partner_id_<uuid>` off the Play Store URL on
 *     first launch (InstallReferrerClient). The floating CTA built that URL
 *     inline and the campaign band's Play badge linked to the bare store URL,
 *     so every install started from the badge was credited to nobody. Both
 *     links now come from buildPlayStoreUrl, and both are asserted here.
 *  2. /api/attribution accepted the visitor's IP from the request body, which
 *     let anyone insert a fingerprint pairing a partner of their choice with
 *     someone else's IP — and the app matches installs by IP.
 */

/** Fixture partner with a seal → campaign layout. See mock-supabase-server.mjs. */
const CAMPAIGN_PATH = "/d/e2e-com-logo";
const CAMPAIGN_PARTNER_ID = "22222222-2222-4222-8222-222222222222";
/** No partner at all: the plain /download page, reached without ?ID=. */
const NO_PARTNER_PATH = "/en/download";

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/**
 * Follows the store link the CTA opens without leaving the harness: the CTA
 * assigns window.location, so the store URL is only observable as a navigation.
 */
async function storeUrlFromCta(page: Page): Promise<string> {
  await page.route("**/play.google.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>play store stub</body></html>",
    })
  );

  await page.getByRole("button", { name: /discover more in the app/i }).click();
  await page.waitForURL(/play\.google\.com/);
  return page.url();
}

test.describe("Play Store link carries the partner", () => {
  test("the campaign band's Play badge links out with the install referrer", async ({ page }) => {
    // The badge is not decoration: it is the whole download path for anyone the
    // platform sniff behind the floating CTA gets wrong. It shipped without the
    // referrer while the CTA had it — the bug this suite exists to pin down.
    await page.goto(CAMPAIGN_PATH);

    const playLink = page.locator(`a[href*="play.google.com"]:visible`);
    await expect(playLink).toHaveCount(1);

    const href = await playLink.getAttribute("href");
    expect(href).toContain(`referrer=partner_id_${CAMPAIGN_PARTNER_ID}`);
    // Exactly what the CTA would open, character for character: one owner.
    expect(href).toBe(buildPlayStoreUrl(CAMPAIGN_PARTNER_ID));
  });

  test("the floating CTA opens the same referrer URL as the badge", async ({ page }) => {
    await page.goto(CAMPAIGN_PATH);

    const url = await storeUrlFromCta(page);
    expect(url).toContain(`referrer=partner_id_${CAMPAIGN_PARTNER_ID}`);
    expect(url).toBe(buildPlayStoreUrl(CAMPAIGN_PARTNER_ID));
  });

  test("a visit with no partner links out to the clean store URL", async ({ page }) => {
    // Nobody referred this visit, so nothing may be credited: an empty or
    // malformed referrer would still be parsed by the app on first launch.
    await page.goto(NO_PARTNER_PATH);

    const url = await storeUrlFromCta(page);
    expect(url).not.toContain("referrer");
    expect(url).toBe(PLAY_STORE_URL);
  });

  test("the internal Tuggi client and malformed ids are never credited", () => {
    // The internal client is a row in core.clients but not a partner, and an id
    // that is not a UUID can never match an install — both must produce the
    // bare store URL rather than a referrer that misattributes or misses.
    expect(buildPlayStoreUrl(TUGGI_PARTNER_ID)).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl(TUGGI_PARTNER_ID.toUpperCase())).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl("not-a-uuid")).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl("")).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl(undefined)).toBe(PLAY_STORE_URL);
  });
});

test.describe("/api/attribution takes the IP from the edge, not the caller", () => {
  /** Reads back the row the route inserted into the click_fingerprints double. */
  async function storedFingerprint(request: APIRequestContext, partnerId: string) {
    const res = await request.get(
      `${MOCK_BASE}/__fingerprints?partner_id=${encodeURIComponent(partnerId)}`
    );
    expect(res.ok()).toBe(true);
    return (await res.json()).row as
      | { partner_id: string; ip_address: string; language: string }
      | null;
  }

  test("a client_ip in the body is ignored", async ({ request }) => {
    // The attack this closes: POST a partner of your choosing next to a
    // victim's IP, and the app's IP-based install match hands that partner the
    // commission for someone else's download.
    const partnerId = "44444444-4444-4444-8444-444444444444";
    const spoofed = "203.0.113.7"; // TEST-NET-3, never a real visitor

    const res = await request.post("/api/attribution", {
      data: {
        partner_id: partnerId,
        client_ip: spoofed,
        user_agent: "e2e-attribution",
        language: "en-US",
        timezone: "Europe/Lisbon",
      },
    });
    expect(res.status()).toBe(201);

    const row = await storedFingerprint(request, partnerId);
    expect(row).not.toBeNull();
    expect(row!.ip_address).not.toBe(spoofed);
    // Locally the header comes from `next start` itself and carries the socket
    // address, IPv4-mapped ("::ffff:127.0.0.1") — stored normalised, because
    // the app matches this column by string equality.
    expect(row!.ip_address).toBe("127.0.0.1");
    expect(row!.language).toBe("en-US");
  });

  test("a partner_id that is not a UUID is refused before the write", async ({ request }) => {
    const junk = "'; DROP TABLE click_fingerprints; --";

    const res = await request.post("/api/attribution", {
      data: { partner_id: junk, user_agent: "e2e-attribution" },
    });
    expect(res.status()).toBe(400);

    expect(await storedFingerprint(request, junk)).toBeNull();
  });
});
