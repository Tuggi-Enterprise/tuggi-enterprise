import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { E2E_EDGE_SHARED_SECRET, MOCK_SUPABASE_PORT } from "../../playwright.config";
import {
  PLAY_STORE_URL,
  TUGGI_PARTNER_ID,
  buildPlayStoreUrl,
} from "../../src/lib/app-meta";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  ATTRIBUTION_RETENTION_DAYS,
  normalizeLanguage,
  normalizeTimezone,
  parseAttribution,
  serializeAttribution,
  UUID_PATTERN,
} from "../../src/lib/attribution";
import {
  CAPTURE_LIMIT_PER_WINDOW,
  ECHO_LIMIT_PER_WINDOW,
} from "../../src/lib/attribution-limits";

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

/**
 * EVERY REQUEST OF THIS FILE DECLARES A TERRITORY, and that is not decoration.
 * Since BR-USUARIO-033 the capture is gated on where the visitor is, and a
 * local build carries no `x-vercel-ip-country` at all — which the rule treats
 * as "not determined", which is gated. Brazil is the territory this file is
 * about: it is exempt from prior consent (item 1) and it is the only place with
 * partners today. The gate itself is `attribution-consent-gate.spec.ts`.
 */
test.use({ extraHTTPHeaders: { "x-vercel-ip-country": "BR" } });

/**
 * Fixture partners. See mock-supabase-server.mjs.
 *
 * `?lang=en` is not decoration either: `/d/<slug>` carries no locale prefix on
 * purpose (the printed QR must not embed one), so `src/middleware.ts` picks the
 * language, and the territory declared above is one of the things it picks it
 * from — Brazil serves the page in Portuguese and every English assertion below
 * stops matching. The query parameter is the documented override and it is the
 * highest-priority one.
 */
const CAMPAIGN_PATH = "/d/e2e-com-logo?lang=en";
const CAMPAIGN_PARTNER_ID = "22222222-2222-4222-8222-222222222222";
const PLAIN_PATH = "/d/e2e-sem-logo?lang=en";
/** No partner at all: the plain /download page, reached without ?ID=. */
const NO_PARTNER_PATH = "/en/download";

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/** A UUID that is not a fixture, so a test owns the rows it asserts on. */
const uniquePartnerId = () =>
  `44444444-4444-4444-8444-${Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, "0")}`;

/**
 * An address this test run owns, so a budget assertion measures its own count.
 *
 * The double's counter is process-wide and outlives a reused mock server
 * (`reuseExistingServer`), and `DELETE /__attempts` clears EVERY key — a clear
 * landing mid-flood in another worker is what made an earlier version of the
 * barrier test measure the wrong thing. A fresh address per test needs neither.
 * 198.18.0.0/15 is the benchmarking range of RFC 2544: never a real visitor.
 */
const uniqueAddress = () =>
  `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

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
    // ...and that constant is the RETENTION, not a number of its own. The
    // cookie used to live 90 days over a row deleted at 30 (BR-USUARIO-032,
    // item 3): from day 31 the cookie still refused a second partner's capture
    // while the click it named no longer existed, so partner B lost an
    // attribution it had earned to a partner A that could no longer be paid.
    expect(ATTRIBUTION_RETENTION_DAYS, "BR-USUARIO-032 item 3: the row is pruned at 30 days").toBe(30);
    expect(ATTRIBUTION_COOKIE_MAX_AGE_SECONDS).toBe(ATTRIBUTION_RETENTION_DAYS * 24 * 60 * 60);
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

  test("BR-B2B-002: the IP comes from the Cloudflare header, and only against proof of our edge", async ({
    request,
  }) => {
    // Cloudflare proxies our Vercel deployment, so `x-forwarded-for` at the
    // Function is the edge. Reading it stored 172.69/104.22 addresses in every
    // row in production — personal data of nobody, useful to no match.
    const partnerId = uniquePartnerId();
    const visitor = "198.51.100.23";

    const res = await request.post("/api/attribution", {
      headers: {
        "x-tuggi-edge": E2E_EDGE_SHARED_SECRET,
        "CF-Connecting-IP": visitor,
        "x-forwarded-for": "172.69.0.1, 10.0.0.1",
      },
      data: { partner_id: partnerId, user_agent: "e2e-attribution" },
    });
    expect(res.status()).toBe(201);

    const row = await storedFingerprint(request, partnerId);
    expect(row!.ip_address).toBe(visitor);

  });

  test("BR-B2B-002: without that proof the same header buys nothing", async ({ request }) => {
    // THE ORIGIN ANSWERS WITHOUT CLOUDFLARE. Measured 2026-08-18: the
    // .vercel.app URL replies with `server: Vercel` and no `cf-ray`, and on
    // that path `CF-Connecting-IP` is whatever the caller typed. Honouring it
    // filed a capture under a victim's address — the probabilistic leg of
    // §7 then credits the partner for that person's install — and, because the
    // counter is keyed on the same value, handed out a fresh 30/h budget on
    // every request by changing one header.
    //
    // A separate test because the `request` fixture keeps a cookie jar: the
    // capture above is a first touch, and a second call carrying its cookie
    // would be answered from the cookie and write no row at all.
    const partnerId = uniquePartnerId();
    const chain = "198.51.100.24"; // its own counter, not a neighbour's
    const victim = "203.0.113.7";

    const res = await request.post("/api/attribution", {
      headers: {
        "CF-Connecting-IP": victim,
        "x-forwarded-for": `${chain}, 10.0.0.1`,
      },
      data: { partner_id: partnerId, user_agent: "e2e-attribution" },
    });
    expect(res.status()).toBe(201);

    // What Vercel guarantees, and it is the only address here nobody chose:
    // Vercel "overwrite[s] the `X-Forwarded-For` header and do[es] not forward
    // external IPs… to prevent IP spoofing" (vercel.com/docs/headers/
    // request-headers, consulted 2026-08-18).
    const row = await storedFingerprint(request, partnerId);
    expect(row!.ip_address).toBe(chain);
    expect(row!.ip_address).not.toBe(victim);
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

  test("BR-B2B-002: an address that keeps writing is refused: this door has a barrier now", async ({
    request,
  }) => {
    // A public route in front of a `service_role` write, and `service_role`
    // ignores RLS: this limit is the only barrier left. It had none — the
    // fingerprint table was an open pipe for anyone who could POST.
    //
    // THE FLOOD CARRIES A MALFORMED PARTNER ON PURPOSE, and not because the
    // refusal is what is measured — it is not, every one of these answers 400.
    // Two things ride on it: the attempt is counted BEFORE the body is parsed,
    // so a flood of junk is counted like any other (the same order the other
    // public door of the site keeps); and a 400 plants no `tuggi_attr`, so the
    // request context does not start carrying a first touch halfway through and
    // silently turn the rest of the flood into reads, which are a different
    // budget entirely.
    const address = uniqueAddress();
    const post = (partnerId: string) =>
      request.post("/api/attribution", {
        headers: { "x-tuggi-edge": E2E_EDGE_SHARED_SECRET, "CF-Connecting-IP": address },
        data: { partner_id: partnerId, user_agent: "e2e-flood" },
      });

    for (let i = 0; i < CAPTURE_LIMIT_PER_WINDOW; i++) {
      const res = await post("not-a-uuid");
      expect(res.status(), `attempt ${i + 1}`).toBe(400);
    }

    // The one after the budget is a PERFECTLY GOOD capture, and it is refused:
    // what ran out is the address's allowance, not this caller's correctness.
    const partnerId = uniquePartnerId();
    const refused = await post(partnerId);
    expect(refused.status()).toBe(429);
    expect(await refused.json()).toMatchObject({ error: "too_many_captures" });
    expect(Number(refused.headers()["retry-after"])).toBeGreaterThan(0);
    expect(await storedFingerprint(request, partnerId)).toBeNull();
  });

  /* -----------------------------------------------------------------------
   * The two budgets: a read may not spend what a first touch needs
   * --------------------------------------------------------------------- */

  test("BR-B2B-002: a request that writes nothing does not spend a first touch's budget", async ({
    request,
  }) => {
    // THE DEFECT THIS PINS. The counter used to run above both branches, so a
    // visitor who already held `tuggi_attr` — who gets his own click id echoed
    // back and causes no row at all — consumed one of the 30/h of the address.
    // Behind the shared Wi-Fi of a rental desk or a hotel lobby that address is
    // dozens of tourists, and since the consent gate (BR-USUARIO-033) made
    // `PartnerHero` post on every load of an already-attributed visitor, a
    // reload was quietly spending the first touch of a stranger. The first
    // touch is the commission, and losing it is silent.
    const address = uniqueAddress();
    const carried = {
      partner_id: uniquePartnerId(),
      click_id: uniquePartnerId().replace("4444-4444", "4444-8888"),
      ts: new Date().toISOString(),
    };
    const cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(serializeAttribution(carried))}`;

    // More reads than the whole write budget, from one address.
    for (let i = 0; i < CAPTURE_LIMIT_PER_WINDOW + 5; i++) {
      const res = await request.post("/api/attribution", {
        headers: { "x-tuggi-edge": E2E_EDGE_SHARED_SECRET, "CF-Connecting-IP": address, cookie },
        data: { partner_id: uniquePartnerId(), user_agent: "e2e-echo" },
      });
      expect(res.status(), `read ${i + 1}`).toBe(200);
      const body = await res.json();
      expect(body.click_id).toBe(carried.click_id);
      expect(body.first_touch).toBe(false);
    }

    // And the tourist who arrives next, with no cookie, still gets his row.
    const partnerId = uniquePartnerId();
    const firstTouch = await request.post("/api/attribution", {
      headers: { "x-tuggi-edge": E2E_EDGE_SHARED_SECRET, "CF-Connecting-IP": address },
      data: { partner_id: partnerId, user_agent: "e2e-first-touch" },
    });
    expect(firstTouch.status()).toBe(201);
    expect(await storedFingerprint(request, partnerId)).not.toBeNull();
  });

  test("BR-B2B-002: the read has a ceiling of its own, so a forged cookie is not an open door", async ({
    request,
  }) => {
    // The cookie is the client's, and `parseAttribution` can only ask it to be
    // two well-formed UUIDs — so anyone can forge one and reach the branch that
    // skips the write budget. That trade is deliberate (a forged cookie buys a
    // reply repeating what the caller sent, and no row), but the branch may not
    // be a path through a public door with NO ceiling: the route stands in
    // front of a `service_role` write.
    test.setTimeout(120_000);

    const address = uniqueAddress();
    const forged = {
      partner_id: uniquePartnerId(),
      click_id: uniquePartnerId().replace("4444-4444", "4444-9999"),
      ts: new Date().toISOString(),
    };
    const cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(serializeAttribution(forged))}`;
    const read = () =>
      request.post("/api/attribution", {
        headers: { "x-tuggi-edge": E2E_EDGE_SHARED_SECRET, "CF-Connecting-IP": address, cookie },
        data: { partner_id: uniquePartnerId(), user_agent: "e2e-forged" },
      });

    for (let i = 0; i < ECHO_LIMIT_PER_WINDOW; i++) {
      expect((await read()).status(), `read ${i + 1}`).toBe(200);
    }

    const refused = await read();
    expect(refused.status()).toBe(429);
    // Named apart from `too_many_captures`: the log has to be able to tell
    // someone farming rows from a lobby full of tourists reloading.
    expect(await refused.json()).toMatchObject({ error: "too_many_reads" });
    expect(Number(refused.headers()["retry-after"])).toBeGreaterThan(0);
    // Nothing was ever written for the partner the forged cookie names.
    expect(await storedFingerprint(request, forged.partner_id)).toBeNull();

    // AND IT CANNOT BE USED AS A DENIAL EITHER: the budget it exhausted is not
    // the one a real first touch from the same address needs.
    const partnerId = uniquePartnerId();
    const firstTouch = await request.post("/api/attribution", {
      headers: { "x-tuggi-edge": E2E_EDGE_SHARED_SECRET, "CF-Connecting-IP": address },
      data: { partner_id: partnerId, user_agent: "e2e-first-touch" },
    });
    expect(firstTouch.status()).toBe(201);
    expect(await storedFingerprint(request, partnerId)).not.toBeNull();
  });
});

test.describe("every way out of the site carries the first touch", () => {
  // Its own address: these tests load real pages, and the bucket they spend
  // must not be the one every other spec of the suite is spending. It is
  // `x-forwarded-for` and not `CF-Connecting-IP`, which since 806cf45 is
  // ignored without the edge proof and left these tests back on the shared
  // loopback bucket. `test.use` REPLACES the option, so the territory above has
  // to be repeated here.
  test.use({
    extraHTTPHeaders: { "x-forwarded-for": "198.51.100.211", "x-vercel-ip-country": "BR" },
  });

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
  test.use({
    extraHTTPHeaders: { "x-forwarded-for": "198.51.100.212", "x-vercel-ip-country": "BR" },
  });

  test("BR-B2B-001: it still offers the app, and stays out of the index", async ({ page }) => {
    // The QR only ever attributed. A slug that was renamed, retired or printed
    // with a typo costs the partner the credit — it must not also cost the
    // tourist the download, which is what the 404 did: it offers the home page
    // and support, and no store link anywhere.
    const response = await page.goto("/d/nao-existe-2026?lang=en");
    expect(response?.status()).toBe(200);

    expect(await storeUrlFromCta(page)).toBe(PLAY_STORE_URL);
  });

  test("BR-B2B-001: nothing is credited to a partner we could not resolve", async ({ page }) => {
    await page.goto("/d/nao-existe-2026?lang=en");
    await page.waitForLoadState("networkidle");

    expect((await storedAttribution(page)).cookie).toBeUndefined();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );
  });
});
