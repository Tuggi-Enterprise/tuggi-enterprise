import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  MOCK_SUPABASE_PORT,
  E2E_PUBLISHABLE_KEY,
  E2E_SERVICE_ROLE_KEY,
} from "../../playwright.config";
import { SUPABASE_KEY_ENV } from "../../src/lib/supabase-server";

/**
 * Which Supabase key each part of the site connects with — card #132.
 *
 * The site holds two keys with very different power. The **publishable** key
 * runs as the Postgres role `anon`, so RLS decides what it may do; the
 * **service_role** key carries `BYPASSRLS` and may do everything. Exactly one
 * consumer is allowed the narrow key and the other three are not, and getting
 * that mapping wrong is silent in both directions:
 *
 *  - too much power on `/api/leads` and a route anyone can reach is holding a
 *    key that could read every lead ever collected;
 *  - too little power anywhere else and `core.clients` answers zero rows with
 *    no error (ten partner landings turn into 404s and vanish from the
 *    sitemap), while `marketing.email_unsubscribes` answers 42501 and the
 *    opt-out is simply not recorded.
 *
 * Neither failure raises anything a build or a type-check would catch, which
 * is why it is pinned here. Both tests below check the *variable that was
 * read*, never a comment claiming which one it is.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/**
 * The one module allowed to build a client, relative to the repository root.
 *
 * `scripts/*.mjs` are out of scope on purpose: they are standalone Node CLIs
 * the operator runs by hand (`npm run update-routes`), they cannot import a TS
 * module, and they never serve a request. Nothing under `src/` is exempt.
 */
const SUPABASE_MODULE = "src/lib/supabase-server.ts";

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

test.describe("only one module builds a Supabase client", () => {
  test("no createClient and no Supabase key is read outside src/lib/supabase-server.ts", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const relative = path.relative(REPO_ROOT, file);
      if (relative === SUPABASE_MODULE) continue;
      const source = fs.readFileSync(file, "utf8");

      // A type-only import of SupabaseClient is fine and src/lib/partner.ts
      // has one; building a client is what may not happen twice.
      if (/\bcreateClient\s*\(/.test(source)) {
        offenders.push(`${relative}: calls createClient()`);
      }
      // Reading the key name elsewhere is the same defect one step earlier: it
      // is how four independent constructions came to share one variable, and
      // how renaming that variable broke all four at once.
      const key = source.match(/process\.env\.[A-Z_]*SUPABASE[A-Z_]*KEY/);
      if (key) {
        offenders.push(`${relative}: reads ${key[0]}`);
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  test("the module names both keys by their power, not by the product", () => {
    // The pair is the fix for the rename that started #132: a name like
    // SUPABASE_API_KEY says nothing about what the key may do in the database,
    // so swapping its value silently swapped the power of four consumers.
    expect(SUPABASE_KEY_ENV).toEqual({
      publishable: "SUPABASE_PUBLISHABLE_KEY",
      serviceRole: "SUPABASE_SERVICE_ROLE_KEY",
    });
  });
});

/**
 * The keys the double saw, per `METHOD /path` and per lead email.
 *
 * `campaign.inbound_leads` is written by two routes with two different keys,
 * so for that table the path is not a discriminator and the email is.
 */
async function observedKeys(request: APIRequestContext): Promise<{
  byRoute: Record<string, string>;
  byLeadEmail: Record<string, string>;
}> {
  const response = await request.get(`${MOCK_BASE}/__apikeys`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe("each consumer connects with the key it is entitled to", () => {
  test("/api/leads connects with the publishable key", async ({ request }) => {
    // The narrow key is the point of the card: this route writes one row and
    // reads nothing, so an RLS policy is enough — and a key that ignores RLS
    // on a route anyone can POST to is not a trade we make for one insert.
    const email = `key-boundary-${Date.now()}@example.com`;
    const response = await request.post("/api/leads", {
      data: {
        lead_type: "B2B_PARTNER",
        full_name: "Key Boundary Probe",
        email,
        // A SegmentKey, which is what the form posts; src/lib/business-types.ts
        // translates it to the column's code.
        business_type: "restaurants",
        locale: "en",
      },
    });
    expect(response.status()).toBe(201);

    const { byLeadEmail } = await observedKeys(request);
    expect(byLeadEmail[email]).toBe(E2E_PUBLISHABLE_KEY);
  });

  test("/api/attribution connects with the service-role key", async ({ request }) => {
    const partnerId = "44444444-4444-4444-8444-444444444444";
    const response = await request.post("/api/attribution", {
      // Its own address, so this test's 201 is about the KEY and not about who
      // else captured first. Every browser-driven visit to a partner page in
      // this suite fires a capture from loopback, and the route allows 30 per
      // address per hour: sharing that budget made this assertion depend on the
      // order the workers happened to run in.
      // The territory too: since BR-USUARIO-033 a capture with no resolvable
      // country is gated, and a gated request never reaches the key under test.
      headers: { "x-forwarded-for": "198.51.100.201", "x-vercel-ip-country": "BR" },
      data: { partner_id: partnerId, user_agent: "key-boundary-probe" },
    });
    expect(response.status()).toBe(201);

    const { byRoute } = await observedKeys(request);
    expect(byRoute["POST /rest/v1/click_fingerprints"]).toBe(E2E_SERVICE_ROLE_KEY);
  });

  test("/api/data-deletion invokes the Edge Function with the service-role key", async ({
    request,
  }) => {
    // `simple-deletion-request` is deployed with `verify_jwt: true`, and the
    // publishable key is not a JWT. The double answers 404 to the invoke, so
    // this also walks the fallback write — which must not be the part that
    // trips on a permission, since it is the last thing standing between a
    // deletion request and being lost.
    const email = `key-boundary-deletion-${Date.now()}@example.com`;
    const response = await request.post("/api/data-deletion", {
      data: { email, locale: "en" },
    });
    expect(response.status()).toBe(200);

    const { byRoute, byLeadEmail } = await observedKeys(request);
    expect(byRoute["POST /functions/v1/simple-deletion-request"]).toBe(
      E2E_SERVICE_ROLE_KEY
    );
    expect(byLeadEmail[email]).toBe(E2E_SERVICE_ROLE_KEY);
  });

  test("the partnership proposal writes core with the service-role key", async ({ request }) => {
    // The one route on the site where a key that BYPASSES RLS sits behind a door with no
    // credential at all, and it is not a preference: measured on the live database on
    // 2026-08-17, the five tables of this pipeline have RLS on with ZERO policies and grants
    // only to `service_role`, and `core.record_partner_form_attempt` is SECURITY INVOKER. The
    // publishable key reaches none of it — the INSERT would answer 42501 and the rate-limit RPC
    // would answer nothing, which means nobody counted, which means nobody limited.
    //
    // Swapping this for a `SECURITY DEFINER` RPC granted to `anon` was deferred by scope in
    // #396, not by merit. The day it lands, this expectation is what has to change first.
    const response = await request.post("/api/partner-proposal", {
      headers: { "x-forwarded-for": "203.0.113.90" },
      data: { answers: { trade_name: "Key Boundary Probe" } },
    });
    // Refused for missing fields, and that is enough: the attempt counter runs BEFORE the body
    // is parsed, so the RPC was already called with whichever key this route holds.
    expect(response.status()).toBe(400);

    const { byRoute } = await observedKeys(request);
    expect(byRoute["POST /rest/v1/rpc/record_partner_form_attempt"]).toBe(E2E_SERVICE_ROLE_KEY);
  });

  test("the partner landing reads core.clients with the service-role key", async ({
    page,
    request,
  }) => {
    // As `anon` this read returns zero rows and no error, so the page would
    // 404 with nothing logged. This is the read that makes the narrow key
    // impossible for getSupabaseClient("serviceRole") consumers today.
    await page.goto("/d/e2e-sem-logo");
    // The page only reaches this state with the partner row in hand: without
    // it, `/d/<slug>` is a 404.
    await expect(
      page.getByRole("button", { name: /discover more in the app/i })
    ).toBeVisible();

    const { byRoute } = await observedKeys(request);
    expect(byRoute["GET /rest/v1/clients"]).toBe(E2E_SERVICE_ROLE_KEY);
  });
});
