import { test, expect, devices, type APIRequestContext, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT, E2E_PUBLISHABLE_KEY } from "../../playwright.config";

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
 * mock-supabase-server.mjs (ROUTE_FIXTURES).
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
  extraHTTPHeaders: { "accept-language": "pt-BR,pt;q=0.9" },
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
    // No partner token: the route page does not run the partner capture.
    expect(referrer).not.toContain("tuggi_click_");
  });

  test("desktop sees both badges", async ({ request }) => {
    const { body } = await html(request, "/r/litoral-norte", DESKTOP_UA);
    expect(body).toContain('data-testid="route-store-app"');
    expect(body).toContain('data-testid="route-store-play"');
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
