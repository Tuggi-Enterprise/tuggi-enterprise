import { test, expect, devices, type APIRequestContext, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT, E2E_PUBLISHABLE_KEY } from "../../playwright.config";
import { PLAY_STORE_URL, routePlayStoreUrl } from "../../src/lib/app-meta";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_IP_PATH } from "../../src/lib/attribution";
import { visitorHeaders } from "./visitor-headers";

/**
 * The route page — `tuggi.app/r/<slug>`, card #946, spec
 * `docs/design/spec-link-da-rota-2026-10.md` §1, contract
 * `docs/contracts/link-da-rota.md`, BR-ROTA-005 and BR-USUARIO-012.
 *
 * Two halves:
 *  - "served HTML" runs on Playwright's `request` and opens no browser: the
 *    AASA, the states of the page, the one badge per platform, the Play
 *    referrer that carries the slug, the redirects and the key.
 *  - "in the browser" proves the clipboard: the store tap leaves the whole
 *    link, the Copy button copies the code.
 *
 * Data from `get_custom_route_by_slug` / `get_custom_route_by_id` in
 * mock-supabase-server.mjs (ROUTE_FIXTURES), and the share meta of #1222 from
 * `get_route_share_meta` (ROUTE_SHARE_META): the author's capture and the
 * preview with the cover, BR-ROTA-005 item 8.
 */

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;
const IPHONE_UA = devices["iPhone 13"].userAgent;
const ANDROID_UA = devices["Pixel 7"].userAgent;
const DESKTOP_UA = devices["Desktop Chrome"].userAgent;
const ROUTE_ID = "6a1f3c2e-9b7d-4e21-8f00-1c2d3e4f5a6b";

async function html(
  request: APIRequestContext,
  path: string,
  userAgent = IPHONE_UA
): Promise<{ status: number; body: string }> {
  const response = await request.get(path, {
    headers: { "user-agent": userAgent, "accept-language": "pt-BR,pt;q=0.9" },
    maxRedirects: 0,
  });
  return { status: response.status(), body: await response.text() };
}

const count = (body: string, needle: string) => body.split(needle).length - 1;

// Top level: a device preset forces its own worker and cannot sit in a group.
// The served-HTML half passes its user agent per request, so it is unaffected.
test.use({
  ...devices["iPhone 13"],
  browserName: "chromium",
  extraHTTPHeaders: { ...visitorHeaders(), "accept-language": "pt-BR,pt;q=0.9" },
  permissions: ["clipboard-read", "clipboard-write"],
});

test.describe("route page /r/<slug> — served HTML (#946)", () => {
  test("the AASA claims /r/* and /route/* for the app, as JSON", async ({ request }) => {
    const response = await request.get("/.well-known/apple-app-site-association");
    expect(response.status()).toBe(200);
    const aasa = JSON.parse(await response.text());
    const paths: string[] = aasa.applinks.details[0].paths;
    expect(paths).toEqual(expect.arrayContaining(["/r/*", "/route/*", "/d/*"]));
  });

  test("the assetlinks.json delegates every URL of the host to the app", async ({ request }) => {
    const response = await request.get("/.well-known/assetlinks.json");
    expect(response.status()).toBe(200);
    const links = JSON.parse(await response.text());
    expect(links[0].relation).toContain("delegate_permission/common.handle_all_urls");
    expect(links[0].target.package_name).toBe("com.tuggidrive.app");
  });

  test("BR-ROTA-005: an available route shows its name, facts, code, steps and the store", async ({ request }) => {
    const { status, body } = await html(request, "/r/litoral-norte");
    expect(status).toBe(200);
    expect(body).toContain('data-testid="route-available"');
    expect(body).toContain("Litoral Norte");
    expect(body).toContain("Ubatuba, Brasil · 4 paradas");
    expect(body).toMatch(/data-testid="route-code"[^>]*>litoral-norte</);
    expect(body).toContain("<strong");
    expect(body).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(body).toMatch(/<title>Litoral Norte \| TUGGI<\/title>/);
    // No key ever renders raw (spec §5 item 6).
    expect(body).not.toMatch(/RouteLink\.\w+/);
  });

  test("a partner route names the partner; a route without stops or region draws no empty fact", async ({ request }) => {
    const { body } = await html(request, "/r/roteiro-do-hotel-3f9a1c");
    expect(body).toContain('data-testid="route-partner"');
    expect(body).toContain("Pousada Mar Azul");
    expect(body).not.toContain('data-testid="route-facts"');
  });

  test("epic #942 decision 4: an expired route keeps the whole page", async ({ request }) => {
    const { body } = await html(request, "/r/roteiro-vencido");
    expect(body).toContain('data-testid="route-available"');
    expect(body).toContain('data-testid="route-code"');
  });

  test("spec §0.2: iPhone sees only the App Store badge, with the Android line", async ({ request }) => {
    const { body } = await html(request, "/r/litoral-norte", IPHONE_UA);
    expect(count(body, 'data-testid="route-store-app"')).toBe(1);
    expect(body).not.toContain('data-testid="route-store-play"');
    expect(body).toContain("Usa Android? Baixe no Google Play");
  });

  test("Android sees only Google Play, and its link carries the slug in the referrer", async ({ request }) => {
    const { body } = await html(request, "/r/litoral-norte", ANDROID_UA);
    expect(body).toContain('data-testid="route-store-play"');
    expect(body).not.toContain('data-testid="route-store-app"');
    expect(body).toContain("Usa iPhone? Baixe na App Store");
    const playLink = body.match(/href="(https:\/\/play\.google\.com[^"]+)"/)?.[1] ?? "";
    expect(playLink).toBeTruthy();
    const referrer = new URL(playLink.replace(/&amp;/g, "&")).searchParams.get("referrer") ?? "";
    expect(new URLSearchParams(referrer).get("tuggi_route")).toBe("litoral-norte");
    // No partner token in the served HTML: the click id only exists in the
    // browser, after the capture (#1222, the browser half below).
    expect(referrer).not.toContain("tuggi_click_");
  });

  test("desktop sees both badges", async ({ request }) => {
    const { body } = await html(request, "/r/litoral-norte", DESKTOP_UA);
    expect(body).toContain('data-testid="route-store-app"');
    expect(body).toContain('data-testid="route-store-play"');
  });

  test("#946: on a phone, Open in the app sits above the badges and opens the app by its scheme", async ({ request }) => {
    for (const ua of [IPHONE_UA, ANDROID_UA]) {
      const { body } = await html(request, "/r/litoral-norte", ua);
      const button = body.match(/<a[^>]*data-testid="route-open-app"[^>]*>([^<]*)</);
      expect(button?.[0]).toContain(`href="tuggi://route?id=${ROUTE_ID}"`);
      expect(button?.[1]).toBe("Abrir no app");
      // Not sent to the store on its own: a plain link, no target, no redirect.
      expect(button?.[0]).not.toContain("target=");
      const store = ua === IPHONE_UA ? 'data-testid="route-store-app"' : 'data-testid="route-store-play"';
      expect(body.indexOf('data-testid="route-open-app"')).toBeLessThan(body.indexOf(store));
    }
  });

  test("#946: no Open in the app on desktop or on a route that cannot open", async ({ request }) => {
    expect((await html(request, "/r/litoral-norte", DESKTOP_UA)).body).not.toContain('data-testid="route-open-app"');
    for (const slug of ["em-revisao", "tirado-do-ar", "nao-existe"]) {
      expect((await html(request, `/r/${slug}`)).body).not.toContain('data-testid="route-open-app"');
    }
  });

  test("#946: the Smart App Banner names the app and hands it the route link", async ({ request }) => {
    const { body } = await html(request, "/r/litoral-norte");
    expect(body).toContain(
      '<meta name="apple-itunes-app" content="app-id=6744379818, app-argument=https://tuggi.app/r/litoral-norte"/>'
    );
    // Unavailable: the banner still offers the app, with no route to hand over.
    expect((await html(request, "/r/nao-existe")).body).toContain(
      '<meta name="apple-itunes-app" content="app-id=6744379818"/>'
    );
  });

  test("an old slug redirects permanently to the current one", async ({ request }) => {
    const { status } = await html(request, "/r/litoral-antigo");
    expect(status).toBe(308);
    const response = await request.get("/r/litoral-antigo", { maxRedirects: 0 });
    expect(response.headers()["location"]).toMatch(/\/r\/litoral-norte$/);
  });

  test("the slug typed in capitals redirects to the canonical one", async ({ request }) => {
    const response = await request.get("/r/Litoral-Norte", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toMatch(/\/r\/litoral-norte$/);
  });

  for (const [slug, testId, title] of [
    ["em-revisao", "route-review", "Este roteiro ainda não está disponível"],
    ["tirado-do-ar", "route-gone", "Este roteiro não está mais disponível"],
    ["removido", "route-gone", "Este roteiro não está mais disponível"],
    ["nao-existe", "route-not_found", "Não achamos este roteiro"],
    ["e2e-sem-funcao", "route-not_found", "Não achamos este roteiro"],
  ] as const) {
    test(`BR-USUARIO-012: ${slug} → its state, the store, and no code`, async ({ request }) => {
      const { status, body } = await html(request, `/r/${slug}`);
      expect(status).toBe(200);
      expect(body).toContain(`data-testid="${testId}"`);
      expect(body).toContain(title);
      expect(body).toContain('data-testid="route-store-app"');
      expect(body).toContain("Baixar o app");
      expect(body).not.toContain('data-testid="route-code"');
    });
  }

  test("a segment that can never be a slug is not forwarded to the database", async ({ request }) => {
    const { status, body } = await html(request, "/r/a_b%3Cscript%3E");
    expect(status).toBe(200);
    expect(body).toContain('data-testid="route-not_found"');
  });

  test("the legacy /route/<uuid> redirects to the route's slug", async ({ request }) => {
    const response = await request.get(`/route/${ROUTE_ID}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toMatch(/\/r\/litoral-norte$/);
  });

  test("an unknown /route/<uuid> gets the not-found page with the store, not a 404", async ({ request }) => {
    const { status, body } = await html(request, "/route/00000000-0000-4000-8000-000000000000");
    expect(status).toBe(200);
    expect(body).toContain('data-testid="route-not_found"');
    expect(body).toContain('data-testid="route-store-app"');
  });

  test("the lookup uses the publishable key, not service_role", async ({ request }) => {
    await html(request, "/r/litoral-norte");
    const keys = (await (await request.get(`${MOCK_BASE}/__apikeys`)).json()) as {
      byRoute: Record<string, string>;
    };
    expect(keys.byRoute["POST /rest/v1/rpc/get_custom_route_by_slug"]).toBe(E2E_PUBLISHABLE_KEY);
  });

  test("the language follows the visitor, with no locale in the link", async ({ request }) => {
    const response = await request.get("/r/litoral-norte", {
      headers: { "user-agent": IPHONE_UA, "accept-language": "it-IT,it;q=0.9" },
    });
    const body = await response.text();
    expect(body).toContain("Itinerario su Tuggi");
    expect(body).toContain("4 tappe");
  });
});

test.describe("route page /r/<slug> — in the browser (#946)", () => {
  // The link carries no locale: the page follows Accept-Language, and a bare
  // Chromium context sends en-US. The copy asserted below is the pt one, so
  // the visitor has to be Brazilian; clipboard-read is what readText() needs.
  test.use({ locale: "pt-BR", permissions: ["clipboard-read", "clipboard-write"] });

  async function stubTheStores(page: Page): Promise<void> {
    await page.context().route(/apps\.apple\.com|play\.google\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>store stub</html>" })
    );
  }

  test("spec §5 item 4: the store tap leaves the whole link in the clipboard and the note on the page", async ({ page }) => {
    await stubTheStores(page);
    await page.goto("/r/litoral-norte");
    const popup = page.context().waitForEvent("page");
    await page.getByTestId("route-store-app").click();
    await (await popup).close();

    await expect(page.getByTestId("route-copied-note")).toHaveText(
      "Copiamos o código. Se o roteiro não abrir sozinho, cole no app."
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "https://tuggi.app/r/litoral-norte"
    );
  });

  test("Copy copies the code and announces it", async ({ page }) => {
    await page.goto("/r/litoral-norte");
    await page.getByTestId("route-code-copy").click();
    await expect(page.getByRole("status").filter({ hasText: "Copiado" })).toHaveCount(1);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("litoral-norte");
  });
});

/* ---------------------------------------------------------------------------
 * #1222: the link of a creator's route credits its author, and its preview
 * shows the route (BR-ROTA-005 item 8; contract link-da-rota.md §5a)
 * ------------------------------------------------------------------------- */

const CREATOR_ROUTE = "roteiro-da-criadora-k3v9q2mz7c0d";
const CREATOR_PARTNER_ID = "1222b001-6c7d-4e8f-9a01-b2c3d4e5f6a7";
/** Visited only from a gated territory in this file, so its partner never gets a row. */
const GATED_ROUTE = "roteiro-de-lisboa-m4x8w2r6t0yq";
const GATED_PARTNER_ID = "1222b002-6c7d-4e8f-9a01-b2c3d4e5f6a7";
const NO_COVER_ROUTE = "roteiro-sem-capa-p3n7v1c5x9za";
const REFUSED_COVER_ROUTE = "capa-recusada-h2j6k0m4q8st";
/** A CMS route: the share meta answers a row with nobody to credit. */
const CMS_ROUTE = "roteiro-do-hotel-3f9a1c";
/** The account id inside the cover key of the double (ROUTE_COVER_OWNER_UID). */
const COVER_OWNER_UID = "4b1c9d2e-7a3f-4e5d-8c6b-1222c0ffee00";
const COVER_KEY = `${COVER_OWNER_UID}/2f4e6a8c-1b3d-4f5a-9c7e-0d2b4f6a8c1e/5a7c9e1b-3d5f-4a6c-8e0b-2d4f6a8c0e2a.jpg`;
const CLICK_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
/** This file's own address: the capture's write budget counts per address. */
const SPEC_ADDRESS = `2001:db8:1222:1::${Math.floor(Math.random() * 0xffff).toString(16)}`;
const STORAGE_LEAKS = ["travel-diary-photos", "/sign/", "token=", COVER_OWNER_UID, COVER_KEY];

const referrerOf = (playLink: string) =>
  new URL(playLink.replace(/&amp;/g, "&")).searchParams.get("referrer") ?? "";
const ogImageOf = (body: string) =>
  /<meta property="og:image" content="([^"]+)"/.exec(body)?.[1] ?? "";

async function fingerprintOf(partnerId: string): Promise<unknown> {
  const res = await fetch(`${MOCK_BASE}/__fingerprints?partner_id=${partnerId}`);
  return ((await res.json()) as { row: unknown }).row;
}

/** The share card of a route, fetched the way a preview robot does: the og:image of the page. */
async function cardOf(request: APIRequestContext, slug: string): Promise<{ url: string; bytes: Buffer }> {
  const { body } = await html(request, `/r/${slug}`);
  const url = ogImageOf(body);
  const res = await request.get(new URL(url).pathname + new URL(url).search);
  expect(res.status(), url).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  return { url, bytes: await res.body() };
}

test.describe("BR-ROTA-005 item 8.a: the route's Play link carries the slug and the click (#1222)", () => {
  test("with a click id, `tuggi_route=<slug>` and `tuggi_click_<uuid>` ride in the same referrer", () => {
    const referrer = referrerOf(routePlayStoreUrl(CREATOR_ROUTE, CLICK_ID));
    expect(routePlayStoreUrl(CREATOR_ROUTE, CLICK_ID).startsWith(`${PLAY_STORE_URL}&referrer=`)).toBe(true);
    expect(new URLSearchParams(referrer).get("tuggi_route")).toBe(CREATOR_ROUTE);
    // A segment of its own, without `=`: the app finds the token anywhere in
    // the referrer and its slug reader skips a segment that has no value.
    expect(referrer.split("&")).toContain(`tuggi_click_${CLICK_ID}`);
    expect(referrer.split("&").filter((pair) => !pair.includes("="))).toEqual([`tuggi_click_${CLICK_ID}`]);
  });

  test("without a click id, or with one that is not a UUID, nothing but the slug and the tags", () => {
    for (const clickId of [null, undefined, "", "not-a-uuid", CREATOR_PARTNER_ID.slice(1)]) {
      const referrer = referrerOf(routePlayStoreUrl(CREATOR_ROUTE, clickId));
      expect(referrer).toBe(
        `utm_source=tuggi_site&utm_medium=route_link&utm_campaign=route&tuggi_route=${CREATOR_ROUTE}`
      );
    }
  });
});

test.describe("BR-ROTA-005 item 8.b: the preview of a creator's route (#1222)", () => {
  test("og:image names the site's own card, and nothing of the storage reaches the document", async ({ request }) => {
    const { body } = await html(request, `/r/${CREATOR_ROUTE}`);
    expect(ogImageOf(body)).toMatch(
      new RegExp(`^http://127\\.0\\.0\\.1:3100/pt/r/${CREATOR_ROUTE}/opengraph-image(?:-\\w+)?(?:\\?[\\w-]+)?$`)
    );
    expect(body).toContain('<meta property="og:image:type" content="image/png"/>');
    // The default picture is drawn by the card when it has to be, never named
    // by the page (JSON-LD keeps its own screenshot, outside the preview).
    expect(body).not.toMatch(/<meta[^>]+og-image-tuggi\.jpg/);
    // Next hands the same card to the twitter card, which names no image of its own.
    expect(/<meta name="twitter:image" content="([^"]+)"/.exec(body)?.[1]).toBe(ogImageOf(body));
    for (const leak of STORAGE_LEAKS) expect(body, `the document carries ${leak}`).not.toContain(leak);
  });

  test("the RSC payload carries the author's record for the capture, and no cover key", async ({ request }) => {
    const res = await request.get(`/r/${CREATOR_ROUTE}`, { headers: { "user-agent": IPHONE_UA, RSC: "1" } });
    expect(res.headers()["content-type"]).toContain("text/x-component");
    const payload = await res.text();
    expect(payload).toContain(CREATOR_PARTNER_ID);
    for (const leak of STORAGE_LEAKS) expect(payload, `the payload carries ${leak}`).not.toContain(leak);
  });

  test("the card draws the cover, read with the publishable key, and answers nothing of the storage", async ({ request }) => {
    const cover = await cardOf(request, CREATOR_ROUTE);
    const fallback = await cardOf(request, NO_COVER_ROUTE);
    expect(cover.bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(cover.bytes.equals(fallback.bytes)).toBe(false);

    const keys = (await (await request.get(`${MOCK_BASE}/__apikeys`)).json()) as { byRoute: Record<string, string> };
    expect(keys.byRoute["POST /rest/v1/rpc/get_route_share_meta"]).toBe(E2E_PUBLISHABLE_KEY);
    expect(keys.byRoute[`GET /storage/v1/object/travel-diary-photos/${COVER_KEY}`]).toBe(E2E_PUBLISHABLE_KEY);

    const res = await request.get(new URL(cover.url).pathname + new URL(cover.url).search, { maxRedirects: 0 });
    expect(res.headers()["location"]).toBeUndefined();
    expect(JSON.stringify(res.headers())).not.toContain(COVER_OWNER_UID);
  });

  test("no cover, a refused download, no meta yet (PGRST202), a route in review or unknown: the default card", async ({ request }) => {
    // Six pages and six cards drawn on the server.
    test.slow();
    // The default card of the site, as the partner page without a seal serves it.
    const generic = await request.get("/pt/d/e2e-sem-logo/opengraph-image");
    expect(generic.status()).toBe(200);
    const genericBytes = await generic.body();
    for (const slug of [NO_COVER_ROUTE, REFUSED_COVER_ROUTE, "litoral-norte", CMS_ROUTE, "em-revisao", "nao-existe"]) {
      const { bytes } = await cardOf(request, slug);
      expect(bytes.equals(genericBytes), `${slug} is not the default card`).toBe(true);
    }
  });
});

test.describe("BR-ROTA-005 item 8.a: the page of a creator's route captures for the author (#1222)", () => {
  test.use({
    locale: "pt-BR",
    extraHTTPHeaders: { ...visitorHeaders({ country: "BR", address: SPEC_ADDRESS }), "accept-language": "pt-BR,pt;q=0.9" },
  });

  function capturesOn(page: Page): string[] {
    const posts: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && new URL(req.url()).pathname === "/api/attribution") posts.push(req.postData() ?? "");
    });
    return posts;
  }

  test("BR-B2B-002: with an author, the capture of /@nome runs once, for the author", async ({ page, context }) => {
    // The IPv4 complement that follows a capture goes to the app's Edge
    // Function; its own spec proves it. Answered here so the page settles.
    await page.route(`**${ATTRIBUTION_IP_PATH}`, (route) => route.fulfill({ status: 204 }));
    const posts = capturesOn(page);
    const captured = page.waitForResponse(
      (res) => new URL(res.url()).pathname === "/api/attribution" && res.request().method() === "POST"
    );
    await page.goto(`/r/${CREATOR_ROUTE}`);
    const answer = (await (await captured).json()) as { click_id: string | null; first_touch: boolean };
    expect(answer.first_touch).toBe(true);
    expect(answer.click_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0]).partner_id).toBe(CREATOR_PARTNER_ID);
    await expect.poll(() => fingerprintOf(CREATOR_PARTNER_ID)).not.toBeNull();
    expect((await context.cookies()).some((c) => c.name === ATTRIBUTION_COOKIE)).toBe(true);
    await page.waitForLoadState("networkidle");
    expect(posts).toHaveLength(1);
  });

  for (const [slug, why] of [
    [CMS_ROUTE, "a CMS route credits nobody"],
    ["litoral-norte", "PGRST202, the meta not applied yet"],
  ] as const) {
    test(`no author, no capture: ${why}, and the page still renders whole`, async ({ page }) => {
      const posts = capturesOn(page);
      await page.goto(`/r/${slug}`);
      await expect(page.getByTestId("route-available")).toBeVisible();
      await expect(page.getByTestId("route-code")).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(posts).toEqual([]);
    });
  }

  test.describe("on Android", () => {
    test.use({ userAgent: ANDROID_UA });

    test("item 6 and 8.a: after the capture, the Play badge carries the slug and the author's click", async ({ page }) => {
      const captured = page.waitForResponse(
        (res) => new URL(res.url()).pathname === "/api/attribution" && res.request().method() === "POST"
      );
      await page.goto(`/r/${CREATOR_ROUTE}`);
      const { click_id: clickId } = (await (await captured).json()) as { click_id: string };
      const badge = page.getByTestId("route-store-play");
      await expect(badge).toHaveAttribute("href", /tuggi_click_/);
      const referrer = referrerOf((await badge.getAttribute("href")) ?? "");
      expect(new URLSearchParams(referrer).get("tuggi_route")).toBe(CREATOR_ROUTE);
      expect(referrer.split("&")).toContain(`tuggi_click_${clickId}`);
    });
  });

  test("item 8.a: on the iPhone the store tap leaves the route's link in the pasteboard, never the click", async ({ page }) => {
    await page.context().route(/apps\.apple\.com|play\.google\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>store stub</html>" })
    );
    const captured = page.waitForResponse(
      (res) => new URL(res.url()).pathname === "/api/attribution" && res.request().method() === "POST"
    );
    await page.goto(`/r/${CREATOR_ROUTE}`);
    expect(((await (await captured).json()) as { click_id: string | null }).click_id).toBeTruthy();
    const popup = page.context().waitForEvent("page");
    await page.getByTestId("route-store-app").click();
    await (await popup).close();
    await expect(page.getByTestId("route-copied-note")).not.toBeEmpty();
    const pasted = await page.evaluate(() => navigator.clipboard.readText());
    expect(pasted).toBe(`https://tuggi.app/r/${CREATOR_ROUTE}`);
    expect(pasted).not.toContain("tuggi_click_");
  });
});

test.describe("BR-USUARIO-033: a creator's route opened where consent comes first (#1222)", () => {
  test.use({
    locale: "pt-BR",
    userAgent: ANDROID_UA,
    extraHTTPHeaders: { ...visitorHeaders({ country: "PT", address: SPEC_ADDRESS }), "accept-language": "pt-PT,pt;q=0.9" },
  });

  test("without consent nothing is captured: the server refuses, no row, no cookie, no click in the Play link", async ({ page, context }) => {
    const captured = page.waitForResponse(
      (res) => new URL(res.url()).pathname === "/api/attribution" && res.request().method() === "POST"
    );
    await page.goto(`/r/${GATED_ROUTE}`);
    const answer = (await (await captured).json()) as { click_id: string | null; consent_required?: boolean };
    expect(answer).toMatchObject({ click_id: null, consent_required: true });
    await page.waitForLoadState("networkidle");

    expect(await fingerprintOf(GATED_PARTNER_ID)).toBeNull();
    expect((await context.cookies()).some((c) => c.name === ATTRIBUTION_COOKIE)).toBe(false);
    const referrer = referrerOf((await page.getByTestId("route-store-play").getAttribute("href")) ?? "");
    expect(new URLSearchParams(referrer).get("tuggi_route")).toBe(GATED_ROUTE);
    expect(referrer).not.toContain("tuggi_click_");
  });
});
