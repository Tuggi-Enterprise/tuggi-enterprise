import crypto from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { MOCK_SUPABASE_PORT, E2E_NEWSLETTER_SECRET } from "../../playwright.config";

/**
 * Opening the unsubscribe link must not unsubscribe anybody.
 *
 * The page used to record the opt-out while RENDERING, and rendering a page is
 * a GET. A GET is what every machine between us and the reader performs
 * without being asked: corporate URL-defense prefetch, antivirus link
 * scanners, the unfurl a messenger runs when the link is pasted into a chat.
 * Each of them was unsubscribing the person, silently, with no click — and
 * with 7 opt-outs recorded in total (measured 2026-09-10 in production) there
 * is no way to tell which of them a human performed.
 *
 * So the invariant is a NEGATIVE, and it is the first test below: fetch the
 * page the way a scanner does, then look at what the database received. The
 * mock records every upsert at `GET /__unsubscribes`, so "nothing arrived" is
 * observable rather than assumed.
 *
 * The signature is minted here rather than pasted, because a hard-coded one
 * pins the format and not the behaviour: if the page ever changed how it
 * verifies, a frozen string would fail for the wrong reason.
 */

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/** The link the newsletter footer carries, for one address. */
function signedLink(locale: string, email: string, lang?: string): string {
  const e = Buffer.from(email, "utf8").toString("base64url");
  const s = crypto.createHmac("sha256", E2E_NEWSLETTER_SECRET).update(email).digest("base64url");
  const query = new URLSearchParams({ e, s, ...(lang ? { lang } : {}) });
  return `/${locale}/unsubscribe?${query.toString()}`;
}

/**
 * The one act of the page.
 *
 * Scoped to `main` and to `type="submit"` on purpose: the layout ships a locale
 * switcher and a cookie banner, so a bare `getByRole("button")` resolves to
 * four elements and matches whichever renders first.
 */
function actButton(page: Page) {
  return page.locator('main button[type="submit"]');
}

/**
 * The rows recorded for ONE address.
 *
 * Scoped by address rather than counting the whole table, because the mock is a
 * single process and `fullyParallel` runs these tests against it at the same
 * time. A global count — or a `beforeEach` that truncates — makes each test's
 * result depend on its neighbours' timing, which is the kind of green that goes
 * red on a slow machine and tells you nothing. Every test below therefore uses
 * an address of its own.
 */
async function rowsFor(
  request: APIRequestContext,
  email: string,
): Promise<Array<{ email: string; source: string }>> {
  const res = await request.get(`${MOCK_BASE}/__unsubscribes`);
  expect(res.ok()).toBeTruthy();
  const rows: Array<{ email: string; source: string }> = (await res.json()).rows;
  return rows.filter((row) => row.email === email);
}

// --- The defect ------------------------------------------------------------

test("a GET on a valid link writes nothing — the scanner path", async ({ page, request }) => {
  await page.goto(signedLink("en", "scanned@example.com"));

  expect(await rowsFor(request, "scanned@example.com")).toHaveLength(0);
});

test("a GET renders the confirm screen, with the address and a real button", async ({ page }) => {
  await page.goto(signedLink("en", "reader@example.com"));

  // The address is on screen because a reader may hold several, and the one
  // the link carries is the one that stops.
  await expect(page.getByText("reader@example.com")).toBeVisible();
  await expect(actButton(page)).toBeVisible();
});

test("only the POST records the opt-out, and it records the address from the link", async ({ page, request }) => {
  await page.goto(signedLink("en", "leaving@example.com"));
  await actButton(page).click();

  await expect.poll(() => rowsFor(request, "leaving@example.com").then((r) => r.length)).toBe(1);
  const [row] = await rowsFor(request, "leaving@example.com");
  expect(row.source).toBe("footer_link");
});

// --- What the signature is for ---------------------------------------------

test("a tampered signature never reaches the confirm screen, and writes nothing", async ({ page, request }) => {
  const e = Buffer.from("victim@example.com", "utf8").toString("base64url");
  await page.goto(`/en/unsubscribe?e=${e}&s=not-a-signature`);

  await expect(actButton(page)).toHaveCount(0);
  expect(await rowsFor(request, "victim@example.com")).toHaveLength(0);
});

test("an address swapped under a valid signature is refused", async ({ page, request }) => {
  // The signature covers the address, so the pair has to match. Reusing a real
  // signature against a different address is the one attack the scheme has to
  // stop: it is what would let anyone unsubscribe a third party.
  const s = crypto
    .createHmac("sha256", E2E_NEWSLETTER_SECRET)
    .update("mine@example.com")
    .digest("base64url");
  const other = Buffer.from("someone-else@example.com", "utf8").toString("base64url");

  await page.goto(`/en/unsubscribe?e=${other}&s=${s}`);

  await expect(actButton(page)).toHaveCount(0);
  expect(await rowsFor(request, "someone-else@example.com")).toHaveLength(0);
});

// --- The language of the email, not of the route ---------------------------

test("?lang= wins over the route locale, for the links already in inboxes", async ({ page }) => {
  // Newsletters in Italian linked to /en carrying ?lang=it, from a time when
  // the site had no Italian locale. Those links live in inboxes forever.
  await page.goto(signedLink("en", "italiano@example.com", "it"));
  const withOverride = await page.locator("h1").innerText();

  await page.goto(signedLink("en", "italiano@example.com"));
  const withoutOverride = await page.locator("h1").innerText();

  expect(withOverride).not.toBe(withoutOverride);
});

// --- The two failures that used to look identical --------------------------

test("the done screen names the address that stopped", async ({ page }) => {
  // A reader may hold three addresses. Naming the one that was removed is the
  // only thing that lets them tell the right one stopped — the same reason the
  // confirm screen shows it. The signed pair rides into the outcome URL for
  // this, and the page re-verifies it before showing anything.
  await page.goto(signedLink("en", "done@example.com"));
  await actButton(page).click();

  await page.waitForURL(/state=done/);
  await expect(page.getByText("done@example.com")).toBeVisible();
});

test("a forged done screen renders nothing it cannot verify", async ({ page }) => {
  const other = Buffer.from("someone-else@example.com", "utf8").toString("base64url");
  await page.goto(`/en/unsubscribe?state=done&e=${other}&s=not-a-signature`);

  await expect(page.getByText("someone-else@example.com")).toHaveCount(0);
});

test("every screen has its own copy, in all four locales", async ({ page }) => {
  // `failed` used to share the `invalid` screen, which told a person whose
  // write WE dropped that their link had expired — so they closed the tab
  // instead of trying again. Four distinct titles per locale is the fix, and a
  // missing key renders the key name itself.
  for (const locale of ["en", "pt", "es", "it"]) {
    const seen = new Set<string>();

    await page.goto(`/${locale}/unsubscribe?state=invalid`);
    seen.add(await page.locator("h1").innerText());

    for (const state of ["done", "failed"]) {
      await page.goto(`${signedLink(locale, "copy@example.com")}&state=${state}`);
      seen.add(await page.locator("h1").innerText());
    }

    await page.goto(signedLink(locale, "copy@example.com"));
    seen.add(await page.locator("h1").innerText());

    for (const title of seen) {
      expect(title, `${locale} renders a missing key`).not.toContain("Unsubscribe.");
    }
    expect(seen.size, `${locale} reuses a title across screens`).toBe(4);
  }
});

test("the failed screen keeps the act — it is not a dead end", async ({ page }) => {
  // Saying "this one is on us" and then taking the button away is the same
  // dead end as before, with a nicer sentence.
  await page.goto(`${signedLink("en", "retry@example.com")}&state=failed`);

  await expect(actButton(page)).toBeVisible();
});

test("the confirm screen says what unsubscribing does NOT stop", async ({ page }) => {
  // BR-COMUNICACAO-015 item 3: the opt-out reaches marketing only, and account
  // confirmation and password recovery keep arriving. Someone who reads "you
  // will not receive our emails anymore" and then gets a password reset
  // concludes we ignored them, and the next click is "spam". Said BEFORE the
  // act, not after it.
  await page.goto(signedLink("en", "informed@example.com"));

  await expect(page.getByText(/account emails keep arriving/i)).toBeVisible();
});
