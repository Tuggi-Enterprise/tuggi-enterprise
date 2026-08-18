import { test, expect, type APIRequestContext } from "@playwright/test";
import { E2E_EDGE_SHARED_SECRET, MOCK_SUPABASE_PORT } from "../../playwright.config";
import { PLAY_STORE_URL } from "../../src/lib/app-meta";
import { ATTRIBUTION_COOKIE, UUID_PATTERN } from "../../src/lib/attribution";
import { CONSENT_GRANTED, CONSENT_KEY, attributionGateOf } from "../../src/lib/consent";
import {
  TERRITORIES_WITHOUT_PRIOR_CONSENT,
  VERCEL_COUNTRY_HEADER,
  countryOf,
  requiresPriorConsent,
} from "../../src/lib/territory";
import { requestCameThroughOurEdge } from "../../src/lib/rate-limit";

/**
 * The consent gate of the attribution capture — BR-USUARIO-033, and the
 * capture it gates is BR-B2B-002.
 *
 * The rule is an INVERTED list: it names the territories where the capture
 * runs without asking (Brazil and the United States, as of 2026-08-18) and
 * everything else is gated, an undetermined territory included. So the three
 * cases below are the whole product: a place with no gate captures; a place
 * with a gate captures nothing until the visitor says yes, and captures after;
 * and a visitor we could not place is treated as gated.
 *
 * WHY THE HEADER IS HALF THE TEST. A gate decided on the client is a gate the
 * client edits, so the territory is resolved on the server — and the same trap
 * that produced the S1 defect of `CF-Connecting-IP` is here: the origin is
 * reachable without Cloudflare, and on that path a Cloudflare header is
 * whatever the caller typed. `cf-ipcountry` is therefore honoured only against
 * the edge proof, and the floor is `x-vercel-ip-country`, which Vercel replaces
 * with its own reading (measured 2026-08-18 — see `src/lib/territory.ts`).
 */

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/** A territory BR-USUARIO-033 item 1 exempts, and one it does not. */
const OPEN_TERRITORY = "BR";
/** Portugal: covered by the ePrivacy line of item 3, consent before capture. */
const GATED_TERRITORY = "PT";

/** A partner UUID nobody else in the suite asserts on. */
const uniquePartnerId = () =>
  `66666666-6666-4666-8666-${Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, "0")}`;

async function storedFingerprint(request: APIRequestContext, partnerId: string) {
  const res = await request.get(
    `${MOCK_BASE}/__fingerprints?partner_id=${encodeURIComponent(partnerId)}`
  );
  expect(res.ok()).toBe(true);
  return (await res.json()).row as { id: string } | null;
}

/* ---------------------------------------------------------------------------
 * 1. The decision itself, before any of it is wired to a route
 * ------------------------------------------------------------------------- */

test.describe("which territory the visitor is in", () => {
  test("BR-USUARIO-033: cf-ipcountry counts only against proof of our edge", () => {
    const headers = new Headers({
      "x-tuggi-edge": E2E_EDGE_SHARED_SECRET,
      "cf-ipcountry": GATED_TERRITORY,
      [VERCEL_COUNTRY_HEADER]: OPEN_TERRITORY,
    });

    // Proxied path: Cloudflare read the real visitor, Vercel read the address
    // of the Cloudflare edge. Cloudflare wins, and that is the accuracy this
    // preference exists for — parts of South America are served from a PoP in
    // the United States, which is the permissive side of this gate.
    expect(countryOf(headers, requestCameThroughOurEdge(headers, E2E_EDGE_SHARED_SECRET))).toBe(
      GATED_TERRITORY
    );

    // Same headers, no proof: the Cloudflare one is an ordinary client header
    // now and buys nothing. This is the exact shape of the S1 defect of
    // 806cf45, asked again about the country instead of the address.
    expect(countryOf(headers, requestCameThroughOurEdge(headers, ""))).toBe(OPEN_TERRITORY);
    expect(countryOf(headers)).toBe(OPEN_TERRITORY);
  });

  test("BR-USUARIO-033: a value that is not a territory resolves to nothing", () => {
    // `XX` is what Cloudflare answers when it cannot place the address and `T1`
    // is the Tor network; both pass for a code and neither is a place. The
    // empty, the malformed and the spelled-out name are the same answer.
    for (const claimed of ["XX", "T1", "", "  ", "Brazil", "B", "BRA", "1R"]) {
      const headers = new Headers({ [VERCEL_COUNTRY_HEADER]: claimed });
      expect(countryOf(headers), `"${claimed}" resolved to a territory`).toBeNull();
    }

    // Case and padding are ours to normalise, not the caller's to get right.
    expect(countryOf(new Headers({ [VERCEL_COUNTRY_HEADER]: " br " }))).toBe("BR");
  });

  test("BR-USUARIO-033: the list of territories without a gate is closed, and absence means gated", () => {
    // Item 1 is an inverted list and it grows ONLY by editing the rule, with an
    // official source per territory. If this assertion is in your way, the rule
    // is what has to move first — the list is the rule, not a configuration.
    expect(
      [...TERRITORIES_WITHOUT_PRIOR_CONSENT].sort(),
      "BR-USUARIO-033 item 1 lists exactly Brazil and the United States"
    ).toEqual(["BR", "US"]);

    for (const open of TERRITORIES_WITHOUT_PRIOR_CONSENT) {
      expect(requiresPriorConsent(open)).toBe(false);
    }
    // A sample of item 3: the ePrivacy line, the retained UK one, Quebec's
    // province-level one through Canada, and the Americas apurated in
    // 2026-08-18. None of them is in the list, so none of them needs to be
    // named in code — this only proves the default.
    for (const gated of ["PT", "ES", "FR", "GB", "CA", "MX", "CO", "AR", "CL", "PE", "UY"]) {
      expect(requiresPriorConsent(gated), `${gated} was treated as ungated`).toBe(true);
    }
    // Item 2, and it is the one that only shows up in an audit: no signal is
    // not a guess at Brazil.
    expect(requiresPriorConsent(null)).toBe(true);
  });

  test("BR-USUARIO-033: consent is what opens the gate, and only the stored yes counts", () => {
    const gate = (country: string | null, consent?: string) =>
      attributionGateOf(
        new Headers({
          ...(country ? { [VERCEL_COUNTRY_HEADER]: country } : {}),
          ...(consent === undefined ? {} : { cookie: `${CONSENT_KEY}=${consent}` }),
        }),
        false
      );

    expect(gate(OPEN_TERRITORY).allowed).toBe(true);
    expect(gate(GATED_TERRITORY).allowed).toBe(false);
    expect(gate(GATED_TERRITORY, CONSENT_GRANTED).allowed).toBe(true);
    expect(gate(null, CONSENT_GRANTED).allowed).toBe(true);

    // "false" is an answer and it is not a yes; so is a flag holding anything
    // else, which is what a stale or hand-edited value looks like.
    for (const answer of ["false", "", "1", "yes", "TRUE"]) {
      expect(gate(GATED_TERRITORY, answer).allowed, `"${answer}" opened the gate`).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------------------
 * 2. The route: what it writes, and what it refuses to write
 * ------------------------------------------------------------------------- */

test.describe("POST /api/attribution honours the gate", () => {
  // Its own address, so the 30/h budget this spec spends is not the one every
  // browser-driven visit of the suite shares (the counter of the double is
  // process-wide and survives a reused server).
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.221" } });

  test("BR-USUARIO-033, BR-B2B-002: a territory without a gate captures with no question asked", async ({
    request,
  }) => {
    const partnerId = uniquePartnerId();
    const res = await request.post("/api/attribution", {
      headers: { [VERCEL_COUNTRY_HEADER]: OPEN_TERRITORY },
      data: { partner_id: partnerId, user_agent: "e2e-gate" },
    });

    expect(res.status()).toBe(201);
    expect((await res.json()).click_id).toMatch(UUID_PATTERN);
    expect(res.headers()["set-cookie"] ?? "").toContain(`${ATTRIBUTION_COOKIE}=`);
    expect(await storedFingerprint(request, partnerId)).not.toBeNull();
  });

  test("BR-USUARIO-033: a gated territory without consent writes nothing at all", async ({
    request,
  }) => {
    const partnerId = uniquePartnerId();
    const res = await request.post("/api/attribution", {
      headers: { [VERCEL_COUNTRY_HEADER]: GATED_TERRITORY },
      data: { partner_id: partnerId, user_agent: "e2e-gate" },
    });

    // Item 5, in one place: no row, no cookie, and no click_id for the caller
    // to put in the Play referrer or in the clipboard. The refusal is typed and
    // it is a 200 — the page has nothing to retry, and a 4xx would earn a
    // second attempt from `captureFirstTouch`.
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.consent_required).toBe(true);
    expect(body.click_id).toBeNull();
    expect(res.headers()["set-cookie"] ?? "").not.toContain(ATTRIBUTION_COOKIE);
    expect(await storedFingerprint(request, partnerId)).toBeNull();
  });

  test("BR-USUARIO-033, BR-B2B-002: the same visit captures once the visitor has consented", async ({
    request,
  }) => {
    const partnerId = uniquePartnerId();
    const res = await request.post("/api/attribution", {
      headers: {
        [VERCEL_COUNTRY_HEADER]: GATED_TERRITORY,
        cookie: `${CONSENT_KEY}=${CONSENT_GRANTED}`,
      },
      data: { partner_id: partnerId, user_agent: "e2e-gate" },
    });

    expect(res.status()).toBe(201);
    expect((await res.json()).click_id).toMatch(UUID_PATTERN);
    expect(await storedFingerprint(request, partnerId)).not.toBeNull();
  });

  test("BR-USUARIO-033: a territory we could not determine is a territory with a gate", async ({
    request,
  }) => {
    // No country header at all — a proxy that strips it, a request that never
    // reached the edge, a geolocation that failed. Item 2: the failure closes,
    // and the route says so in the log so that a capture falling silent is
    // visible before an audit finds it.
    const partnerId = uniquePartnerId();
    const res = await request.post("/api/attribution", {
      data: { partner_id: partnerId, user_agent: "e2e-gate" },
    });

    expect(res.status()).toBe(200);
    expect((await res.json()).consent_required).toBe(true);
    expect(await storedFingerprint(request, partnerId)).toBeNull();
  });

  test("BR-USUARIO-033: a claimed cf-ipcountry does not open the gate on its own", async ({
    request,
  }) => {
    // The whole point of resolving the territory on the server is that the
    // visitor cannot choose it. Without `x-tuggi-edge` this header is a client
    // header, and honouring it would let anyone opt themselves out of a
    // protection that is not theirs to waive.
    const partnerId = uniquePartnerId();
    const res = await request.post("/api/attribution", {
      headers: { "cf-ipcountry": OPEN_TERRITORY, [VERCEL_COUNTRY_HEADER]: GATED_TERRITORY },
      data: { partner_id: partnerId, user_agent: "e2e-gate" },
    });

    expect(res.status()).toBe(200);
    expect((await res.json()).consent_required).toBe(true);
    expect(await storedFingerprint(request, partnerId)).toBeNull();
  });
});

/* ---------------------------------------------------------------------------
 * 3. The page a tourist actually opens
 * ------------------------------------------------------------------------- */

test.describe("the partner page in a gated territory", () => {
  test.use({
    extraHTTPHeaders: {
      "x-forwarded-for": "198.51.100.222",
      [VERCEL_COUNTRY_HEADER]: GATED_TERRITORY,
    },
  });

  test("BR-USUARIO-033, BR-B2B-002: nothing is captured before the answer, and everything after it", async ({
    page,
  }) => {
    // `?lang=en` because the territory this describe declares is also what
    // `src/middleware.ts` reads to choose the language of an unprefixed
    // `/d/<slug>`: without the override Portugal serves the page in Portuguese
    // and the button below is named something else.
    await page.goto("/d/e2e-com-logo?lang=en");
    await page.waitForLoadState("networkidle");

    const attributionCookie = async () =>
      (await page.context().cookies()).find((c) => c.name === ATTRIBUTION_COOKIE);

    // Before the answer: no first touch on the device, and the way out of the
    // page is the bare store URL. The clipboard channel of iOS is covered by
    // the same absence — `writeClipboardToken` has no token to write, which is
    // BR-USUARIO-033 item 6: a refusal is not rebuilt through another door.
    expect(await attributionCookie()).toBeUndefined();
    const playLink = page.locator('a[href*="play.google.com"]:visible');
    await expect(playLink).toHaveCount(1);
    expect(await playLink.getAttribute("href")).toBe(PLAY_STORE_URL);

    await page.getByRole("button", { name: /^accept$/i }).click();

    // Accepting reloads, and the capture runs again — this time carrying the
    // consent cookie, which is the only thing that changed.
    await expect.poll(async () => (await attributionCookie())?.value ?? null).not.toBeNull();
    await expect
      .poll(async () => playLink.getAttribute("href"))
      .toContain("referrer=tuggi_click_");
  });

  test("BR-USUARIO-033: declining leaves the page working and the capture off", async ({
    page,
  }) => {
    await page.goto("/d/e2e-com-logo?lang=en");
    await page.getByRole("button", { name: /^decline$/i }).click();
    await page.waitForLoadState("networkidle");

    // The tourist still gets the app: the install is organic, the partner earns
    // nothing from it, and that price was decided knowing what it is (item 5).
    expect((await page.context().cookies()).find((c) => c.name === ATTRIBUTION_COOKIE)).toBeUndefined();
    await expect(page.locator('a[href*="play.google.com"]:visible')).toHaveAttribute(
      "href",
      PLAY_STORE_URL
    );
  });
});
