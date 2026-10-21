import { test, expect, type Page, type Request } from "@playwright/test";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_IP_PATH, UUID_PATTERN } from "../../src/lib/attribution";
import { visitorHeaders } from "./visitor-headers";

/**
 * What the browser sends to complete a click with its IPv4 — BR-B2B-002,
 * contract §4a, cards #682 and #988.
 *
 * The complement is the `attribution-ip` Edge Function on the app's Supabase,
 * and what it decides (origin list, rate limit, IPv4 only, write-once, the row
 * as the consent gate) is proven by its own suite in tuggi-drive-v2,
 * `src/__tests__/attributionIp.test.ts`. What only this side can prove is the
 * request itself, so the call is intercepted with `page.route` and never
 * leaves the browser:
 *
 *  1. **the body is the click id and nothing else**: an address in the body is
 *     the spoof contract §4 removed after it moved a partner's commission once;
 *  2. **no cookie travels**, `credentials: "omit"`: the function decides from
 *     its own edge;
 *  3. **one call per page load**, although two components mount the hook;
 *  4. **a visitor the gate refused sends nothing** (BR-USUARIO-033): there is no
 *     click id to send, and the function could not write without the row.
 */

/** A partner page whose capture plants the first touch this file spends. */
const PARTNER_PATH = "/d/e2e-sem-logo?lang=en";

/** Every complement the page tried to send, answered the way the function does. */
async function recordComplements(page: Page): Promise<Request[]> {
  const sent: Request[] = [];
  await page.route(`**${ATTRIBUTION_IP_PATH}`, (route) => {
    sent.push(route.request());
    return route.fulfill({ status: 204 });
  });
  return sent;
}

/** The click id this browser is carrying, as the site itself writes it. */
async function storedClickId(page: Page): Promise<string | null> {
  const cookie = (await page.context().cookies()).find((c) => c.name === ATTRIBUTION_COOKIE);
  if (!cookie) return null;
  return (JSON.parse(decodeURIComponent(cookie.value)) as { click_id?: string }).click_id ?? null;
}

test.describe("a visitor the capture allowed", () => {
  // Brazil: exempt from prior consent (BR-USUARIO-033, item 1). A local build
  // carries no country, and "not determined" is gated.
  test.use({ extraHTTPHeaders: visitorHeaders({ address: "198.51.100.241", country: "BR" }) });

  test("BR-B2B-002: the complement carries the captured click id and nothing else, once, without cookies", async ({
    page,
  }) => {
    const sent = await recordComplements(page);

    await page.goto(PARTNER_PATH);
    await expect.poll(async () => await storedClickId(page)).toMatch(UUID_PATTERN);
    await expect.poll(() => sent.length).toBeGreaterThan(0);
    await page.waitForLoadState("networkidle");

    expect(sent).toHaveLength(1);
    const [complement] = sent;
    expect(complement.method()).toBe("POST");
    expect(new URL(complement.url()).pathname).toBe(ATTRIBUTION_IP_PATH);
    expect(complement.postDataJSON()).toEqual({ click_id: await storedClickId(page) });
    expect(complement.headers()["cookie"]).toBeUndefined();
  });
});

test.describe("a visitor the capture refused", () => {
  // Portugal, covered by the ePrivacy line of BR-USUARIO-033, item 3, with no
  // consent given.
  test.use({ extraHTTPHeaders: visitorHeaders({ address: "198.51.100.242", country: "PT" }) });

  test("BR-USUARIO-033: without consent no click exists, so no complement is sent", async ({
    page,
  }) => {
    const sent = await recordComplements(page);

    await page.goto(PARTNER_PATH);
    await page.waitForLoadState("networkidle");
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    expect(await storedClickId(page)).toBeNull();
    expect(sent).toEqual([]);
  });
});
