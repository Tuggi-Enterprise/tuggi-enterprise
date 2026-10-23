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
    status: "approved",
    updated_at: "2026-08-01T00:00:00Z",
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
    status: "approved",
    updated_at: "2026-08-02T00:00:00Z",
    name: null,
    company_name: "Delícias do Vale do Café",
    welcome_poi_id: "33333333-3333-4333-8333-333333333333",
    metadata: null,
    client_type: "restaurant",
    website: null,
    social_handle: null,
    avatar_url: `https://${HOST}:${PORT}/storage/v1/object/public/partners/e2e-logo.png`,
  },
  // The two names disagree on purpose: `name` is the trade name on the sign,
  // `company_name` is the legal name on the contract. `/d/{slug}` must show the
  // trade name — the real `Cozi +` row is what exposed the inverted order.
  "e2e-nome-fantasia": {
    id: "44444444-4444-4444-8444-444444444444",
    slug: "e2e-nome-fantasia",
    status: "approved",
    updated_at: "2026-08-03T00:00:00Z",
    name: "Cozi +",
    company_name: "Cozimais Restaurante e Café",
    welcome_poi_id: null,
    metadata: null,
    client_type: "restaurant",
    website: null,
    social_handle: null,
    avatar_url: null,
  },
  // Approved is a filter, not a formality: this row exists so the build-time
  // enumeration below can be caught listing a partner that has no public page
  // yet. Its /d/<slug> still resolves — `resolvePartner` matches on the slug
  // alone — so what it proves is exactly the filter, and nothing else.
  "e2e-nao-aprovado": {
    id: "55555555-5555-4555-8555-555555555555",
    slug: "e2e-nao-aprovado",
    status: "pending",
    updated_at: "2026-08-04T00:00:00Z",
    name: "Ainda em análise",
    company_name: "Ainda em análise Ltda.",
    welcome_poi_id: null,
    metadata: null,
    client_type: "restaurant",
    website: null,
    social_handle: null,
    avatar_url: null,
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
 * Every row the site upserted into `marketing.email_unsubscribes`, in order,
 * readable at `GET /__unsubscribes` and clearable at `DELETE /__unsubscribes`.
 *
 * This one exists to prove a NEGATIVE. The unsubscribe page used to record the
 * opt-out while rendering, and rendering is a GET — so a link scanner, a
 * corporate prefetch or a chat unfurl unsubscribed the reader without a click.
 * A test can only show that is fixed by opening the page and finding this list
 * still empty, which needs the list.
 */
const emailUnsubscribes = [];

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

/**
 * `drive.get_coupon_preview` envelopes, shaped as migration
 * 20260928120000 returns them (BR-MONETIZACAO-047): `grant_kind` names the
 * concession, `days` is null on a `minutes` coupon and `minutes` is null on an
 * `until` one. Owned by Tuggi (no owner client), so the hero is the plain one.
 */
const COUPON_FIXTURES = {
  E2EHORAS2: { grant_kind: "minutes", minutes: 120, days: null, owner_client_id: null },
  E2EHORA1: { grant_kind: "minutes", minutes: 60, days: null, owner_client_id: null },
  E2EDIAS7: { grant_kind: "until", minutes: null, days: 7, owner_client_id: null },
};

/** Invite codes of /c/<code> (card #840): code → inviter's nickname. */
const REFERRAL_FIXTURES = {
  "7K3MQ2": "PioneerMystic510",
};
/** Every `p_code` the invite page asked about, in order. */
const referralLookups = [];

/**
 * Routes of `/r/<slug>` (card #946), shaped as `core.get_custom_route_by_slug`
 * of #943 answers them: the row always comes when the route exists, with
 * `availability`; for a stranger the name is null in review and after
 * moderation. `slug` is the CURRENT one, so an old slug answers the new one.
 * A slug not listed answers no row; `e2e-sem-funcao` answers PGRST202, the
 * migration not applied yet.
 */
const ROUTE_ROW = {
  id: "6a1f3c2e-9b7d-4e21-8f00-1c2d3e4f5a6b",
  name: "Litoral Norte",
  translated_name: null,
  region: "Ubatuba",
  country: "Brasil",
  stops_count: 4,
  partner_name: null,
  slug: "litoral-norte",
  availability: "ok",
  is_mine: false,
};
const ROUTE_FIXTURES = {
  "litoral-norte": ROUTE_ROW,
  "litoral-antigo": ROUTE_ROW,
  "roteiro-vencido": { ...ROUTE_ROW, id: "7b2e4d3f-0c8e-4f32-9011-2d3e4f5a6b7c", slug: "roteiro-vencido", availability: "expired" },
  "roteiro-do-hotel-3f9a1c": {
    ...ROUTE_ROW,
    id: "8c3f5e40-1d9f-4043-a122-3e4f5a6b7c8d",
    name: "Roteiro do Hotel",
    slug: "roteiro-do-hotel-3f9a1c",
    stops_count: 0,
    region: null,
    country: null,
    partner_name: "Pousada Mar Azul",
  },
  "em-revisao": { ...ROUTE_ROW, name: null, slug: "em-revisao", availability: "pending_review" },
  "tirado-do-ar": { ...ROUTE_ROW, slug: "tirado-do-ar", availability: "removed_by_author" },
  "removido": { ...ROUTE_ROW, name: null, slug: "removido", availability: "removed_by_moderation" },
};
/** `get_custom_route_by_id` for the legacy `/route/<uuid>` link. */
const ROUTE_BY_ID = { [ROUTE_ROW.id]: ROUTE_ROW };

/**
 * `partner.resolve_partner_slug` (#815, BR-B2B-037): slug → the row it answers.
 * `[]` is "no row" (unknown slug). Every slug NOT listed answers 404 PGRST202,
 * which is production before migration 20261006230000: the site has to fall
 * back to today's lookup — and every older /d/ spec keeps passing through it.
 */
const RESOLVER_FIXTURES = {
  "e2e-em-breve": [{ state: "soon", client_id: null, client_slug: null }],
  "e2e-recusado": [{ state: "retired", client_id: null, client_slug: null }],
  "e2e-slug-impresso": [{ state: "client", client_id: "e2e", client_slug: "e2e-sem-logo" }],
  "e2e-desconhecido": [],
};
/** Every `partner.record_activation_scan` call that reached the database, in order. */
const activationScans = [];

/**
 * Partners approved AFTER the build (tuggi-app#987): `POST /__late-partner`
 * adds one, so its `/d/<slug>` and share card exist only at runtime, the way a
 * partner approved between two deploys does. The slug starts with `e2e-late-`
 * and is unique per test run, because the Worker preview keeps its R2 between
 * runs. Its welcome POI is the slug itself, and the welcome text names the
 * language asked for, so a spec can tell a pt-pt visit from a pt-br one.
 */
const LATE_PREFIX = "e2e-late-";

/** Database reads made for a `/d/<slug>`, per slug: `GET /__partner-lookups?slug=`. */
const partnerLookups = new Map();
function countLookup(slug, kind) {
  if (!slug) return;
  const counts = partnerLookups.get(slug) ?? { clients: 0, resolver: 0, coupon: 0, welcome: 0 };
  counts[kind] += 1;
  partnerLookups.set(slug, counts);
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

/** The same, for `column=neq.value` — the sitemap excludes the Tuggi row by id. */
function readNeqFilter(url, column) {
  const raw = url.searchParams.get(column);
  return raw?.startsWith("neq.") ? raw.slice(4) : null;
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
          // `ip_address_v4` is spelled out rather than left undefined, as the
          // nullable column in production is: the capture must leave it empty,
          // and only the `attribution-ip` Edge Function fills it (contract §4a).
          const withId = {
            id: randomUUID(),
            created_at: new Date().toISOString(),
            ip_address_v4: null,
            ...row,
          };
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

  if (url.pathname === "/rest/v1/email_unsubscribes" && req.method === "POST") {
    readBody(req).then((raw) => {
      let rows = [];
      try {
        const parsed = JSON.parse(raw);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        sendJson(res, 400, { code: "PGRST102", message: "malformed body" });
        return;
      }
      // `ignoreDuplicates: true` on the caller side, so a repeat is a no-op and
      // never overwrites the `source` of a row that is already there — the
      // first reason someone left is the true one.
      for (const row of rows) {
        if (!row?.email) continue;
        if (emailUnsubscribes.some((existing) => existing.email === row.email)) continue;
        emailUnsubscribes.push(row);
      }
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

  // Drain the request body so clients that stream a POST payload (the rpc
  // call below) don't hang waiting on us to read it.
  req.resume();

  if (url.pathname === "/__unsubscribes" && req.method === "GET") {
    sendJson(res, 200, { rows: emailUnsubscribes });
    return;
  }

  if (url.pathname === "/__unsubscribes" && req.method === "DELETE") {
    emailUnsubscribes.length = 0;
    sendJson(res, 200, { ok: true });
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
    // A `tax_id=in.(…)` HERE IS A REGRESSION, NOT A QUERY TO ANSWER — 2026-08-19.
    //
    // That was `lookupTaxId`, the proposal asking "is any of these shapes already a client?"
    // The refusal it fed was removed: it was a public oracle of the Tuggi's client list, and
    // the guarantee it was supposed to give is now `clients_tax_id_normalized_uk`, a UNIQUE
    // index that refuses the second row on every write path.
    //
    // The double refuses instead of answering, and loudly, because the defect this guards is
    // silent by nature: a lookup put back "just to mark the row" leaves a difference in TIMING
    // and nothing else would fail.
    if (readInFilter(url, "tax_id")) {
      sendJson(res, 418, {
        code: "TUGGI-ORACLE",
        message:
          "mock-supabase-server: the public proposal must not read partner.clients by tax_id — see BR-B2B-028 and clients_tax_id_normalized_uk",
      });
      return;
    }

    // The build-time enumeration: `listApprovedPartners()` in src/lib/partner.ts,
    // which `next build` calls twice — once for the sitemap and once for the
    // pre-rendered /d/<slug> share cards (#687). No `slug=eq.`, a `status`
    // filter, and an array in return; the by-slug lookup below answers a single
    // object and would be the wrong shape for it.
    // `slug=not.is.null` travels on the list query too, so the by-slug lookup is
    // told apart by its `eq.` filter, never by the mere presence of the param.
    const status = readEqFilter(url, "status");
    if (status && !readEqFilter(url, "slug")) {
      const excludedId = readNeqFilter(url, "id");
      const approved = Object.values(CLIENTS_BY_SLUG).filter(
        (c) => c.status === status && c.slug && c.id !== excludedId,
      );
      sendJson(
        res,
        200,
        approved.map((c) => ({ slug: c.slug, updated_at: c.updated_at ?? null })),
      );
      return;
    }

    const slug = readEqFilter(url, "slug");
    countLookup(slug, "clients");
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
    if (attractionId.startsWith(LATE_PREFIX)) {
      countLookup(attractionId, "welcome");
      const language = readEqFilter(url, "language");
      sendJson(res, 200, {
        audio_url: `http://${HOST}:${APP_PORT}/audio/call_en-us-male.mp3`,
        description: `Late partner welcome, ${language}.`,
      });
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
    // Only the codes in COUPON_FIXTURES are coupons; every other /d/<slug>
    // (the partner fixtures above included) answers `found:false` and falls
    // through to the partner pass, as an unknown code does in production.
    readBody(req).then((raw) => {
      let code = "";
      try {
        const sent = String(JSON.parse(raw || "{}").p_code ?? "");
        countLookup(sent, "coupon");
        code = sent.toUpperCase();
      } catch {
        // Malformed body: treated as an unknown code.
      }
      const fixture = COUPON_FIXTURES[code];
      sendJson(res, 200, fixture ? { found: true, code, ...fixture } : { found: false });
    });
    return;
  }

  if (url.pathname === "/rest/v1/rpc/get_referral_code_public" && req.method === "POST") {
    // The invite page (/c/<code>, card #840). Shape per #839: `valid` with the
    // inviter's nickname, `invalid` otherwise — never an id or a count
    // (BR-USUARIO-042). Every call is counted so the spec can prove a code
    // that can never exist is not forwarded.
    readBody(req).then((raw) => {
      let code = "";
      try {
        code = String(JSON.parse(raw || "{}").p_code ?? "");
      } catch {
        // Malformed body: an unknown code.
      }
      referralLookups.push(code);
      const nickname = REFERRAL_FIXTURES[code];
      sendJson(res, 200, nickname ? { status: "valid", nickname } : { status: "invalid", nickname: null });
    });
    return;
  }

  if (url.pathname === "/rest/v1/rpc/get_custom_route_by_slug" && req.method === "POST") {
    readBody(req).then((raw) => {
      let slug = "";
      try {
        slug = String(JSON.parse(raw || "{}").p_slug ?? "");
      } catch {
        // Malformed body: an unknown slug.
      }
      if (slug === "e2e-sem-funcao") {
        sendJson(res, 404, { code: "PGRST202", message: "Could not find the function core.get_custom_route_by_slug" });
        return;
      }
      const row = ROUTE_FIXTURES[slug];
      sendJson(res, 200, row ? [row] : []);
    });
    return;
  }

  if (url.pathname === "/rest/v1/rpc/get_custom_route_by_id" && req.method === "POST") {
    readBody(req).then((raw) => {
      let id = "";
      try {
        id = String(JSON.parse(raw || "{}").p_route_id ?? "");
      } catch {
        // Malformed body: an unknown id.
      }
      const row = ROUTE_BY_ID[id];
      sendJson(res, 200, row ? [row] : []);
    });
    return;
  }

  if (url.pathname === "/rest/v1/rpc/resolve_partner_slug" && req.method === "POST") {
    readBody(req).then((raw) => {
      let slug = "";
      try {
        slug = String(JSON.parse(raw || "{}").p_slug ?? "");
      } catch {
        // Malformed body: an unlisted slug.
      }
      countLookup(slug, "resolver");
      const rows = RESOLVER_FIXTURES[slug];
      if (rows) sendJson(res, 200, rows);
      else sendJson(res, 404, { code: "PGRST202", message: "Could not find the function partner.resolve_partner_slug" });
    });
    return;
  }

  if (url.pathname === "/rest/v1/rpc/record_activation_scan" && req.method === "POST") {
    readBody(req).then((raw) => {
      let body = {};
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        // Malformed body: recorded as-is so the spec sees it.
      }
      activationScans.push({ slug: body.p_slug, piece: body.p_piece });
      sendJson(res, 200, true);
    });
    return;
  }

  if (url.pathname === "/__late-partner" && req.method === "POST") {
    const slug = url.searchParams.get("slug") ?? "";
    if (!slug.startsWith(LATE_PREFIX)) {
      sendJson(res, 400, { message: `a late partner slug starts with ${LATE_PREFIX}` });
      return;
    }
    CLIENTS_BY_SLUG[slug] = {
      id: randomUUID(),
      slug,
      status: "approved",
      updated_at: new Date().toISOString(),
      name: "Late Partner",
      company_name: null,
      welcome_poi_id: slug,
      metadata: null,
      client_type: "restaurant",
      website: null,
      social_handle: null,
      avatar_url: null,
    };
    sendJson(res, 201, { slug });
    return;
  }

  if (url.pathname === "/__partner-lookups" && req.method === "GET") {
    const slug = url.searchParams.get("slug") ?? "";
    sendJson(res, 200, partnerLookups.get(slug) ?? { clients: 0, resolver: 0, coupon: 0, welcome: 0 });
    return;
  }

  if (url.pathname === "/__activation-scans" && req.method === "GET") {
    sendJson(res, 200, activationScans);
    return;
  }

  if (url.pathname === "/__referral-lookups" && req.method === "GET") {
    sendJson(res, 200, referralLookups);
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
