import { test, expect, type APIRequestContext } from "@playwright/test";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";

/**
 * /api/data-deletion — the web channel Google Play requires and the only route
 * a person who cannot get into the app has (BR-USUARIO-024).
 *
 * The regression this pins is #167 item 1, and it produced a lead in
 * `campaign.inbound_leads` for every request the Edge Function did not accept:
 * the address of someone asking to be erased became a marketing contact, which
 * is the exact inverse of what the page is for. `full_name: 'Data Deletion
 * User'`, `company: 'EF Fallback'` — the row was built by hand, so nobody can
 * call it an accident of a shared helper.
 *
 * The second half is the shape of the answer: BR-USUARIO-024 item 3 closes the
 * list of what may not differ between an address with an account and one
 * without — status, body, on-screen text, and whether the request was accepted.
 * The Edge Function is tested for that in tuggi-drive-v2
 * (src/__tests__/simpleDeletionRequest.test.ts); what is checked here is that
 * the route in front of it does not put the difference back by another door.
 */

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

/** The double answers a failure for this address, and only for this one. */
const EF_FAILURE_EMAIL = "ef-failure@example.com";

/** Rows the app offered to campaign.inbound_leads for an address. */
async function leadsFor(request: APIRequestContext, email: string) {
  const res = await request.get(
    `${MOCK_BASE}/__leads?email=${encodeURIComponent(email)}`
  );
  expect(res.ok()).toBe(true);
  return (await res.json()).rows as unknown[];
}

/** Everything about an answer that BR-USUARIO-024 item 3 keeps closed. */
async function answerOf(request: APIRequestContext, email: string) {
  const res = await request.post("/api/data-deletion", {
    data: { email, locale: "en" },
  });
  const headers = { ...res.headers() };
  // The clock is not a fact about the account, and neither is the trace id
  // `next start` stamps on a response.
  delete headers.date;
  delete headers["x-nextjs-cache"];
  return { status: res.status(), body: await res.text(), headers };
}

test.describe("BR-USUARIO-024 item 4 — asking to be erased never creates a contact", () => {
  test("a request the Edge Function accepts records no lead", async ({ request }) => {
    const email = `accepted-${Date.now()}@example.com`;

    const answer = await answerOf(request, email);

    expect(answer.status).toBe(200);
    expect(await leadsFor(request, email)).toEqual([]);
  });

  test("a request the Edge Function refuses records no lead either", async ({ request }) => {
    // This is the path that used to write the row, and under #165 it was the
    // only path there was. A failure is an error now, and nothing else.
    const answer = await answerOf(request, EF_FAILURE_EMAIL);

    expect(await leadsFor(request, EF_FAILURE_EMAIL)).toEqual([]);
    // Not a success: a request that failed and was reported as accepted is a
    // request nobody will ever come back for.
    expect(answer.status).toBe(500);
    // And the failure does not hand the address back out either.
    expect(answer.body).not.toContain(EF_FAILURE_EMAIL);
  });
});

test.describe("BR-USUARIO-024 item 3 — the route adds no difference of its own", () => {
  test("two addresses get the same status, the same body and the same headers", async ({
    request,
  }) => {
    const first = await answerOf(request, `one-${Date.now()}@example.com`);
    const second = await answerOf(request, `two-${Date.now()}@example.com`);

    expect(second.status).toBe(first.status);
    expect(second.body).toBe(first.body);
    expect(second.headers).toEqual(first.headers);
    // The body says nothing about an account, in either direction.
    expect(first.body).toBe(JSON.stringify({ success: true }));
  });

  test("a body with no address is refused on shape, before anything is sent", async ({
    request,
  }) => {
    // Not an oracle: the shape of the request is not a fact about the account.
    const res = await request.post("/api/data-deletion", { data: { locale: "en" } });

    expect(res.status()).toBe(400);
  });
});
