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
// The welcome audio is served by the app under test itself (public/audio), so
// the fixture needs to know where that is. A real row points at Supabase
// Storage; what matters to the page is that the URL decodes as audio.
const APP_PORT = Number(process.env.APP_PORT || 3100);
const HOST = "127.0.0.1";

/** Long enough to exercise the description's collapse control (maxDescLength = 220). */
const WELCOME_DESCRIPTION =
  "Welcome to the Delícias do Vale do Café festival, here in Conservatória. What reaches your plate started two centuries ago, on the farms coffee built. In the 19th century the coffee barons raised the manor houses that still line these roads, and the kitchens that fed them became the cuisine you are about to taste.";

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
  // The campaign fixture: a seal switches the whole layout, and the welcome POI
  // gives it the two pieces the mobile fold budget is measured against — the
  // audio player (the product, which has to sit inside the first fold) and the
  // partner's own welcome text with its collapse control.
  "e2e-com-logo": {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "e2e-com-logo",
    name: null,
    company_name: "Delícias do Vale do Café",
    welcome_poi_id: "33333333-3333-4333-8333-333333333333",
    metadata: null,
    client_type: "restaurant",
    website: null,
    social_handle: null,
    avatar_url: `https://${HOST}:${PORT}/storage/v1/object/public/partners/e2e-logo.png`,
  },
};

/**
 * Rows the app inserted into drive.click_fingerprints, keyed by partner_id and
 * readable back over `GET /__fingerprints?partner_id=...`. This is how the
 * attribution route's server-side decisions become observable from a test: what
 * matters about a fingerprint is the value that got *stored* (above all the IP,
 * which the route must take from the edge header and never from the caller's
 * body), and there is no other way to see it from the browser side.
 */
const fingerprintsByPartner = new Map();

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

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

  if (url.pathname === "/rest/v1/click_fingerprints" && req.method === "POST") {
    // PartnerHero fires this on mount (src/app/api/attribution) for every visit
    // with a partnerId. The body is kept so the attribution tests can read back
    // what was stored; see fingerprintsByPartner.
    readBody(req).then((raw) => {
      try {
        const rows = JSON.parse(raw);
        for (const row of Array.isArray(rows) ? rows : [rows]) {
          if (row?.partner_id) fingerprintsByPartner.set(row.partner_id, row);
        }
      } catch {
        // Malformed body is the app's problem, not the double's — still answer.
      }
      sendJson(res, 201, { success: true });
    });
    return;
  }

  // Drain the request body so clients that stream a POST payload (the rpc
  // call below) don't hang waiting on us to read it.
  req.resume();

  if (url.pathname === "/__fingerprints" && req.method === "GET") {
    const partnerId = url.searchParams.get("partner_id");
    sendJson(res, 200, {
      row: (partnerId && fingerprintsByPartner.get(partnerId)) || null,
    });
    return;
  }

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

  if (url.pathname === "/rest/v1/attraction_descriptions" && req.method === "GET") {
    const attractionId = readEqFilter(url, "attraction_id");
    if (!attractionId) {
      sendJson(res, 406, { code: "PGRST116", message: "no rows" });
      return;
    }
    // Answers in every language rather than only the requested one: the page's
    // own en-us fallback is not what this fixture is here to exercise.
    sendJson(res, 200, {
      audio_url: `http://${HOST}:${APP_PORT}/audio/call_en-us-male.mp3`,
      description: WELCOME_DESCRIPTION,
    });
    return;
  }

  if (url.pathname === "/rest/v1/rpc/get_coupon_preview" && req.method === "POST") {
    // No coupon fixtures in this suite — every /d/<slug> under test resolves
    // as a plain partner, never the coupon-redeem variant.
    sendJson(res, 200, { found: false });
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
