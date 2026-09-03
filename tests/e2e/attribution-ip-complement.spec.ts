import { test, expect, type APIRequestContext } from "@playwright/test";
import { E2E_EDGE_SHARED_SECRET, MOCK_SUPABASE_PORT } from "../../playwright.config";
import {
  ATTRIBUTION_IP_ALLOWED_ORIGINS,
  ATTRIBUTION_IP_PATH,
} from "../../src/lib/attribution";
import { IP_COMPLEMENT_LIMIT_PER_WINDOW } from "../../src/lib/attribution-limits";

/**
 * `POST /api/attribution/ip` — the IPv4 complement of a click already
 * captured (BR-B2B-002, contract §3 and §4, card #682).
 *
 * WHY THE ROUTE EXISTS, in one line: measured 2026-09-03, 100% of clicks reach
 * us over IPv6 and 219 of 219 installs reach Supabase over IPv4, so the two
 * ends of the probabilistic match sat in disjoint address families and the zero
 * matches in production measured the wrong key rather than the method. The
 * second observation is taken over `ip4.tuggi.app`, a DNS-only alias of this
 * same deployment that resolves A and nothing else.
 *
 * WHAT THIS FILE PINS, and each one is a defect somebody would otherwise ship:
 *
 *  1. **one answer, `204`, for everything that is not a refusal** — a route
 *     that distinguished "unknown click" from "already complete" would be a
 *     public oracle for enumerating the token that credits a commission;
 *  2. **write-once, decided in the database** — the predicate carries
 *     `ip_address_v4 IS NULL`, so two concurrent calls cannot both win and the
 *     observation closest to the click is the one kept;
 *  3. **the address comes from the edge and never from the body** — the same
 *     spoof that moved a partner's commission once through the capture route
 *     (contract §4) just changes column name here;
 *  4. **only IPv4 is stored**, so the same route on `www` observes IPv6 and
 *     writes nothing at all — that is the operator's decision of 2026-09-03,
 *     the less identifying of the two families;
 *  5. **the CORS list is closed and echoed one entry at a time**, because what
 *     stands behind this door is a `service_role` write;
 *  6. **there is a ceiling**, and it is the ONLY barrier: this host is outside
 *     Cloudflare by construction, so there is no WAF in front of it;
 *  7. **the consent gate runs again on this side** — BR-USUARIO-033, item 2: a
 *     gate decided on the client is a gate the client edits.
 *
 * The normalisation of what the edge reports (`::ffff:`, brackets, zone) is
 * decided in `clientAddressOf` and pinned in `client-address-trust.spec.ts`;
 * what this file adds is that the normalised value is what reaches the column.
 */

/**
 * Brazil on every request, for the same reason `download-attribution.spec.ts`
 * declares it: since BR-USUARIO-033 the capture is gated on territory, a local
 * build carries no `x-vercel-ip-country`, and "not determined" is gated. The
 * refusal has a test of its own below, which overrides this header.
 */
test.use({ extraHTTPHeaders: { "x-vercel-ip-country": "BR" } });

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/** A UUID that is not a fixture, so a test owns the rows it asserts on. */
const uniquePartnerId = () =>
  `55555555-5555-4555-8555-${Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, "0")}`;

/**
 * An address this test owns. 198.18.0.0/15 is the benchmarking range of RFC
 * 2544 — never a real visitor — and a fresh one per test means a ceiling
 * assertion measures its own count instead of a neighbour's.
 */
const uniqueAddress = () =>
  `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

/**
 * The click this browser would be carrying: one real capture through the public
 * route, because a row invented in the double would not prove that the id the
 * complement receives is the id the capture handed out.
 */
async function capturedClick(request: APIRequestContext): Promise<{
  clickId: string;
  partnerId: string;
}> {
  const partnerId = uniquePartnerId();
  const res = await request.post("/api/attribution", {
    data: { partner_id: partnerId, user_agent: "e2e-ip-complement", language: "en-GB" },
  });
  expect(res.status()).toBe(201);
  return { clickId: (await res.json()).click_id as string, partnerId };
}

/** The stored row, by the id PostgREST handed back — see mock-supabase-server.mjs. */
async function storedById(request: APIRequestContext, clickId: string) {
  const res = await request.get(`${MOCK_BASE}/__fingerprints?id=${encodeURIComponent(clickId)}`);
  expect(res.ok()).toBe(true);
  return (await res.json()).row as { id: string; ip_address_v4: string | null } | null;
}

/** One complement attempt, from an address of the test's choosing. */
function complement(
  request: APIRequestContext,
  options: { address: string; body?: unknown; headers?: Record<string, string> }
) {
  return request.post(ATTRIBUTION_IP_PATH, {
    headers: {
      "x-tuggi-edge": E2E_EDGE_SHARED_SECRET,
      "CF-Connecting-IP": options.address,
      ...options.headers,
    },
    data: options.body ?? {},
  });
}

test.describe("POST /api/attribution/ip", () => {
  test("BR-B2B-002: it completes the captured click with the visitor's IPv4 — contract §4", async ({
    request,
  }) => {
    const { clickId } = await capturedClick(request);
    expect((await storedById(request, clickId))!.ip_address_v4).toBeNull();

    const address = uniqueAddress();
    const res = await complement(request, { address, body: { click_id: clickId } });
    expect(res.status()).toBe(204);
    expect((await res.body()).length, "a body would be an oracle about the row").toBe(0);

    expect((await storedById(request, clickId))!.ip_address_v4).toBe(address);
  });

  test("BR-B2B-002: a click id nobody wrote is answered 204 and writes nothing", async ({
    request,
  }) => {
    // The refusal may not be TELLABLE. `click_id` is the token that credits a
    // commission, so a route answering 404 here — or 200 on success and 204 on
    // a miss — hands an enumerator a way to harvest live ids from outside.
    const stranger = uniquePartnerId();
    const res = await complement(request, {
      address: uniqueAddress(),
      body: { click_id: stranger },
    });
    expect(res.status()).toBe(204);
    expect(await storedById(request, stranger)).toBeNull();

    // A body that is not a click id at all gets the very same answer, and the
    // shapes matter because each one used to be a different branch somewhere:
    // no body, a non-UUID, a number, an array.
    for (const body of [{}, { click_id: "not-a-uuid" }, { click_id: 7 }, [{ click_id: stranger }]]) {
      const junk = await complement(request, { address: uniqueAddress(), body });
      expect(junk.status(), JSON.stringify(body)).toBe(204);
    }
  });

  test("BR-B2B-002: write-once — the second call does not overwrite the first observation", async ({
    request,
  }) => {
    // THE DEFECT THIS PINS is not "two writes happen": it is which of the two
    // survives. The hook fires from two call sites (`PartnerHero` and the
    // global mount), so a browser really does send this twice, and the second
    // observation is further from the click — a tourist who moved from the
    // rental desk's Wi-Fi to mobile data by then hands the match an address
    // that was never near the click. `ip_address_v4 IS NULL` in the predicate
    // is what makes the FIRST one the one kept, and the double refuses the
    // request outright when that filter is missing.
    const { clickId } = await capturedClick(request);
    const first = uniqueAddress();
    const second = uniqueAddress();

    expect((await complement(request, { address: first, body: { click_id: clickId } })).status()).toBe(204);
    expect((await complement(request, { address: second, body: { click_id: clickId } })).status()).toBe(204);

    const row = await storedById(request, clickId);
    expect(row!.ip_address_v4).toBe(first);
    expect(row!.ip_address_v4).not.toBe(second);
  });

  test("BR-B2B-002: an IPv6 visitor leaves no address at all — contract §3", async ({
    request,
  }) => {
    // This is not an edge case, it is the ordinary answer on `www`: the route
    // is host-agnostic on purpose, and what forces the family is DNS. Reached
    // over a hostname Cloudflare proxies, the visitor arrives over v6 and the
    // right outcome is silence — storing a /64 would be storing the more
    // identifying family, which the operator decided against on 2026-09-03.
    const { clickId } = await capturedClick(request);

    const res = await complement(request, {
      address: "2804:14c:632f::1",
      body: { click_id: clickId },
    });
    expect(res.status()).toBe(204);
    expect((await storedById(request, clickId))!.ip_address_v4).toBeNull();
  });

  test("BR-B2B-002: an address in the body is ignored, on this door too — contract §4", async ({
    request,
  }) => {
    // The attack, and it is worth MORE here than on the capture: there you
    // plant an address next to a partner of your choosing, here you plant a
    // chosen address into a row whose id you already hold — which is the
    // probabilistic match handed to you, for a commission that is not yours.
    const { clickId } = await capturedClick(request);
    const edge = uniqueAddress();
    const spoofed = "203.0.113.7"; // TEST-NET-3, never a real visitor

    const res = await complement(request, {
      address: edge,
      body: {
        click_id: clickId,
        client_ip: spoofed,
        ip_address: spoofed,
        ip_address_v4: spoofed,
      },
    });
    expect(res.status()).toBe(204);

    const row = await storedById(request, clickId);
    expect(row!.ip_address_v4).toBe(edge);
    expect(JSON.stringify(row), "nothing of the caller's leaked in under another name").not.toContain(
      spoofed
    );
  });

  test("BR-B2B-002: the mapped form is normalised before the write, not after — contract §3", async ({
    request,
  }) => {
    // `next start`, and any Node server in front, reports IPv4 mapped into
    // IPv6, and measured 2026-09-03 forcing v6 against `ip4.tuggi.app` answers
    // `::ffff:64.29.17.65` for real. Left raw, the family check reads that
    // string as IPv6 and the column stays empty — the route would look correct
    // and store nothing, forever. `clientAddressOf` owns the normalisation
    // (client-address-trust.spec.ts); what is pinned here is that the value
    // reaching the column is the dotted quad the app will compare against.
    const { clickId } = await capturedClick(request);
    const address = uniqueAddress();

    const res = await request.post(ATTRIBUTION_IP_PATH, {
      // No edge proof: `x-forwarded-for` is the floor Vercel guarantees, and
      // the bracket-and-zone shape is the RFC 7239 one a proxy may forward.
      headers: { "x-forwarded-for": `[::ffff:${address}%eth0] , 172.71.0.1` },
      data: { click_id: clickId },
    });
    expect(res.status()).toBe(204);

    expect((await storedById(request, clickId))!.ip_address_v4).toBe(address);
  });

  test("BR-B2B-002: a strange origin gets no CORS header, on the preflight or on the write", async ({
    request,
  }) => {
    // The request is cross-origin by construction (`www.tuggi.app` →
    // `ip4.tuggi.app`) and `Content-Type: application/json` earns it a
    // preflight, so the route needs an `OPTIONS` handler — without one the
    // browser never sends the POST and the complement fails silently in
    // production while every direct call in this file still passes.
    const { clickId } = await capturedClick(request);
    const allowed = ATTRIBUTION_IP_ALLOWED_ORIGINS[0];

    const preflight = await request.fetch(ATTRIBUTION_IP_PATH, {
      method: "OPTIONS",
      headers: { origin: allowed, "access-control-request-method": "POST" },
    });
    expect(preflight.status()).toBe(204);
    expect(preflight.headers()["access-control-allow-origin"]).toBe(allowed);
    expect(preflight.headers()["access-control-allow-methods"]).toContain("POST");
    // `Vary: Origin` even on the refusal below: the answer differs by origin,
    // and a CDN that cached the header-less version would break the legitimate
    // caller instead of the strange one.
    expect(preflight.headers()["vary"]).toContain("Origin");
    // Never with credentials — the beacon sends `credentials: 'omit'` and no
    // cookie takes part in the decision.
    expect(preflight.headers()["access-control-allow-credentials"]).toBeUndefined();

    const strange = "https://evil.example";
    const refusedPreflight = await request.fetch(ATTRIBUTION_IP_PATH, {
      method: "OPTIONS",
      headers: { origin: strange, "access-control-request-method": "POST" },
    });
    expect(refusedPreflight.headers()["access-control-allow-origin"]).toBeUndefined();
    expect(refusedPreflight.headers()["vary"]).toContain("Origin");

    // And the write itself never echoes it either — a single entry, never `*`.
    const write = await complement(request, {
      address: uniqueAddress(),
      body: { click_id: clickId },
      headers: { origin: strange },
    });
    expect(write.status()).toBe(204);
    expect(write.headers()["access-control-allow-origin"]).toBeUndefined();
    // The BROWSER is what CORS stops, so the row is written all the same: this
    // door's barrier against a script is the ceiling below, never the origin.
    expect((await storedById(request, clickId))!.ip_address_v4).not.toBeNull();
  });

  test("BR-B2B-002: the flood is refused with 429, and it is the only barrier this host has", async ({
    request,
  }) => {
    // `ip4.tuggi.app` is DNS-only by requirement — proxied, Cloudflare
    // publishes AAAA and the host loses its whole reason to exist — so there
    // is no WAF and no edge ceiling in front of a `service_role` write. This
    // counter is what is left.
    //
    // AND THE REFUSAL IS THE ONE ANSWER THAT IS NOT MUTE, on purpose: a 204
    // here would erase the only evidence that mass planting was attempted.
    test.setTimeout(120_000);
    const address = uniqueAddress();
    const { clickId } = await capturedClick(request);

    // Counted before the body is read, like the other two public doors: a
    // flood of junk is an attempt like any other.
    for (let i = 0; i < IP_COMPLEMENT_LIMIT_PER_WINDOW; i++) {
      const res = await complement(request, { address, body: { click_id: "not-a-uuid" } });
      expect(res.status(), `attempt ${i + 1}`).toBe(204);
    }

    const refused = await complement(request, { address, body: { click_id: clickId } });
    expect(refused.status()).toBe(429);
    expect(await refused.json()).toMatchObject({ error: "too_many_ip_complements" });
    expect(Number(refused.headers()["retry-after"])).toBeGreaterThan(0);
    // What ran out is the address's allowance, not this caller's correctness:
    // the id was good and the row is still empty.
    expect((await storedById(request, clickId))!.ip_address_v4).toBeNull();
  });

  test("BR-USUARIO-033: a gated territory without consent writes nothing here either", async ({
    request,
  }) => {
    // Item 2: the territory is resolved on the same side the decision is taken.
    // The hook already answers null without consent, and that is not enough —
    // this is a public door and nothing stops a script from posting anyway.
    // Item 6: a refusal is not to be rebuilt through another door, and this
    // route would be exactly that door, on a row consented in Brazil belonging
    // to a browser now in France.
    const { clickId } = await capturedClick(request);

    const res = await complement(request, {
      address: uniqueAddress(),
      body: { click_id: clickId },
      headers: { "x-vercel-ip-country": "FR" },
    });
    expect(res.status()).toBe(204);
    expect((await storedById(request, clickId))!.ip_address_v4).toBeNull();
  });
});
