import { test, expect } from "@playwright/test";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";

/**
 * /d/{slug} through the one resolver, `partner.resolve_partner_slug` (#815).
 * BR-B2B-037 item 2 (one resolution), item 4 (a printed slug never stops resolving);
 * BR-B2B-050 items 1 and 4 (the kit is printed at submit; its QR resolves by /d/{slug}).
 * Fixtures: RESOLVER_FIXTURES in mock-supabase-server.mjs. Slugs not listed there answer
 * "function missing", and the older /d/ specs prove the fallback to today's lookup.
 */

const MOCK = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

async function scansOf(slug: string): Promise<{ slug: string; piece: string }[]> {
  const res = await fetch(`${MOCK}/__activation-scans`);
  const all = (await res.json()) as { slug: string; piece: string }[];
  return all.filter((s) => s.slug === slug);
}

const robotsOf = (page: import("@playwright/test").Page) =>
  page.locator('meta[name="robots"]').getAttribute("content");

test("BR-B2B-050: a reserved, not yet approved slug lands on 'soon', noindex, with no partner", async ({ page }) => {
  await page.goto("/d/e2e-em-breve");
  await expect(page.getByTestId("partner-slug-soon")).toBeVisible();
  expect(await robotsOf(page)).toContain("noindex");
});

test("#815: a rejected place's slug is a neutral page — no notice, noindex", async ({ page }) => {
  await page.goto("/d/e2e-recusado");
  await expect(page.getByTestId("partner-slug-soon")).toHaveCount(0);
  expect(await robotsOf(page)).toContain("noindex");
});

test("BR-B2B-037: an unknown slug (resolver answers no row) keeps the plain download page, noindex", async ({ page }) => {
  const res = await page.goto("/d/e2e-desconhecido");
  expect(res?.status()).toBe(200);
  expect(await robotsOf(page)).toContain("noindex");
});

test("BR-B2B-037 item 4: a printed slug that is not the client's own redirects permanently, and its scan counts", async ({ request }) => {
  const res = await request.get("/d/e2e-slug-impresso?k=d", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toMatch(/\/d\/e2e-sem-logo$/);
  await expect.poll(() => scansOf("e2e-slug-impresso")).toContainEqual({ slug: "e2e-slug-impresso", piece: "d" });
});

test("#815: a piece outside a|d|p|s|q is never sent to the counter", async ({ page }) => {
  await page.goto("/d/e2e-em-breve?k=zz");
  await page.goto("/d/e2e-em-breve?k=s");
  await expect.poll(() => scansOf("e2e-em-breve")).toContainEqual({ slug: "e2e-em-breve", piece: "s" });
  expect((await scansOf("e2e-em-breve")).map((s) => s.piece)).not.toContain("zz");
});
