import { test, expect, type APIRequestContext } from "@playwright/test";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import { CONSENT_KEY } from "../../src/lib/consent";
import { PAGE_REPORT_LIMIT_PER_WINDOW } from "../../src/lib/public-page";
import { visitorHeaders } from "./visitor-headers";

/**
 * "Denunciar este perfil" on `tuggi.app/@nome` (#1141, epic #1127).
 *
 * BR-USUARIO-051 item 5: the page has a report, without an account, that goes
 * to the CMS queue (`partner.report_public_page_as`) and changes nothing by
 * itself. BR-B2B-067 item 5: the answer never tells a name with a page from
 * one without, so the browser gets one "received" for all of them, and the
 * report id and count stay on the server.
 *
 * Fixtures: PUBLIC_PAGE_FIXTURES and the report double in
 * mock-supabase-server.mjs. Serial, because the calls are read as a
 * difference on shared fixtures.
 */

test.describe.configure({ mode: "serial" });

const MOCK = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;
const PERSON_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// An address of its own per run: the double keeps the ceiling's counter while it runs.
const SPEC_ADDRESS = `2001:db8:1141:2::${Math.floor(Math.random() * 0xffff).toString(16)}`;
test.use({
  userAgent: PERSON_UA,
  extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
});

// The cookie banner sits over the footer until it is answered: answered "no", as a visitor would.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => window.localStorage.setItem(key, "false"), CONSENT_KEY);
});

type ReportCall = { name: string; field: string };

async function reportsOf(name?: string): Promise<ReportCall[]> {
  const res = await fetch(`${MOCK}/__page-reports${name ? `?name=${encodeURIComponent(name)}` : ""}`);
  return ((await res.json()) as { rows: ReportCall[] }).rows;
}

async function report(request: APIRequestContext, name: string, field: string) {
  const res = await request.post(`/@${name}/report`, { data: { field } });
  return { status: res.status(), body: await res.text() };
}

const mainOf = (body: string) => /<main[^>]*data-partner-page[\s\S]*?<\/main>/.exec(body)?.[0] ?? "";

test.describe("BR-USUARIO-051 item 5: the report is on the creator's page only", () => {
  test("a creator's footer has the link, by either door, and a hotel's or a restaurant's does not", async ({ request }) => {
    for (const path of ["/@e2e.criadora", "/d/e2e.criadora"]) {
      const main = mainOf(await (await request.get(path)).text());
      expect(main, path).toContain('data-testid="page-report-open"');
      expect(main, path).toContain("Denunciar este perfil");
    }
    for (const path of ["/@e2e-sem-logo", "/d/e2e-sem-logo"]) {
      const main = mainOf(await (await request.get(path)).text());
      expect(main, path).toContain('data-testid="partner-page-footer-links"');
      expect(main, path).not.toContain('data-testid="page-report-open"');
    }
  });

  test("the bio is offered only when the page has one", async ({ request }) => {
    const withBio = mainOf(await (await request.get("/@e2e.criadora")).text());
    expect(withBio).toContain('value="display_name"');
    expect(withBio).toContain('value="nickname"');
    expect(withBio).toContain('value="bio"');

    const withoutBio = mainOf(await (await request.get("/@e2e-criador-vazio")).text());
    expect(withoutBio).toContain('value="display_name"');
    expect(withoutBio).toContain('value="nickname"');
    expect(withoutBio).not.toContain('value="bio"');
  });
});

test.describe("BR-USUARIO-051 item 5: sending reports the page by its name", () => {
  test("the dialog sends the name of the page and the field, and the browser reads only 'received'", async ({ page }) => {
    const before = (await reportsOf("e2e.criadora")).length;
    await page.goto("/@e2e.criadora");
    await page.getByTestId("page-report-open").click();
    const dialog = page.getByTestId("page-report-dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("radio", { name: "A bio" }).check();

    // What reached the browser, read on the wire: the route passes the server's answer through untouched.
    const wire: { status: number; body: string }[] = [];
    await page.route("**/@e2e.criadora/report", async (route) => {
      const response = await route.fetch();
      wire.push({ status: response.status(), body: await response.text() });
      await route.fulfill({ response });
    });
    await dialog.getByRole("button", { name: "Enviar" }).click();
    await expect(dialog.getByTestId("page-report-received")).toHaveText("Recebido. A equipe do Tuggi vai olhar.");
    expect(wire).toHaveLength(1);
    expect(wire[0].status).toBe(200);
    expect(JSON.parse(wire[0].body)).toEqual({ status: "received" });
    expect(wire[0].body).not.toMatch(/report_id|reports_count|9\d{3}/);

    const calls = (await reportsOf("e2e.criadora")).slice(before);
    expect(calls).toEqual([{ name: "e2e.criadora", field: "bio" }]);
  });

  test("the creator's page through /d/ reports the recorded name, not the door", async ({ page }) => {
    const before = (await reportsOf("e2e.criadora")).length;
    await page.goto("/d/e2e.criadora");
    await page.getByTestId("page-report-open").click();
    const dialog = page.getByTestId("page-report-dialog");
    await dialog.getByRole("radio", { name: "O @" }).check();
    await dialog.getByRole("button", { name: "Enviar" }).click();
    await expect(dialog.getByTestId("page-report-received")).toBeVisible();
    expect((await reportsOf("e2e.criadora")).slice(before)).toEqual([{ name: "e2e.criadora", field: "nickname" }]);
  });
});

test.describe("BR-B2B-067 item 5: the answer is the same for every name", () => {
  test("a report taken, a name without a page, a client's page, another spelling and an empty bio answer alike", async ({ request }) => {
    const taken = await report(request, "e2e.criadora", "display_name");
    expect(taken.status).toBe(200);
    expect(JSON.parse(taken.body)).toEqual({ status: "received" });

    for (const [name, field] of [
      ["e2e-ninguem-com-este-nome", "display_name"],
      ["e2e-sem-logo", "display_name"],
      ["E2E.Criadora", "display_name"],
      ["e2e-criador-vazio", "bio"],
    ] as const) {
      const other = await report(request, name, field);
      expect(other, name).toEqual(taken);
    }
    // The database decided each of them: the site does not guess which name has a page.
    expect(await reportsOf("e2e-ninguem-com-este-nome")).toContainEqual({ name: "e2e-ninguem-com-este-nome", field: "display_name" });
    expect(await reportsOf("e2e-criador-vazio")).toContainEqual({ name: "e2e-criador-vazio", field: "bio" });
  });

  test("above the ceiling of an address the answer is the same and the database is not called", async ({ playwright }) => {
    const address = `2001:db8:1141:3::${Math.floor(Math.random() * 0xffff).toString(16)}`;
    const own = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
      extraHTTPHeaders: { ...visitorHeaders({ country: "BR", address }), "user-agent": PERSON_UA },
    });
    const before = (await reportsOf("e2e-criador-vazio")).length;
    const answers = new Set<string>();
    for (let i = 0; i < PAGE_REPORT_LIMIT_PER_WINDOW + 3; i += 1) {
      const res = await report(own, "e2e-criador-vazio", "display_name");
      answers.add(`${res.status} ${res.body}`);
    }
    expect([...answers]).toEqual(['200 {"status":"received"}']);
    expect((await reportsOf("e2e-criador-vazio")).length - before).toBe(PAGE_REPORT_LIMIT_PER_WINDOW);
    await own.dispose();
  });
});

test.describe("BR-USUARIO-051 item 5: a report that could not be recorded says so", () => {
  test("the database failing answers 503, and the dialog offers to try again with the choice kept", async ({ page, request }) => {
    const failed = await report(request, "e2e-criador-instavel", "display_name");
    expect(failed.status).toBe(503);
    expect(JSON.parse(failed.body)).toEqual({ status: "failed" });

    await page.goto("/@e2e-criador-instavel");
    await page.getByTestId("page-report-open").click();
    const dialog = page.getByTestId("page-report-dialog");
    const option = dialog.getByRole("radio", { name: "O nome" });
    await option.check();
    await dialog.getByRole("button", { name: "Enviar" }).click();
    await expect(dialog.getByTestId("page-report-failed")).toHaveText("Não conseguimos enviar. Tente de novo.");
    await expect(option).toBeChecked();
    await expect(dialog.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });

  test("a body that is not a report is refused before any call", async ({ request }) => {
    const before = (await reportsOf()).length;
    const asForm = await request.post("/@e2e.criadora/report", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: "field=bio",
    });
    expect(asForm.status()).toBe(415);
    expect((await report(request, "e2e.criadora", "email")).status).toBe(400);
    expect((await reportsOf()).length).toBe(before);
  });
});
