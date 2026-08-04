// Standalone PostgREST double for the /d/<slug> partner flow.
//
// Why a mock server instead of hitting the real project: the festival's
// core.clients.avatar_url is NULL in production today (the CMS backend used to
// drop the field on write; already fixed elsewhere, but the row was never
// rewritten). Testing the "with logo" branch of PartnerHero therefore has no
// real fixture to point at, and the task explicitly rules out writing to the
// DB to manufacture one. This server answers the exact two REST calls
// src/lib/partner.ts makes for a /d/<slug> request that resolves to a plain
// partner (no coupon, no welcome POI), so the two PartnerHero variants
// (with/without a partner logo) are both reachable from a local build with no
// production dependency and no writes.
//
// Started by Playwright's `webServer` (see playwright.config.ts) before
// `next start` boots, and torn down with it. Run it by hand for debugging:
//   MOCK_SUPABASE_PORT=4010 node tests/e2e/mock-supabase-server.mjs
import http from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 4010);
const HOST = "127.0.0.1";

// The avatar_url below is deliberately "https://" even though this server only
// speaks plain HTTP: src/lib/storage.ts#isPublicStorageUrl only string-matches
// protocol + host + path, it never dials the URL. Next's own image optimizer
// *does* dial it server-side to fetch pixels, and that dial is refused before
// it even gets to the protocol mismatch — Next's SSRF guard rejects any
// upstream that resolves to a private IP ("upstream image ... resolved to
// private ip [\"127.0.0.1\"]"), which 127.0.0.1 always is. That block is
// specific to this local fixture (the real Supabase project is a public
// host, so production never hits it) — the "with logo" screenshot baseline
// therefore shows a broken-image glyph in place of the seal. Known, disclosed
// gap in the fixture, not a product bug: the layout assertions in
// partner-hero.spec.ts (divider present, width constrained, no overflow)
// check the box model, not the decoded pixels.
const CLIENTS_BY_SLUG = {
  "e2e-sem-logo": {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "e2e-sem-logo",
    name: null,
    company_name: "Delícias do Vale do Café",
    welcome_poi_id: null,
    metadata: null,
    client_type: "restaurant",
    website: null,
    social_handle: null,
    avatar_url: null,
  },
  "e2e-com-logo": {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "e2e-com-logo",
    name: null,
    company_name: "Delícias do Vale do Café",
    welcome_poi_id: null,
    metadata: null,
    client_type: "restaurant",
    website: null,
    social_handle: null,
    avatar_url: `https://${HOST}:${PORT}/storage/v1/object/public/partners/e2e-logo.png`,
  },
};

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(json);
}

/** Value comes from PostgREST's `column=eq.value` filter syntax. */
function readEqFilter(url, column) {
  const raw = url.searchParams.get(column);
  return raw?.startsWith("eq.") ? raw.slice(3) : null;
}

const server = http.createServer((req, res) => {
  // Drain the request body so clients that stream a POST payload (the rpc
  // call below) don't hang waiting on us to read it.
  req.resume();

  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

  if (url.pathname === "/__health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }

  if (url.pathname === "/rest/v1/clients" && req.method === "GET") {
    const slug = readEqFilter(url, "slug");
    const client = slug ? CLIENTS_BY_SLUG[slug] : null;
    if (!client) {
      // Shape PostgREST returns for `.single()` with zero matching rows —
      // supabase-js surfaces this as `{ data: null, error }`.
      sendJson(res, 406, {
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
      });
      return;
    }
    sendJson(res, 200, client);
    return;
  }

  if (url.pathname === "/rest/v1/rpc/get_coupon_preview" && req.method === "POST") {
    // No coupon fixtures in this suite — every /d/<slug> under test resolves
    // as a plain partner, never the coupon-redeem variant.
    sendJson(res, 200, { found: false });
    return;
  }

  if (url.pathname === "/rest/v1/click_fingerprints" && req.method === "POST") {
    // PartnerHero fires this on mount (src/app/api/attribution) for every
    // visit with a partnerId — unrelated to the lockup under test here, but
    // answering it avoids drowning the webServer log in attribution errors
    // on every test run.
    sendJson(res, 201, { success: true });
    return;
  }

  sendJson(res, 404, {
    message: `mock-supabase-server: unhandled ${req.method} ${url.pathname}`,
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[mock-supabase] listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
