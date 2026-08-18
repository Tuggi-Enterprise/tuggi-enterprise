import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import {
  PLAY_STORE_URL,
  TUGGI_PARTNER_ID,
  buildPlayStoreUrl,
} from "../../src/lib/app-meta";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  normalizeLanguage,
  normalizeTimezone,
  parseAttribution,
  serializeAttribution,
  UUID_PATTERN,
} from "../../src/lib/attribution";

/**
 * Attribution of a download to the partner who caused it — the only reason
 * /d/<slug> exists, and the basis of the partner's commission.
 *
 * The design under test is `docs/contracts/atribuicao-de-parceiro.md`. It
 * replaced a probabilistic match that the audit of 2026-08-18 measured as dead
 * in production, and what it fixed is what is pinned here:
 *
 *  1. the identity of the CLICK travels through the store, not the identity of
 *     the partner — `referrer=tuggi_click_<uuid>` (contract §1 and §2);
 *  2. the row stores the visitor's IP and not the Cloudflare edge's, because
 *     Cloudflare proxies our Vercel deployment (contract §4);
 *  3. `language` and `timezone` are normalised on the way in, or the two ends
 *     write the same fact in two shapes and nothing ever matches (§3);
 *  4. the FIRST touch is the one that counts and it is never overwritten —
 *     BR-B2B-002. The site had no memory at all, so the second QR silently
 *     replaced the first in every channel: it implemented last touch.
 */

/** Fixture partners. See mock-supabase-server.mjs. */
const CAMPAIGN_PATH = "/d/e2e-com-logo";
const CAMPAIGN_PARTNER_ID = "22222222-2222-4222-8222-222222222222";
const PLAIN_PATH = "/d/e2e-sem-logo";
/** No partner at all: the plain /download page, reached without ?ID=. */
const NO_PARTNER_PATH = "/en/download";

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/** A UUID that is not a fixture, so a test owns the rows it asserts on. */
const uniquePartnerId = () =>
  `44444444-4444-4444-8444-${Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, "0")}`;

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

/** The first touch this browser is carrying, as the site itself would read it. */
async function storedAttribution(page: Page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === ATTRIBUTION_COOKIE);
  return { cookie, value: parseAttribution(cookie?.value) };
}

test.describe("the token that crosses the store is the click, not the partner", () => {
  test("BR-B2B-002: buildPlayStoreUrl carries tuggi_click_<uuid>, and nothing else does", () => {
    const clickId = "9f0b1a2c-3d4e-4f50-8a1b-2c3d4e5f6071";

    expect(buildPlayStoreUrl(clickId)).toBe(
      `${PLAY_STORE_URL}&referrer=tuggi_click_${clickId}`
    );
    // A UUID and `_` survive encodeURIComponent untouched — the app parses the
    // literal string, so a link that percent-escaped it would not resolve.
    expect(buildPlayStoreUrl(clickId)).toContain(`referrer=tuggi_click_${clickId}`);

    // The partner id is no longer a valid input in meaning, only in shape: what
    // it must never produce is a referrer that reads as the legacy format the
    // app still accepts, pointing at a partner nobody captured.
    expect(buildPlayStoreUrl(TUGGI_PARTNER_ID)).not.toContain("partner_id_");
  });

  test("BR-B2B-002: no click, no referrer — the link goes out bare rather than wrong", () => {
    // Nobody referred this visit, so nothing may be credited: an empty or
    // malformed referrer would still be parsed by the app on first launch.
    expect(buildPlayStoreUrl(null)).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl(undefined)).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl("")).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl("not-a-uuid")).toBe(PLAY_STORE_URL);
    expect(buildPlayStoreUrl(`tuggi_click_${TUGGI_PARTNER_ID}`)).toBe(PLAY_STORE_URL);
  });

  test("BR-B2B-002: the cookie only reads as a first touch when both ids are UUIDs", () => {
    // It lives 90 days in a store the visitor can edit. Junk has to read as
    // "no first touch yet", never as a partner, and never as a crash.
    const good = {
      partner_id: CAMPAIGN_PARTNER_ID,
      click_id: "9f0b1a2c-3d4e-4f50-8a1b-2c3d4e5f6071",
      ts: "2026-08-18T10:00:00.000Z",
    };
    expect(parseAttribution(serializeAttribution(good))).toEqual(good);

    expect(parseAttribution(null)).toBeNull();
    expect(parseAttribution("")).toBeNull();
    expect(parseAttribution("not-json")).toBeNull();
    expect(parseAttribution(encodeURIComponent('{"partner_id":"x","click_id":"y"}'))).toBeNull();
    expect(
      parseAttribution(encodeURIComponent(JSON.stringify({ partner_id: CAMPAIGN_PARTNER_ID })))
    ).toBeNull();
  });
});

test.describe("normalisation happens on the write, and both ends obey it", () => {
  test("the language is the primary subtag, lowercased — contract §3", () => {
    // `pt-BR` here against `pt` from the app is the mismatch that made the
    // probabilistic match never fire in production.
    expect(normalizeLanguage("pt-BR")).toBe("pt");
    expect(normalizeLanguage("PT")).toBe("pt");
    expect(normalizeLanguage("zh-Hans-CN")).toBe("zh");
    expect(normalizeLanguage("")).toBeNull();
    expect(normalizeLanguage("Unknown")).toBeNull();
    expect(normalizeLanguage(undefined)).toBeNull();
  });

  test("an unknown timezone is NULL and never the word for it — contract §3", () => {
    expect(normalizeTimezone("America/Sao_Paulo")).toBe("America/Sao_Paulo");
    expect(normalizeTimezone("Etc/Unknown")).toBeNull();
    expect(normalizeTimezone("etc/unknown")).toBeNull();
    expect(normalizeTimezone("   ")).toBeNull();
    expect(normalizeTimezone(null)).toBeNull();
  });
});

test.describe("/api/attribution", () => {
  /** Reads back the row the route inserted into the click_fingerprints double. */
  async function storedFingerprint(request: APIRequestContext, partnerId: string) {
    const res = await request.get(
      `${MOCK_BASE}/__fingerprints?partner_id=${encodeURIComponent(partnerId)}`
    );
    expect(res.ok()).toBe(true);
    return (await res.json()).row as
      | { id: string; partner_id: string; ip_address: string; language: string | null; timezone: string | null }
      | null;
  }

  test("BR-B2B-002: the answer carries the click_id and plants the first-touch cookie", async ({
    request,
  }) => {
    // Without the id in the body the site has nothing to put in the store link,
    // and every download leaves unattributed however well the row was written.
    const partnerId = uniquePartnerId();
    const res = await request.post("/api/attribution", {
      data: { partner_id: partnerId, user_agent: "e2e-attribution", language: "en-GB" },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.click_id).toMatch(UUID_PATTERN);
    expect(body.first_touch).toBe(true);

    const row = await storedFingerprint(request, partnerId);
    expect(row!.id).toBe(body.click_id);

    const setCookie = res.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain(`${ATTRIBUTION_COOKIE}=`);
    expect(setCookie).toContain(`Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE_SECONDS}`);
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie.toLowerCase()).toContain("path=/");
    // Readable by the document on purpose: every store CTA of the site is a
    // client component that builds its link from it.
    expect(setCookie.toLowerCase()).not.toContain("httponly");
  });

  test("BR-B2B-002: a second partner does not overwrite the first, and writes no row", async ({
    request,
  }) => {
    // This is the rule, and it had no implementation at all: with no memory in
    // the browser the site was last touch — scan two QRs and the second one
    // took the commission for a visit it did not cause.
    const first = uniquePartnerId();
    const firstRes = await request.post("/api/attribution", {
      data: { partner_id: first, user_agent: "e2e-attribution" },
    });
    const firstClickId = (await firstRes.json()).click_id;

    const second = uniquePartnerId().replace("44444444", "55555555");
    const secondRes = await request.post("/api/attribution", {
      data: { partner_id: second, user_agent: "e2e-attribution" },
    });

    expect(secondRes.status()).toBe(200);
    const body = await secondRes.json();
    expect(body.click_id).toBe(firstClickId);
    expect(body.partner_id).toBe(first);
    expect(body.first_touch).toBe(false);
    // No row for the second partner: nothing to match, nothing to pay.
    expect(await storedFingerprint(request, second)).toBeNull();
  });

  test("the stored row is normalised, so the match can compare it — contract §3", async ({
    request,
  }) => {
    const partnerId = uniquePartnerId();
    const res = await request.post("/api/attribution", {
      data: {
        partner_id: partnerId,
        user_agent: "e2e-attribution",
        language: "pt-BR",
        timezone: "Etc/Unknown",
      },
    });
    expect(res.status()).toBe(201);

    const row = await storedFingerprint(request, partnerId);
    expect(row!.language).toBe("pt");
    expect(row!.timezone).toBeNull();
  });

  test("the IP comes from the Cloudflare header, not from the chain behind it", async ({
    request,
  }) => {
    // Cloudflare proxies our Vercel deployment, so `x-forwarded-for` at the
    // Function is the edge. Reading it stored 172.69/104.22 addresses in every
    // row in production — personal data of nobody, useful to no match.
    const partnerId = uniquePartnerId();
    const visitor = "198.51.100.23";

    const res = await request.post("/api/attribution", {
      headers: {
        "CF-Connecting-IP": visitor,
        "x-forwarded-for": "172.69.0.1, 10.0.0.1",
      },
      data: { partner_id: partnerId, user_agent: "e2e-attribution" },
    });
    expect(res.status()).toBe(201);

    const row = await storedFingerprint(request, partnerId);
    expect(row!.ip_address).toBe(visitor);
  });

  test("a client_ip in the body is ignored", async ({ request }) => {
    // The attack this closes: POST a partner of your choosing next to a
    // victim's IP, and the app's IP-based install match hands that partner the
    // commission for someone else's download.
    const partnerId = uniquePartnerId();
    const spoofed = "203.0.113.7"; // TEST-NET-3, never a real visitor

    const edge = "198.51.100.55"; // the chain behind Cloudflare, when there is one

    const res = await request.post("/api/attribution", {
      headers: { "x-forwarded-for": `${edge}, 10.0.0.1` },
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
    // The first entry of the forwarded chain, and never the body.
    expect(row!.ip_address).toBe(edge);
    expect(row!.language).toBe("en");
  });

  test("a partner_id that is not a UUID is refused before the write", async ({ request }) => {
    const junk = "'; DROP TABLE click_fingerprints; --";

    const res = await request.post("/api/attribution", {
      data: { partner_id: junk, user_agent: "e2e-attribution" },
    });
    expect(res.status()).toBe(400);

    expect(await storedFingerprint(request, junk)).toBeNull();
  });

  test("the internal Tuggi client is refused: it refers nobody", async ({ request }) => {
    const res = await request.post("/api/attribution", {
      data: { partner_id: TUGGI_PARTNER_ID, user_agent: "e2e-attribution" },
    });
    expect(res.status()).toBe(400);
    expect(await storedFingerprint(request, TUGGI_PARTNER_ID)).toBeNull();
  });

  test("an address that keeps writing is refused: this door has a barrier now", async ({
    request,
  }) => {
    // A public route in front of a `service_role` write, and `service_role`
    // ignores RLS: this limit is the only barrier left. It had none — the
    // fingerprint table was an open pipe for anyone who could POST.
    //
    // Its own CF address, so the counter under test is this test's and not the
    // one the rest of the suite shares.
    const address = "198.51.100.140";
    // The double's counter is process-wide and survives a reused mock server,
    // so this test clears it — and it is the ONLY one here that does: a clear
    // running in another worker mid-flood is what made an earlier version of
    // this test measure the wrong thing.
    await request.delete(`${MOCK_BASE}/__attempts`);

    const post = () =>
      request.post("/api/attribution", {
        headers: { "CF-Connecting-IP": address },
        data: { partner_id: uniquePartnerId(), user_agent: "e2e-flood" },
      });

    expect((await post()).status()).toBe(201);

    let refused = 0;
    for (let i = 0; i < 40; i++) {
      const res = await post();
      if (res.status() === 429) {
        refused++;
        expect(res.headers()["retry-after"]).toBeTruthy();
      }
    }
    expect(refused).toBeGreaterThan(0);
  });
});

test.describe("every way out of the site carries the first touch", () => {
  // Its own edge address: these tests load real pages, and the bucket they
  // spend must not be the one every other spec of the suite is spending.
  test.use({ extraHTTPHeaders: { "CF-Connecting-IP": "198.51.100.201" } });

  test("BR-B2B-002: the campaign badge and the floating CTA carry the captured click", async ({
    page,
  }) => {
    await page.goto(CAMPAIGN_PATH);

    // The capture is a POST from the page; wait for the cookie it plants.
    await expect
      .poll(async () => (await storedAttribution(page)).value?.click_id ?? null)
      .toMatch(UUID_PATTERN);
    const { value } = await storedAttribution(page);
    expect(value!.partner_id).toBe(CAMPAIGN_PARTNER_ID);

    // The badge is not decoration: it is the whole download path for anyone the
    // platform sniff behind the floating CTA gets wrong. It shipped without any
    // referrer once — the bug this suite exists to pin down.
    const playLink = page.locator(`a[href*="play.google.com"]:visible`);
    await expect(playLink).toHaveCount(1);
    await expect
      .poll(async () => playLink.getAttribute("href"))
      .toBe(buildPlayStoreUrl(value!.click_id));

    // Exactly what the CTA opens, character for character: one owner.
    expect(await storeUrlFromCta(page)).toBe(buildPlayStoreUrl(value!.click_id));
  });

  test("BR-B2B-002: the second partner page still hands out the first partner's click", async ({
    page,
  }) => {
    await page.goto(CAMPAIGN_PATH);
    await expect
      .poll(async () => (await storedAttribution(page)).value?.click_id ?? null)
      .toMatch(UUID_PATTERN);
    const first = (await storedAttribution(page)).value!;

    // Same tourist, second printed QR — the rule says nothing changes.
    await page.goto(PLAIN_PATH);
    const after = (await storedAttribution(page)).value!;
    expect(after).toEqual(first);
    expect(await storeUrlFromCta(page)).toBe(buildPlayStoreUrl(first.click_id));
  });

  test("BR-B2B-002: a store badge on an ordinary page carries it too", async ({ page }) => {
    // Nine of the eleven ways out of this site linked to the bare store URL, so
    // a visitor who scanned a QR, read the home page and downloaded from there
    // was credited to nobody. The badge is a client component that reads the
    // cookie, which is also why the page stays cacheable.
    await page.goto(CAMPAIGN_PATH);
    await expect
      .poll(async () => (await storedAttribution(page)).value?.click_id ?? null)
      .toMatch(UUID_PATTERN);
    const { value } = await storedAttribution(page);

    await page.goto("/en");
    const homeBadge = page.locator('a[href*="play.google.com"]').first();
    await expect
      .poll(async () => homeBadge.getAttribute("href"))
      .toBe(buildPlayStoreUrl(value!.click_id));
  });

  test("a visit with no partner links out to the clean store URL", async ({ page }) => {
    await page.goto(NO_PARTNER_PATH);

    const url = await storeUrlFromCta(page);
    expect(url).not.toContain("referrer");
    expect(url).toBe(PLAY_STORE_URL);
  });
});

test.describe("a partner slug that no longer resolves", () => {
  test.use({ extraHTTPHeaders: { "CF-Connecting-IP": "198.51.100.202" } });

  test("BR-B2B-001: it still offers the app, and stays out of the index", async ({ page }) => {
    // The QR only ever attributed. A slug that was renamed, retired or printed
    // with a typo costs the partner the credit — it must not also cost the
    // tourist the download, which is what the 404 did: it offers the home page
    // and support, and no store link anywhere.
    const response = await page.goto("/d/nao-existe-2026");
    expect(response?.status()).toBe(200);

    expect(await storeUrlFromCta(page)).toBe(PLAY_STORE_URL);
  });

  test("BR-B2B-001: nothing is credited to a partner we could not resolve", async ({ page }) => {
    await page.goto("/d/nao-existe-2026");
    await page.waitForLoadState("networkidle");

    expect((await storedAttribution(page)).cookie).toBeUndefined();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );
  });
});
