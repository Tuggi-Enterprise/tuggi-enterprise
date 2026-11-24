import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveWelcomePoiId } from "../../src/lib/partner-welcome";

/**
 * tuggi-app#1280: which POI the partner page (`/@nome` and `/d/{slug}`, one resolver,
 * BR-B2B-037 item 2) plays as its welcome. The case that opened the card: the Tuggi row kept
 * `welcome_poi_id` on a test POI the operator had deactivated, and `/@tuggi` still spoke it.
 *
 * No browser and no double here: the fake below runs the filters the function sends over an
 * in-memory `core.attractions`, so a filter left out of the query fails the case it guards.
 */

type Poi = { id: string; partner_client_id: string | null; approved: boolean; is_active: boolean; approved_at: string | null };

const CLIENT = "8be94d35-282d-46bf-bc12-6fcd2f83a432";
const OTHER_CLIENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHOSEN = "1953adfc-a025-4ce4-952b-6547e235c39b";
const OWN_OLD = "c5b795c6-6852-4211-a931-6509c0373275";
const OWN_NEW = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const poi = (id: string, over: Partial<Poi> = {}): Poi => ({
  id,
  partner_client_id: CLIENT,
  approved: true,
  is_active: true,
  approved_at: "2026-11-01T00:00:00Z",
  ...over,
});

/** The supabase-js chain the function uses, evaluated for real over `rows`. */
function fakeSupabase(rows: Poi[], fail = false) {
  const calls: string[] = [];
  const query = () => {
    const eqs: [keyof Poi, unknown][] = [];
    let ors: [string, string][] = [];
    const orders: [keyof Poi, boolean, boolean][] = [];
    const chain = {
      select: () => chain,
      eq: (col: keyof Poi, value: unknown) => (eqs.push([col, value]), chain),
      or: (expr: string) => {
        ors = expr.split(",").map((t) => {
          const [col, , ...value] = t.split(".");
          return [col, value.join(".")];
        });
        return chain;
      },
      // Postgres default when unset: nulls sort as the largest value, so first on a descending order.
      order: (col: keyof Poi, opts: { ascending: boolean; nullsFirst?: boolean }) =>
        (orders.push([col, opts.ascending, opts.nullsFirst ?? !opts.ascending]), chain),
      then: (resolve: (v: unknown) => void) => {
        if (fail) return resolve({ data: null, error: { code: "57014", message: "timeout" } });
        const data = rows
          .filter((r) => eqs.every(([c, v]) => r[c] === v))
          .filter((r) => ors.some(([c, v]) => String(r[c as keyof Poi]) === v))
          .sort((a, b) => {
            for (const [c, asc, nullsFirst] of orders) {
              const x = a[c], y = b[c];
              if (x === y) continue;
              if (x === null) return nullsFirst ? -1 : 1;
              if (y === null) return nullsFirst ? 1 : -1;
              return (String(x) < String(y) ? -1 : 1) * (asc ? 1 : -1);
            }
            return 0;
          })
          .map((r) => ({ id: r.id }));
        resolve({ data, error: null });
      },
    };
    return chain;
  };
  const client = {
    schema: (s: string) => ({ from: (t: string) => (calls.push(`${s}.${t}`), query()) }),
  };
  return { supabase: client as unknown as SupabaseClient, calls };
}

test("BR-B2B-037: a deactivated welcome POI falls to the partner's own POI on the air", async () => {
  const { supabase } = fakeSupabase([poi(CHOSEN, { is_active: false }), poi(OWN_OLD)]);
  expect(await resolveWelcomePoiId(supabase, CLIENT, CHOSEN)).toBe(OWN_OLD);
});

test("BR-B2B-037: a welcome POI not approved falls to the partner's own POI on the air", async () => {
  const { supabase } = fakeSupabase([poi(CHOSEN, { approved: false }), poi(OWN_OLD)]);
  expect(await resolveWelcomePoiId(supabase, CLIENT, CHOSEN)).toBe(OWN_OLD);
});

test("BR-B2B-037: the fallback is the latest approved, the order of partner.resolve_public_page", async () => {
  const { supabase } = fakeSupabase([
    poi(CHOSEN, { is_active: false }),
    poi(OWN_OLD, { approved_at: "2026-10-01T00:00:00Z" }),
    poi(OWN_NEW, { approved_at: "2026-11-20T00:00:00Z" }),
    poi("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", { approved_at: null }),
  ]);
  expect(await resolveWelcomePoiId(supabase, CLIENT, CHOSEN)).toBe(OWN_NEW);
});

test("BR-B2B-037: nothing on the air means no welcome (today's /@tuggi: its other POI is in review)", async () => {
  const { supabase, calls } = fakeSupabase([
    poi(CHOSEN, { is_active: false }),
    poi(OWN_OLD, { approved: false }),
    poi(OWN_NEW, { partner_client_id: OTHER_CLIENT }),
  ]);
  expect(await resolveWelcomePoiId(supabase, CLIENT, CHOSEN)).toBeNull();
  expect(calls, "one read decides it").toEqual(["core.attractions"]);
});

test("BR-B2B-037: a welcome POI approved and active stays the one chosen, owned or not", async () => {
  const { supabase } = fakeSupabase([
    poi(CHOSEN, { partner_client_id: null, approved_at: "2026-01-01T00:00:00Z" }),
    poi(OWN_NEW, { approved_at: "2026-11-20T00:00:00Z" }),
  ]);
  expect(await resolveWelcomePoiId(supabase, CLIENT, CHOSEN)).toBe(CHOSEN);
});

test("#1280: a coupon owned by Tuggi (no client) keeps its own welcome POI only while it is on the air", async () => {
  const { supabase } = fakeSupabase([poi(CHOSEN, { partner_client_id: null })]);
  expect(await resolveWelcomePoiId(supabase, null, CHOSEN)).toBe(CHOSEN);
  const off = fakeSupabase([poi(CHOSEN, { partner_client_id: null, is_active: false })]);
  expect(await resolveWelcomePoiId(off.supabase, null, CHOSEN)).toBeNull();
});

test("#1280: a welcome id that is not a UUID never reaches the filter, and the partner's own POI still answers", async () => {
  const { supabase } = fakeSupabase([poi(OWN_OLD)]);
  expect(await resolveWelcomePoiId(supabase, CLIENT, "x),approved.eq.false")).toBe(OWN_OLD);
  const none = fakeSupabase([poi(OWN_OLD)]);
  expect(await resolveWelcomePoiId(none.supabase, null, "not-a-uuid")).toBeNull();
  expect(none.calls, "nothing to ask, nothing asked").toEqual([]);
});

test("#1280: a failed read answers no welcome instead of throwing", async () => {
  const { supabase } = fakeSupabase([poi(OWN_OLD)], true);
  expect(await resolveWelcomePoiId(supabase, CLIENT, CHOSEN)).toBeNull();
});
