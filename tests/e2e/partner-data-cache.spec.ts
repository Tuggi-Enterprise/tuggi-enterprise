import { test, expect, type APIRequestContext } from "@playwright/test";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import { visitorHeaders } from "./visitor-headers";

/**
 * tuggi-app#987: what `/d/<slug>` keeps, and what it never keeps.
 *
 * The operator's rule: what is dynamic is made on the first request and kept
 * for the next ones; what is per visitor stays per request. For the partner
 * landing that means the read of the partner (`lookupPartnerSlug`) and its
 * share card are kept for up to 5 minutes, while the page itself is rendered
 * per visit: the welcome language follows each visitor's country and every
 * kit scan is counted.
 *
 * Every slug here is approved AFTER the build (`POST /__late-partner` on the
 * Supabase double), which is the case the cache exists for: nothing about it
 * was written at deploy. Slugs are unique per run because the Worker preview
 * keeps its R2 between runs.
 *
 * The cache write happens after the response, so "the next visit does not
 * read the database" is asserted with `expect.poll`: it settles as soon as the
 * entry is in, and a cache that never keeps anything never settles.
 */

const MOCK = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

type Lookups = { clients: number; resolver: number; coupon: number; welcome: number };

function lateSlug(label: string): string {
  return `e2e-late-${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function approveAfterBuild(slug: string): Promise<void> {
  const res = await fetch(`${MOCK}/__late-partner?slug=${encodeURIComponent(slug)}`, { method: "POST" });
  expect(res.status, "the Supabase double did not take the late partner").toBe(201);
}

async function lookupsOf(slug: string): Promise<Lookups> {
  const res = await fetch(`${MOCK}/__partner-lookups?slug=${encodeURIComponent(slug)}`);
  return (await res.json()) as Lookups;
}

async function scansOf(slug: string): Promise<number> {
  const res = await fetch(`${MOCK}/__activation-scans`);
  const all = (await res.json()) as { slug: string }[];
  return all.filter((scan) => scan.slug === slug).length;
}

const welcomeIn = (language: string) => `Late partner welcome, ${language}.`;

async function visit(request: APIRequestContext, slug: string, country: string) {
  const res = await request.get(`/d/${slug}?k=d`, { headers: visitorHeaders({ country }) });
  expect(res.status()).toBe(200);
  return res.text();
}

/** How many database reads one more visit costs. */
async function readsOfOneMoreVisit(request: APIRequestContext, slug: string, country: string) {
  const before = await lookupsOf(slug);
  await visit(request, slug, country);
  const after = await lookupsOf(slug);
  return after.clients - before.clients + (after.resolver - before.resolver) + (after.coupon - before.coupon) + (after.welcome - before.welcome);
}

test("#987: a partner approved after the deploy is read from the database once, then served from the cache", async ({ request }) => {
  const slug = lateSlug("page");
  await approveAfterBuild(slug);

  const first = await visit(request, slug, "PT");
  expect(first).toContain(welcomeIn("pt-pt"));
  expect((await lookupsOf(slug)).clients, "the first visit must read the partner").toBeGreaterThan(0);

  await expect
    .poll(() => readsOfOneMoreVisit(request, slug, "PT"), {
      message: "a later visit in the same language must not read the partner again",
    })
    .toBe(0);
});

test("#987: the page stays per visit: each visitor gets their own country's welcome, and every scan counts", async ({ request }) => {
  const slug = lateSlug("visit");
  await approveAfterBuild(slug);

  let visits = 0;
  const portugal = await visit(request, slug, "PT");
  visits += 1;
  expect(portugal).toContain(welcomeIn("pt-pt"));

  // Settle the cache for Portugal before Brazil arrives: a page that kept the
  // first visitor's render would now hand Brazil the pt-pt text.
  await expect.poll(async () => {
    const reads = await readsOfOneMoreVisit(request, slug, "PT");
    visits += 1;
    return reads;
  }).toBe(0);

  const brazil = await visit(request, slug, "BR");
  visits += 1;
  expect(brazil).toContain(welcomeIn("pt-br"));
  expect(brazil).not.toContain(welcomeIn("pt-pt"));

  const portugalAgain = await visit(request, slug, "PT");
  visits += 1;
  expect(portugalAgain).toContain(welcomeIn("pt-pt"));
  expect(portugalAgain).not.toContain(welcomeIn("pt-br"));

  await expect.poll(() => scansOf(slug), { message: "every visit with ?k= is one scan" }).toBe(visits);
});

test("#987: an unknown slug is never kept, so the partner approved later shows up on the very next visit", async ({ request }) => {
  const slug = lateSlug("unknown");

  await visit(request, slug, "BR");
  const afterFirst = await lookupsOf(slug);
  expect(afterFirst.clients).toBeGreaterThan(0);
  await visit(request, slug, "BR");
  expect((await lookupsOf(slug)).clients, "an unknown slug is read again, not cached").toBeGreaterThan(afterFirst.clients);

  await approveAfterBuild(slug);
  expect(await visit(request, slug, "BR")).toContain(welcomeIn("pt-br"));
});

test("#987: the share card of a partner approved after the deploy is drawn once and kept", async ({ request }) => {
  const slug = lateSlug("card");
  await approveAfterBuild(slug);
  const card = `/en/d/${slug}/opengraph-image`;

  const first = await request.get(card);
  expect(first.status()).toBe(200);
  expect(first.headers()["content-type"]).toContain("image/png");
  expect((await lookupsOf(slug)).clients, "the first card must read the partner").toBeGreaterThan(0);

  await expect
    .poll(
      async () => {
        const before = (await lookupsOf(slug)).clients;
        const again = await request.get(card);
        expect(again.status()).toBe(200);
        return { reads: (await lookupsOf(slug)).clients - before, cache: again.headers()["x-nextjs-cache"] };
      },
      { message: "a later fetch must be served from the stored card" }
    )
    .toEqual({ reads: 0, cache: "HIT" });
});
