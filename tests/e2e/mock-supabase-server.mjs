// Standalone PostgREST double for the /d/<slug> partner flow and for the two
// tables the site writes to: drive.click_fingerprints (attribution) and
// campaign.inbound_leads (the lead forms of /contact and /partners).
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
import { randomUUID } from "node:crypto";

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

/**
 * Rows the app inserted into campaign.inbound_leads, readable back over
 * `GET /__leads`. The partnership form of #294 is only verifiable from what
 * *arrived*: whether the WhatsApp-only path stores a row at all, and whether
 * the phone was normalized to E.164 before the POST rather than after it.
 */
const inboundLeads = [];

/**
 * The three CHECK constraints of the real table, as migration `20260812150000`
 * (card #302) leaves them — it widened the business-type domain that migration
 * `20260812130000` (card #295) had created.
 *
 * The domain below is transcribed from `pg_get_constraintdef` on purpose and is
 * **not** derived from `src/lib/business-types.ts`: deriving it would make the
 * double agree with whatever the app produces, which is the one thing it exists
 * to disagree with.
 *
 * The double enforces them **on purpose**: production refuses a malformed row
 * with SQLSTATE 23514, PostgREST turns that into a 400, and `/api/leads` turns
 * *that* into a 500 — a lead lost. A mock that accepts everything would let the
 * one defect this form exists to avoid pass the suite green.
 */
function checkViolation(row) {
  const filled = (value) => typeof value === "string" && value.trim() !== "";
  if (row.phone_e164 != null && !/^\+[1-9]\d{1,14}$/.test(row.phone_e164)) {
    return "inbound_leads_phone_e164_formato";
  }
  const domain = [
    "restaurant_bar",
    "hotel_inn",
    "tours_activities",
    "transfer",
    "car_rental",
    "motorhome",
    "other",
  ];
  if (row.business_type != null && !domain.includes(row.business_type)) {
    return "inbound_leads_business_type_dominio";
  }
  if (!filled(row.email) && !filled(row.phone_e164)) {
    return "inbound_leads_contato_minimo";
  }
  return null;
}

/**
 * Which API key the app presented, per `METHOD /path`, last call wins.
 *
 * The double does not *check* the key — it records it. The two keys are given
 * different values by playwright.config.ts, so the value observed here names
 * the environment variable the code path read, which is the only way to prove
 * from outside that `/api/leads` connects with the publishable key while the
 * other three still connect with service_role. Asserting that against a source
 * comment would prove nothing.
 */
const apiKeyByRoute = new Map();

/**
 * Rows the app inserted into core.partner_form_submissions, readable back over
 * `GET /__proposals`. What matters about a proposal is the row that got
 * *stored*, and above all which COLUMNS it carries and what is inside
 * `answers.tax_id` — the value the deduplication key is computed FROM. The only
 * way to see either from outside is to read the payload back.
 */
const proposals = [];

/**
 * The double refuses any column outside this list — 42703, "unknown column".
 * Production refuses `tax_id_normalized` too, with a different code (428C9,
 * "cannot insert into a generated column"): the column is `GENERATED ALWAYS ...
 * STORED`, measured on the live database on 2026-08-17. Same verdict, different
 * SQLSTATE, and the fixture is not trying to reproduce the code — it is here so
 * that a route which starts naming the deduplication key fails a test instead of
 * finding out in production.
 */
const SUBMISSION_ALLOWED_COLUMNS = new Set(["answers", "status", "submitted_at", "updated_at"]);

/**
 * `core.record_partner_form_attempt`, as a counter of timestamps per client
 * hash. It is the barrier the public route stands behind, so the double
 * implements the count instead of always answering `allowed: true`: a mock that
 * never says no would leave the one refusal this route exists for untested.
 */
const attemptsByHash = new Map();

function recordAttempt(clientHash, windowSeconds, maxAttempts) {
  const now = Date.now();
  const floor = now - windowSeconds * 1000;
  const kept = (attemptsByHash.get(clientHash) ?? []).filter((at) => at > floor);

  if (kept.length >= maxAttempts) {
    attemptsByHash.set(clientHash, kept);
    const oldest = Math.min(...kept);
    return {
      allowed: false,
      retry_after_seconds: Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - now) / 1000)),
    };
  }

  kept.push(now);
  attemptsByHash.set(clientHash, kept);
  return { allowed: true, retry_after_seconds: 0 };
}

/**
 * CNPJs that `core.clients` already holds, in the two shapes a stored value can
 * have — normalized by the form, and masked by whoever typed the row by hand.
 * `cnpjLookupValues` asks for both, and the fixture answers on either, because
 * matching one shape only is how the same company gets registered twice.
 */
const REGISTERED_TAX_IDS = new Set(["90021382000122", "90.021.382/0001-22"]);

/** `tax_id=in.("a","b")` → ["a", "b"]. */
function readInFilter(url, column) {
  const raw = url.searchParams.get(column);
  if (!raw?.startsWith("in.")) return null;
  return raw
    .slice(3)
    .replace(/^\(|\)$/g, "")
    .split(",")
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

/**
 * The same, keyed by the lead's email — because `campaign.inbound_leads` is
 * written by two different routes (`/api/leads` and the fallback of
 * `/api/data-deletion`) with two different keys, and the path alone cannot
 * tell them apart.
 */
const apiKeyByLeadEmail = new Map();

/** supabase-js sends the key twice: as `apikey` and as a bearer token. */
function readApiKey(req) {
  const header = req.headers["apikey"];
  if (typeof header === "string" && header) return header;
  const auth = req.headers["authorization"];
  return typeof auth === "string" ? auth.replace(/^Bearer\s+/i, "") : null;
}

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

  // Recorded for every request, including the ones that fall through to 404
  // (`functions/v1/simple-deletion-request` is one of them, on purpose — see
  // the data-deletion case in supabase-key-boundary.spec.ts).
  if (!url.pathname.startsWith("/__")) {
    const key = readApiKey(req);
    if (key) apiKeyByRoute.set(`${req.method} ${url.pathname}`, key);
  }

  if (url.pathname === "/rest/v1/click_fingerprints" && req.method === "POST") {
    // PartnerHero fires this once per first touch (src/app/api/attribution).
    // The body is kept so the attribution tests can read back what was stored;
    // see fingerprintsByPartner.
    //
    // IT ANSWERS WITH THE STORED ROW, and that is not cosmetic: the route asks
    // for `.select("id").single()` because the id IS the deliverable — the
    // click_id that travels through the store. A double that answered
    // `{ success: true }` would make the route look broken in exactly the way
    // the old design was, so it mirrors PostgREST: a single object when the
    // caller accepts `vnd.pgrst.object`, an array otherwise.
    readBody(req).then((raw) => {
      const stored = [];
      try {
        const rows = JSON.parse(raw);
        for (const row of Array.isArray(rows) ? rows : [rows]) {
          const withId = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
          if (row?.partner_id) fingerprintsByPartner.set(row.partner_id, withId);
          stored.push(withId);
        }
      } catch {
        // Malformed body is the app's problem, not the double's — still answer.
      }
      const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
      sendJson(res, 201, single ? (stored[0] ?? null) : stored);
    });
    return;
  }

  if (url.pathname === "/rest/v1/inbound_leads" && req.method === "POST") {
    readBody(req).then((raw) => {
      let rows = [];
      try {
        const parsed = JSON.parse(raw);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        sendJson(res, 400, { code: "PGRST102", message: "malformed body" });
        return;
      }
      for (const row of rows) {
        const violated = checkViolation(row);
        if (violated) {
          // The shape PostgREST returns for a CHECK violation.
          sendJson(res, 400, {
            code: "23514",
            message: `new row for relation "inbound_leads" violates check constraint "${violated}"`,
          });
          return;
        }
      }
      const key = readApiKey(req);
      for (const row of rows) {
        if (key && row?.email) apiKeyByLeadEmail.set(row.email, key);
      }
      inboundLeads.push(...rows);
      sendJson(res, 201, { success: true });
    });
    return;
  }

  if (url.pathname === "/rest/v1/rpc/record_partner_form_attempt" && req.method === "POST") {
    readBody(req).then((raw) => {
      let args;
      try {
        args = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { code: "PGRST102", message: "malformed body" });
        return;
      }
      sendJson(
        res,
        200,
        recordAttempt(args.p_client_hash, args.p_window_seconds, args.p_max_attempts)
      );
    });
    return;
  }

  if (url.pathname === "/rest/v1/partner_form_submissions" && req.method === "POST") {
    readBody(req).then((raw) => {
      let rows = [];
      try {
        const parsed = JSON.parse(raw);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        sendJson(res, 400, { code: "PGRST102", message: "malformed body" });
        return;
      }
      for (const row of rows) {
        const unknown = Object.keys(row).find((key) => !SUBMISSION_ALLOWED_COLUMNS.has(key));
        if (unknown) {
          sendJson(res, 400, {
            code: "42703",
            message: `mock-supabase-server refuses column "${unknown}" on partner_form_submissions`,
          });
          return;
        }
      }
      proposals.push(...rows);
      // `.select("id").single()` asks for the object, not an array.
      sendJson(res, 201, { id: `44444444-4444-4444-8444-${String(proposals.length).padStart(12, "0")}` });
    });
    return;
  }

  // Drain the request body so clients that stream a POST payload (the rpc
  // call below) don't hang waiting on us to read it.
  req.resume();

  if (url.pathname === "/__proposals" && req.method === "GET") {
    // `trade_name` and not `tax_id`: Playwright reuses a running webServer between local runs,
    // so these rows survive the suite. A probe that is unique per run is the only filter that
    // does not make the second run of the day fail on the first run's data — and a CNPJ cannot
    // be unique per run, because it has to be a valid one.
    const tradeName = url.searchParams.get("trade_name");
    sendJson(res, 200, {
      rows: tradeName
        ? proposals.filter((row) => row?.answers?.trade_name === tradeName)
        : proposals,
    });
    return;
  }

  if (url.pathname === "/__leads" && req.method === "GET") {
    const fullName = url.searchParams.get("full_name");
    sendJson(res, 200, {
      rows: fullName ? inboundLeads.filter((row) => row.full_name === fullName) : inboundLeads,
    });
    return;
  }

  if (url.pathname === "/__fingerprints" && req.method === "GET") {
    const partnerId = url.searchParams.get("partner_id");
    sendJson(res, 200, {
      row: (partnerId && fingerprintsByPartner.get(partnerId)) || null,
    });
    return;
  }

  // The attempt counter is process-wide and outlives a test run when the mock
  // is reused (playwright.config.ts, reuseExistingServer). A spec that asserts
  // the refusal has to start from a known count, so it can clear its own key.
  if (url.pathname === "/__attempts" && req.method === "DELETE") {
    attemptsByHash.clear();
    sendJson(res, 200, { cleared: true });
    return;
  }

  if (url.pathname === "/__apikeys" && req.method === "GET") {
    sendJson(res, 200, {
      byRoute: Object.fromEntries(apiKeyByRoute),
      byLeadEmail: Object.fromEntries(apiKeyByLeadEmail),
    });
    return;
  }

  if (url.pathname === "/__health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }

  if (url.pathname === "/rest/v1/clients" && req.method === "GET") {
    // The proposal's `lookupTaxId` asks a different question of the same table:
    // "is any of these shapes already a client?", with `.in()` and `.limit(1)`,
    // so the answer is an ARRAY and never the `.single()` 406 below.
    const taxIds = readInFilter(url, "tax_id");
    if (taxIds) {
      const hit = taxIds.some((value) => REGISTERED_TAX_IDS.has(value));
      sendJson(res, 200, hit ? [{ id: "55555555-5555-4555-8555-555555555555" }] : []);
      return;
    }

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
