import { getSupabaseClient } from "@/lib/supabase-server";
import {
  ATTRIBUTION_IP_ALLOWED_ORIGINS,
  ATTRIBUTION_RETENTION_DAYS,
  UUID_PATTERN,
} from "@/lib/attribution";
import { clientAddressOf, isIpv4Address, requestCameThroughOurEdge } from "@/lib/rate-limit";
import { registerIpComplementAttempt } from "@/lib/attribution-limits";
import { attributionGateOf } from "@/lib/consent";

/**
 * The IPv4 complement of a click already captured — BR-B2B-002, contract §3
 * and §4.
 *
 * WHAT IT IS FOR. The probabilistic leg of the match compares the address of
 * the click against the address of the install, and until 2026-09-03 the two
 * could never be the same value: 100% of clicks reach us over IPv6 (Cloudflare
 * publishes AAAA for every hostname it proxies, and browsers prefer v6 — RFC
 * 8305), while every install measured — 219 of them — reaches Supabase over
 * IPv4, because that endpoint publishes no AAAA and the app has no choice. The
 * families were disjoint, so the zero matches in production measured the wrong
 * key and not the method (#672, #682).
 *
 * The route is HOST-AGNOSTIC and that is deliberate. `ip4.tuggi.app` is this
 * same Vercel deployment, added DNS-only, so it resolves A and nothing else and
 * the browser has to speak IPv4 to reach it. What forces the family is the
 * HOST; this path is reachable on `www` too, and there it observes IPv6 and
 * writes nothing. That is why it is not called `ip4`.
 *
 * FOUR PROPERTIES, AND EACH ONE IS A DEFECT SOMEBODY WOULD OTHERWISE SHIP:
 *
 *   1. **It answers 204 to everything it does not refuse.** Valid click id,
 *      unknown click id, already complete, out of window, IPv6 caller — one
 *      answer. A route that distinguished them would be a public oracle for
 *      enumerating `click_id`s, which is the token that credits a commission.
 *   2. **The address comes from the edge and NEVER from the body.** Accepting
 *      `client_ip` once already moved a partner's commission (contract §4), and
 *      here the payoff would be larger: a chosen address planted into a row
 *      whose id you hold is the probabilistic match handed to you.
 *   3. **Write-once, in the database and not in this process.** One `UPDATE`
 *      whose predicate carries the whole decision, no `.select()`, no
 *      read-modify-write. Two concurrent calls cannot both win, and the
 *      earliest observation — the one closest to the click — is the one kept.
 *   4. **Only IPv4 is stored.** Decided by the operator on 2026-09-03 as the
 *      less identifying of the two: a mobile IPv4 under CGNAT points at a
 *      crowd, while a /64 of IPv6 is typically one subscriber, so it points at
 *      a household. It is also the less PRECISE key, and that price is paid
 *      knowingly — ambiguity still refuses to credit (BR-B2B-002).
 *
 * THE ONE EXCEPTION TO THE MUTE ANSWER IS THE RATE LIMIT, and it is not a
 * lapse: see `IP_COMPLEMENT_LIMIT_PER_WINDOW`. This host is outside Cloudflare
 * by construction, so there is no WAF and no edge ceiling in front of a
 * `service_role` write, and a `204` on a refusal would erase the only evidence
 * of mass planting that exists anywhere.
 *
 * Built at module scope: a missing variable fails the build, not the request.
 */
const supabase = getSupabaseClient("serviceRole");

/**
 * Node, and load-bearing rather than a default left alone — the same reason
 * `/api/attribution/gate` names it: the edge runtime has no `node:crypto`, so
 * neither the edge proof nor the rate limiter's HMAC can run there, and the
 * route would degrade to the permissive reading of both.
 */
export const runtime = "nodejs";
/** Per visitor, per request: nothing here is cacheable and a cached answer lies. */
export const dynamic = "force-dynamic";

/**
 * How far back a click may be completed: the DETERMINISTIC window, which has
 * one owner already (`ATTRIBUTION_RETENTION_DAYS`) and is the lifetime of the
 * row itself. No second number is invented here — a row older than this does
 * not exist to be written to.
 *
 * Note for whoever reads this next: the address is zeroed at 48 h (contract §8)
 * and the widest probabilistic step is 24 h (§6), so completing a click from
 * last week writes a value nothing will ever compare. It is inert rather than
 * wrong — the match filters by `created_at` on its own side — and narrowing the
 * window is a card of its own, not a number to pick here.
 */
const COMPLETION_WINDOW_MS = ATTRIBUTION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * The CORS answer for this request, echoing ONE allowed origin or none.
 *
 * `Vary: Origin` unconditionally, including on the refusal: the answer differs
 * by origin, and a CDN that cached the version without the header would break
 * the legitimate caller instead of the strange one. No `Allow-Credentials` —
 * the browser sends this with `credentials: 'omit'` and there is no cookie in
 * the decision.
 */
function corsHeadersFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = { vary: "Origin" };
  const origin = req.headers.get("origin");
  const allowed: readonly string[] = ATTRIBUTION_IP_ALLOWED_ORIGINS;
  if (origin && allowed.includes(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

/** The one answer this route gives for every outcome that is not a refusal. */
function silent(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeadersFor(req) });
}

/**
 * The preflight. `POST` with `Content-Type: application/json` earns one, and
 * without a handler here the browser never sends the request at all — the
 * complement would fail silently in production and pass every local test that
 * calls the route directly.
 */
export function OPTIONS(req: Request): Response {
  const headers = corsHeadersFor(req);
  if (headers["access-control-allow-origin"]) {
    headers["access-control-allow-methods"] = "POST, OPTIONS";
    headers["access-control-allow-headers"] = "content-type";
    headers["access-control-max-age"] = "86400";
  }
  return new Response(null, { status: 204, headers });
}

export async function POST(req: Request): Promise<Response> {
  try {
    // THE CONSENT GATE FIRST, AND ON THIS SIDE — BR-USUARIO-033, item 2: the
    // territory is resolved on the same side the decision is taken, because a
    // gate decided on the client is a gate the client edits. The hook that
    // fires this already answers null without consent, and that is not enough:
    // this is a public door and nothing stops a caller from posting anyway.
    // Refused, no counter is touched either — the visitor who is not being
    // captured also does not need a hashed record of his address.
    const edgeProven = requestCameThroughOurEdge(req.headers);
    if (!attributionGateOf(req.headers, edgeProven).allowed) return silent(req);

    const address = clientAddressOf(req.headers);

    // COUNTED BEFORE THE BODY IS READ, same order as the other two public doors
    // of this site: a flood of malformed bodies is an attempt like any other,
    // and this counter is the only barrier this host has.
    const limit = await registerIpComplementAttempt(address);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: "too_many_ip_complements", retryAfterSeconds: limit.retryAfterSeconds }),
        {
          status: 429,
          headers: {
            ...corsHeadersFor(req),
            "content-type": "application/json",
            "retry-after": String(limit.retryAfterSeconds),
          },
        }
      );
    }

    // ONLY IPv4 IS STORED, and the check is here rather than in a comment
    // somewhere: this is what makes "we keep the less identifying family" true
    // in the code instead of true in the intention. A caller reaching this path
    // on `www` speaks IPv6 and leaves no trace, which is correct.
    if (!isIpv4Address(address)) return silent(req);

    const body: unknown = await req.json().catch(() => null);
    const clickId = (body as { click_id?: unknown } | null)?.click_id;
    if (typeof clickId !== "string" || !UUID_PATTERN.test(clickId)) return silent(req);

    // ONE UPDATE, AND THE PREDICATE IS THE DECISION. `ip_address_v4 IS NULL` is
    // the write-once; `created_at` is the window. Neither is read first and
    // compared here — a read-modify-write would let two concurrent calls both
    // see NULL and both write, and the later one would overwrite the
    // observation closest to the click. No `.select()`: nothing about the row
    // is allowed to travel back to a caller who only proved he holds an id.
    const floor = new Date(Date.now() - COMPLETION_WINDOW_MS).toISOString();
    const { error } = await supabase
      .schema("drive")
      .from("click_fingerprints")
      .update({ ip_address_v4: address })
      .eq("id", clickId)
      .is("ip_address_v4", null)
      .gte("created_at", floor);

    if (error) {
      // No address, no click id: this line is read on an ordinary support
      // question and both of them are personal data. The message from
      // PostgREST can carry the offending value, so only the code goes out.
      console.error("[attribution/ip] update refused", { code: error.code });
    }

    return silent(req);
  } catch (error: unknown) {
    console.error(
      "[attribution/ip] unexpected error",
      error instanceof Error ? error.message : "unknown error"
    );
    // STILL 204. An internal failure is not a fact about the click either, and
    // the caller is a fire-and-forget beacon with nothing to retry.
    return silent(req);
  }
}
