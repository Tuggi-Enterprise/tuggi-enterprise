import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import { PAGE_VISIT_LIMIT_PER_WINDOW } from "../../src/lib/public-page";
import { visitorHeaders } from "./visitor-headers";

/**
 * The partner page, `tuggi.app/@nome` and `/d/{slug}` (#1141).
 *
 * BR-B2B-037 item 2: one resolver (`partner.resolve_public_page`), two doors,
 * the same page and the same attribution.
 * BR-B2B-067: blocks by what the partner has (2.a, 2.b); opening attributes
 * like `/d/{slug}` and nothing else (3); spelling and the old @ redirect for
 * good (4); every name without a page is the same 404, with no capture (5); a
 * client whose contract ended stops attributing (6); each opening counts and
 * never for a robot (7); no commission nor registration data (edge cases).
 * DS-COMPONENTE-110: no empty block, no number without a base, content in the
 * server HTML.
 *
 * Fixtures: PUBLIC_PAGE_FIXTURES in mock-supabase-server.mjs. Serial, because
 * the visit counts are read as a difference on shared fixtures.
 */

test.describe.configure({ mode: "serial" });

const MOCK = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;
const CREATOR_ID = "7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a";
const EMPTY_CREATOR_ID = "7b7b7b7b-7b7b-4b7b-8b7b-7b7b7b7b7b7b";
const CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const ENDED_CLIENT_ID = "55555555-5555-4555-8555-555555555555";
/** The account id inside the photo key of the double (PHOTO_OWNER_UID in mock-supabase-server.mjs). */
const PHOTO_OWNER_UID = "5f0d3e2a-9b1c-4c7e-a6d2-114100c0ffee";

/** A person's browser. Playwright's headless one says "HeadlessChrome", which the page counts as a robot. */
const PERSON_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// Brazil: the page speaks pt and the attribution gate lets the capture through.
// The address gives the capture and the visit count rate-limit buckets of
// their own, new on every run: the double keeps its counters while it runs,
// and a local rerun reuses it.
const SPEC_ADDRESS = `2001:db8:1141:1::${Math.floor(Math.random() * 0xffff).toString(16)}`;
test.use({
  userAgent: PERSON_UA,
  extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
});

async function visitsOf(clientId: string): Promise<{ client_id: string; via: string }[]> {
  const res = await fetch(`${MOCK}/__page-visits?client_id=${clientId}`);
  return ((await res.json()) as { rows: { client_id: string; via: string }[] }).rows;
}

async function fingerprintOf(partnerId: string): Promise<unknown> {
  const res = await fetch(`${MOCK}/__fingerprints?partner_id=${partnerId}`);
  return ((await res.json()) as { row: unknown }).row;
}

async function html(request: APIRequestContext, path: string, ua = PERSON_UA) {
  const res = await request.get(path, { maxRedirects: 0, headers: { "user-agent": ua } });
  return { status: res.status(), headers: res.headers(), body: await res.text() };
}

/** The rendered page, without the layout nor the serialized payload after it. */
const mainOf = (body: string) => /<main[^>]*data-partner-page[\s\S]*?<\/main>/.exec(body)?.[0] ?? "";
const canonicalOf = (body: string) => /<link rel="canonical" href="([^"]+)"/.exec(body)?.[1] ?? null;
const robotsOf = (body: string) => /<meta name="robots" content="([^"]+)"/.exec(body)?.[1] ?? "";

/** The page's own content, without the layout around it. */
async function pageText(page: Page, path: string): Promise<string> {
  await page.goto(path);
  // The map of the featured route draws its controls on hydration: compare both doors once drawn.
  if (await page.getByTestId("featured-route").count()) await page.locator(".leaflet-control-attribution").waitFor();
  return (await page.locator("main[data-partner-page]").innerText()).replace(/\s+/g, " ").trim();
}

/** Every capture the browser asks for, to prove there was none. */
function capturesOn(page: Page): string[] {
  const posts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/attribution") posts.push(req.postData() ?? "");
  });
  return posts;
}

test.describe("BR-B2B-067 item 2.b: the creator's page", () => {
  test("is in the server HTML with name, @, bio, the three numbers, the itineraries and the featured one", async ({ request }) => {
    const { status, body: doc } = await html(request, "/@e2e.criadora");
    expect(status).toBe(200);
    const body = mainOf(doc);
    expect(body).toContain("Ana Serra");
    expect(body).toContain("@e2e.criadora");
    expect(body).toContain("Guia credenciada na Serra Gaúcha");
    // pt, from Brazil: the grouping of the language, and the plural from i18n.
    expect(body).toMatch(/data-testid="creator-stat-listeners"[\s\S]*?1\.284/);
    expect(body).toMatch(/data-testid="creator-stat-routes"[\s\S]*?>3</);
    expect(body).toMatch(/data-testid="creator-stat-discovered"[\s\S]*?>2</);
    expect(body).toContain('href="/r/centro-de-gramado-a-pe"');
    expect(body).toContain("Mirante do Vale do Quilombo");
    expect(body).toContain('data-testid="featured-route"');
    expect(body).toContain("Escadaria da Rua Torta");
    expect(canonicalOf(doc)).toBe("http://127.0.0.1:3100/@e2e.criadora");
    expect(robotsOf(doc)).not.toContain("noindex");
    // Edge case: no commission nor registration data on the page.
    expect(body).not.toMatch(/CNPJ|CPF|comiss/i);
  });

  test("BR-B2B-067 item 2.b, DS-COMPONENTE-133: the authorized name is the title and the @ the line under it", async ({ request }) => {
    const { body: doc } = await html(request, "/@e2e.criadora");
    const body = mainOf(doc);
    expect(body).toMatch(/<h1[^>]*>[\s\S]*?Ana Serra[\s\S]*?<\/h1>\s*<p[^>]*>@e2e\.criadora<\/p>/);
    expect(body).toContain("Descoberto por Ana Serra");
    expect(doc).toMatch(/<title>Ana Serra:/);
  });

  test("BR-B2B-067 item 2.b, DS-COMPONENTE-133: without the authorization the title is the @, said once", async ({ request }) => {
    const { status, body: doc } = await html(request, "/@e2e-criador-sem-nome");
    expect(status).toBe(200);
    const body = mainOf(doc);
    expect(body).toMatch(/<h1[^>]*>[\s\S]*?@e2e-criador-sem-nome[\s\S]*?<\/h1>/);
    // The @ only in the title: no line under it repeating it.
    expect(body).not.toMatch(/<\/h1>\s*<p/);
    expect(body).toMatch(/data-testid="creator-initial"[^>]*>E</);
    expect(doc).toMatch(/<title>@e2e-criador-sem-nome:/);
  });

  test("DS-COMPONENTE-110: before the second migration, with nothing published, no block is empty and no number is zero", async ({ request }) => {
    const { status, body: doc } = await html(request, "/@e2e-criador-vazio");
    expect(status).toBe(200);
    const body = mainOf(doc);
    expect(body).toContain("Bruno Lima");
    expect(body).toContain('data-testid="creator-initial"');
    expect(body).not.toContain("creator-stat-");
    expect(body).not.toContain('data-testid="featured-route"');
    expect(body).not.toContain('id="routes"');
    expect(body).not.toContain("creator-bio");
  });

  test("BR-B2B-067 item 2.b: the photo is named by the public @ and nothing of the storage reaches the visitor", async ({ request }) => {
    for (const path of ["/@e2e-criador-foto", "/d/e2e-criador-foto"]) {
      const { status, body: doc } = await html(request, path);
      expect(status).toBe(200);
      expect(mainOf(doc)).toMatch(/<img[^>]+src="\/@e2e-criador-foto\/photo\?v=[\w-]+"/);
      // The whole document: the HTML, the metadata and the payload serialized after it.
      for (const leak of ["profile-photos", "/sign/", "token=", PHOTO_OWNER_UID, "googleusercontent"]) {
        expect(doc, `${path} carries ${leak}`).not.toContain(leak);
      }
    }
  });

  test("BR-B2B-067 item 2.b: the RSC payload of the page does not carry the photo key either", async ({ request }) => {
    const res = await request.get("/@e2e-criador-foto", { headers: { "user-agent": PERSON_UA, RSC: "1" } });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/x-component");
    const payload = await res.text();
    expect(payload).toContain("Carla Dias");
    for (const leak of ["profile-photos", "/sign/", "token=", PHOTO_OWNER_UID]) {
      expect(payload, `the payload carries ${leak}`).not.toContain(leak);
    }
  });

  test("BR-B2B-067 item 2.b: the photo route serves the moderated bytes, cached for minutes only", async ({ request }) => {
    const { body: doc } = await html(request, "/@e2e-criador-foto");
    const src = /<img[^>]+src="(\/@e2e-criador-foto\/photo\?v=[\w-]+)"[^>]+data-testid="creator-photo"/.exec(mainOf(doc))![1];
    const res = await request.get(src);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/jpeg");
    expect(res.headers()["cache-control"]).toBe("public, max-age=300");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    const bytes = await res.body();
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
    expect(res.headers()["location"]).toBeUndefined();
    // Nothing of the storage in the answer either: not the key, not the account id.
    expect(JSON.stringify(res.headers())).not.toContain(PHOTO_OWNER_UID);
  });

  test("BR-B2B-064 item 4.a: the guide shown in Parceiros has its photo at the same address, without a page", async ({ request }) => {
    // The resolver has no page for this @: the route asks partner.public_photo_key alone.
    expect((await request.get("/@e2e-guia-listado", { maxRedirects: 0 })).status()).toBe(404);
    const res = await request.get("/@e2e-guia-listado/photo", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/jpeg");
    expect(res.headers()["cache-control"]).toBe("public, max-age=300");
    expect(JSON.stringify(res.headers())).not.toContain(PHOTO_OWNER_UID);
  });

  test("BR-B2B-067 item 5: a database that did not answer is a 503, never the 404 of a name without a photo", async ({ request }) => {
    const res = await request.get("/@e2e-foto-instavel/photo", { maxRedirects: 0 });
    expect(res.status()).toBe(503);
    expect(res.headers()["cache-control"]).toBe("no-store");
  });

  test("BR-B2B-067 item 5: the photo route answers one 404 for every name without a photo", async ({ request }) => {
    const answers: string[] = [];
    // No page, a regular user, a creator without a photo, a client, another spelling.
    for (const name of ["nao.existe", "e2e-usuario-comum", "e2e-criador-vazio", "e2e-sem-logo", "E2E.Criadora"]) {
      const res = await request.get(`/@${name}/photo`, { maxRedirects: 0 });
      expect(res.status(), name).toBe(404);
      answers.push(JSON.stringify([res.headers()["content-type"], res.headers()["cache-control"], await res.text()]));
    }
    expect(new Set(answers).size).toBe(1);
  });
});

test.describe("BR-B2B-037 item 2: /d/{slug} and /@nome are the same page", () => {
  test("a creator: same content, canonical at /@", async ({ page, request }) => {
    const at = await pageText(page, "/@e2e.criadora");
    const d = await pageText(page, "/d/e2e.criadora");
    expect(d).toBe(at);
    expect(canonicalOf((await html(request, "/d/e2e.criadora")).body)).toBe("http://127.0.0.1:3100/@e2e.criadora");
  });

  test("a client: the page /d/ already served, canonical at /@", async ({ page, request }) => {
    const at = await pageText(page, "/@e2e-sem-logo");
    const d = await pageText(page, "/d/e2e-sem-logo");
    expect(at).toContain("Delícias do Vale do Café");
    expect(d).toBe(at);
    expect(canonicalOf((await html(request, "/@e2e-sem-logo")).body)).toBe("http://127.0.0.1:3100/@e2e-sem-logo");
    expect(canonicalOf((await html(request, "/d/e2e-sem-logo")).body)).toBe("http://127.0.0.1:3100/@e2e-sem-logo");
  });

  test("the internal path is not a third door: it redirects to /@", async ({ request }) => {
    const { status, headers } = await html(request, "/pt/at/e2e.criadora");
    expect(status).toBe(308);
    expect(headers["location"]).toMatch(/\/@e2e\.criadora$/);
  });
});

test.describe("BR-B2B-067 item 4: spelling and the old @ redirect for good", () => {
  test("another spelling goes to the recorded one, with the visit's query", async ({ request }) => {
    const { status, headers } = await html(request, "/@E2E.Criadora?utm_campaign=kit");
    expect(status).toBe(308);
    expect(headers["location"]).toMatch(/\/@e2e\.criadora\?utm_campaign=kit$/);
  });

  test("the @ before the change goes to the current one", async ({ request }) => {
    const { status, headers } = await html(request, "/@e2e-antiga");
    expect(status).toBe(308);
    expect(headers["location"]).toMatch(/\/@e2e\.criadora$/);
  });
});

test.describe("BR-B2B-067 item 5: every name without a page is the same 404", () => {
  test("an unknown @, a regular user's and one with a dot: 404, noindex, the same page but the name typed", async ({ page, request }) => {
    const names = ["nao.existe", "e2e-usuario-comum", "e2e-conta-apagada"];
    const bodies: string[] = [];
    for (const name of names) {
      const { status, body } = await html(request, `/@${name}`);
      expect(status).toBe(404);
      expect(robotsOf(body)).toContain("noindex");
      // Next streams a not-found as payload: the page is read once drawn.
      await page.goto(`/@${name}`);
      const main = page.locator("main[data-partner-page='not-found']");
      await expect(main).toContainText(`@${name}`);
      bodies.push((await main.innerHTML()).replaceAll(name, "NAME"));
    }
    expect(new Set(bodies).size).toBe(1);
  });

  test("it captures nothing and counts nothing", async ({ page }) => {
    const posts = capturesOn(page);
    const before = (await visitsOf(CREATOR_ID)).length;
    const res = await page.goto("/@nao.existe");
    expect(res?.status()).toBe(404);
    await page.waitForLoadState("networkidle");
    expect(posts).toEqual([]);
    expect((await visitsOf(CREATOR_ID)).length).toBe(before);
  });
});

test.describe("BR-B2B-067 item 3: opening attributes like /d/{slug}, only when the page may", () => {
  test("a creator's page captures the first touch for the creator", async ({ page }) => {
    const posts = capturesOn(page);
    await page.goto("/@e2e.criadora");
    await expect.poll(() => posts.length).toBe(1);
    expect(JSON.parse(posts[0]).partner_id).toBe(CREATOR_ID);
    await expect.poll(() => fingerprintOf(CREATOR_ID)).not.toBeNull();
  });

  test("BR-B2B-067 item 6: a client whose contract ended keeps its page and captures nothing", async ({ page }) => {
    const posts = capturesOn(page);
    const res = await page.goto("/@e2e-encerrado");
    expect(res?.status()).toBe(200);
    await expect(page.locator("main[data-partner-page='client']")).toContainText("Pousada Encerrada");
    await page.waitForLoadState("networkidle");
    expect(posts).toEqual([]);
    expect(await fingerprintOf(ENDED_CLIENT_ID)).toBeNull();
  });
});

test.describe("BR-B2B-067 item 7: each opening counts, and never a robot's", () => {
  test("every render is one visit, by the door it came through, outside any cache", async ({ request }) => {
    const before = (await visitsOf(EMPTY_CREATOR_ID)).length;
    await html(request, "/@e2e-criador-vazio");
    await html(request, "/@e2e-criador-vazio");
    await html(request, "/d/e2e-criador-vazio");
    const rows = (await visitsOf(EMPTY_CREATOR_ID)).slice(before);
    expect(rows.map((r) => r.via)).toEqual(["at_name", "at_name", "d_slug"]);
  });

  test("a client's page counts too, by either door", async ({ request }) => {
    const before = (await visitsOf(CLIENT_ID)).length;
    await html(request, "/@e2e-sem-logo");
    await html(request, "/d/e2e-sem-logo");
    expect((await visitsOf(CLIENT_ID)).slice(before).map((r) => r.via)).toEqual(["at_name", "d_slug"]);
  });

  test("BR-B2B-068 item 2.e: above the ceiling an address stops counting, and the page still opens", async ({ playwright }) => {
    // An address of its own per run: the double keeps its counter while it runs.
    const address = `2001:db8:1141::${Math.floor(Math.random() * 0xffff).toString(16)}`;
    const own = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
      extraHTTPHeaders: { ...visitorHeaders({ country: "BR", address }), "user-agent": PERSON_UA },
    });
    const before = (await visitsOf(EMPTY_CREATOR_ID)).length;
    for (let i = 0; i < PAGE_VISIT_LIMIT_PER_WINDOW + 3; i += 1) {
      const res = await own.get("/@e2e-criador-vazio");
      expect(res.status()).toBe(200);
    }
    expect((await visitsOf(EMPTY_CREATOR_ID)).length - before).toBe(PAGE_VISIT_LIMIT_PER_WINDOW);

    // The ceiling is per page: the same address still counts on another one.
    const clientBefore = (await visitsOf(CLIENT_ID)).length;
    expect((await own.get("/@e2e-sem-logo")).status()).toBe(200);
    expect((await visitsOf(CLIENT_ID)).length - clientBefore).toBe(1);
    await own.dispose();
  });

  test("a declared robot reads the page and is not counted", async ({ request }) => {
    const before = (await visitsOf(EMPTY_CREATOR_ID)).length;
    const { status } = await html(request, "/@e2e-criador-vazio", GOOGLEBOT_UA);
    expect(status).toBe(200);
    await html(request, "/@e2e-criador-vazio", "facebookexternalhit/1.1");
    expect((await visitsOf(EMPTY_CREATOR_ID)).length).toBe(before);
  });
});

const HOTEL_ID = "22222222-2222-4222-8222-222222222222";

test.describe("DS-COMPONENTE-110, mockup w02: a hotel or a restaurant in the frame of the one page", () => {
  test("logo, name, seal, description, contacts, welcome audio and the store action are in the server HTML", async ({ request }) => {
    const { status, body } = await html(request, "/@e2e-com-logo");
    expect(status).toBe(200);
    const main = mainOf(body);
    expect(main).toContain('data-partner-page="client"');
    expect(main).toContain('data-testid="partner-logo"');
    expect(main).toContain('data-testid="partner-page-chip"');
    expect(main).toContain("Delícias do Vale do Café");
    expect(main).toContain('data-testid="partner-page-verified"');
    // The whole description, collapsed by CSS only: what the Google reads is the partner's whole text.
    expect(main).toContain("became the cuisine you are about to taste.");
    expect(main).toContain('data-testid="partner-contacts"');
    expect(main).toContain("https://delicias.example");
    expect(main).toContain('data-testid="partner-welcome-audio"');
    expect(main).toContain('data-testid="partner-page-cta"');
    expect(main).toContain("tuggi.app/@e2e-com-logo");
  });

  test("a block without content does not appear: no logo draws the initial, no audio and no contacts leave no card", async ({ request }) => {
    const main = mainOf((await html(request, "/@e2e-sem-logo")).body);
    expect(main).toContain('data-testid="partner-initial"');
    expect(main).not.toContain('data-testid="partner-logo"');
    expect(main).not.toContain('data-testid="partner-welcome-audio"');
    expect(main).not.toContain('data-testid="partner-contacts"');
    expect(main).toContain('data-testid="partner-page-cta"');
  });

  test("BR-B2B-002: the hotel's page captures the first touch for the hotel, from its store action", async ({ page }) => {
    const posts = capturesOn(page);
    await page.goto("/@e2e-com-logo");
    await expect.poll(() => posts.length).toBe(1);
    expect(JSON.parse(posts[0]).partner_id).toBe(HOTEL_ID);
  });

  test("the description opens with its control, and the welcome audio card has its final size before the audio loads", async ({ page }) => {
    await page.goto("/@e2e-com-logo");
    const description = page.getByTestId("partner-description");
    const collapsed = (await description.boundingBox())!.height;
    await page.getByRole("button", { name: /^(more|mais)$/i }).click();
    await expect.poll(async () => (await description.boundingBox())!.height).toBeGreaterThan(collapsed);
    await expect(page.getByTestId("partner-welcome-audio").locator("button")).toBeVisible();
  });

  test("criterion 16: at 390 px the sticky bar waits for the action to leave the screen, and there is no QR", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/@e2e-com-logo");
    await expect(page.getByTestId("app-preview-qr")).toBeHidden();
    const sticky = page.locator("div[aria-hidden]", { has: page.locator("a[href]") }).filter({
      hasText: /Grátis no iPhone e no Android|Free on iPhone and Android/,
    });
    await expect(sticky).toHaveAttribute("aria-hidden", "true");
    await page.evaluate(() => {
      const cta = document.getElementById("partner-cta")!;
      window.scrollTo(0, cta.getBoundingClientRect().bottom + window.scrollY + 10);
    });
    await expect(sticky).toHaveAttribute("aria-hidden", "false");
  });

  test("DS-COMPONENTE-110 edge case: a coupon keeps today's page, with its redeem block", async ({ page }) => {
    await page.goto("/pt/d/E2EHORAS2");
    await expect(page.getByRole("button", { name: "Copiar código" })).toBeVisible();
    await expect(page.getByTestId("partner-page-chip")).toHaveCount(0);
  });
});

test.describe("DS-COMPONENTE-110, mockup w01: what the route snapshot adds to the creator's page", () => {
  test("an itinerary in the snapshot gets its facts and description; one outside it, only its name", async ({ request }) => {
    const main = mainOf((await html(request, "/@e2e.criadora")).body);
    const cards = main.split('data-testid="creator-route-card"').slice(1);
    expect(cards).toHaveLength(3);
    // The first itinerary of the fixture is a route of the site's snapshot (mock-supabase-server.mjs).
    expect(cards[0]).toContain('data-testid="creator-route-facts"');
    expect(cards[0]).toMatch(/\d+ paradas/);
    expect(cards[0]).toContain('data-testid="creator-route-description"');
    for (const card of cards.slice(1)) {
      expect(card).not.toContain("creator-route-facts");
      expect(card).not.toContain("creator-route-description");
    }
  });

  test("the preview stop carries its number in the itinerary, read from the snapshot's order", async ({ request }) => {
    const main = mainOf((await html(request, "/@e2e.criadora")).body);
    expect(main).toMatch(/data-testid="featured-route-preview"[\s\S]*?Parada 3 · Escadaria da Rua Torta/);
  });

  test("copy §7: the page says the discovered places sentence and credits each one", async ({ request }) => {
    const main = mainOf((await html(request, "/@e2e.criadora")).body);
    expect(main).toContain("Lugares que entraram no Tuggi por este perfil, com a história contada no app.");
    expect(main).toContain("Descoberto por Ana Serra");
  });
});
