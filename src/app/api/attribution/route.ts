import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-server";
import { isAttributablePartnerId } from "@/lib/app-meta";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  normalizeLanguage,
  normalizeTimezone,
  parseAttribution,
  readCookie,
  serializeAttribution,
  UUID_PATTERN,
} from "@/lib/attribution";
import { clientAddressOf, requestCameThroughOurEdge } from "@/lib/rate-limit";
import { registerCaptureAttempt, registerEchoAttempt } from "@/lib/attribution-limits";
import { attributionGateOf } from "@/lib/consent";

/**
 * The capture of a partner click — BR-B2B-002, and the contract is
 * `docs/contracts/atribuicao-de-parceiro.md`.
 *
 * It does four things, and the order matters:
 *
 *   1. decides whether it may capture at all — BR-USUARIO-033 gates the whole
 *      thing on the visitor's territory, and this is the FIRST step because a
 *      refusal must not even count the caller (contract §10);
 *   2. counts the caller, against the budget of what he is actually asking for
 *      (this is a public door in front of a `service_role` write, and it had no
 *      barrier at all — see the two branches in the handler);
 *   3. writes ONE row in `drive.click_fingerprints` and answers with its id —
 *      the `click_id`, which is what travels through the store instead of the
 *      partner's UUID (contract §1);
 *   4. keeps that first touch in a cookie and NEVER overwrites it, which is
 *      what makes the rule first touch instead of last touch (contract §9).
 *
 * service_role, deliberately — not the publishable key `/api/leads` uses.
 *
 * `drive.click_fingerprints` does accept an anonymous insert today
 * (`WITH CHECK (true)`), so the swap would appear to work. It would also mean
 * this row could be written without passing through the handler below, and the
 * handler is the whole point: it is what counts the caller against a budget,
 * what normalises the fields the match compares, and what refuses the second
 * partner of the same visitor. Narrowing this key is a separate card with a
 * `WITH CHECK` of its own to write first.
 *
 * Built at module scope: a missing variable fails the build, not the request.
 */
const supabase = getSupabaseClient("serviceRole");

/** Free-text fields are stored as written; cap them so a row stays a row. */
const MAX_FIELD_LENGTH = 512;

function readText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_FIELD_LENGTH) : fallback;
}

/** Whether the visitor reached us over TLS — the edge says so in a header. */
function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto) return proto === "https";
  return new URL(req.url).protocol === "https:";
}

/**
 * The refusal of a caller over its budget, in the shape `captureFirstTouch`
 * already understands: a 429 is never retried by it, which is exactly what a
 * limit is for. The `error` names WHICH budget ran out — the two are counted
 * apart, so an answer that could not say which one would make the log unable to
 * tell "someone is farming rows" from "a lobby full of tourists is reloading".
 */
function tooManyRequests(error: string, retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error, retryAfterSeconds },
    { status: 429, headers: { "retry-after": String(retryAfterSeconds) } }
  );
}

/**
 * The consent gate — BR-USUARIO-033 — and it runs before anything else.
 *
 * Refused, nothing happens: no row, no cookie, and therefore no `click_id` for
 * the caller to put in the Play referrer or in the clipboard. The answer is a
 * typed 200 and not an error, because refusing is the correct outcome and the
 * page has nothing to retry (a 4xx would earn a second attempt from
 * `captureFirstTouch`, which retries once on a non-OK status).
 *
 * Not even the rate-limit counter is written on a refusal: the visitor who is
 * not being captured also does not need a hashed record of their address, and
 * this branch touches no database at all.
 */
function refuseWithoutConsent(): NextResponse {
  return NextResponse.json(
    { click_id: null, partner_id: null, first_touch: false, consent_required: true },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  try {
    const edgeProven = requestCameThroughOurEdge(req.headers);
    const gate = attributionGateOf(req.headers, edgeProven);

    // THE SIGNAL BR-USUARIO-033 ASKS FOR. An undetermined territory is gated,
    // and a gate that closes silently is a capture that stops paying partners
    // with nobody noticing. Logged on EVERY occurrence and not once per
    // process: here the frequency IS the finding — a handful of lines is a
    // proxy or a bot, a flood is a broken edge configuration. No IP, no user
    // agent, no partner: the counting BR-USUARIO-033 item 7 permits is
    // aggregate, and nothing here can re-find the person.
    if (!gate.country) {
      console.warn(
        "[attribution] territory not determined — capture gated (BR-USUARIO-033)",
        { edgeProven }
      );
    }
    if (!gate.allowed) return refuseWithoutConsent();

    // THE ADDRESS IS STILL READ, AND IT NO LONGER REACHES THE ROW — 2026-09-03,
    // card #682. It is the key of the rate limiter, which is the only barrier
    // in front of this `service_role` write, so removing the reading would
    // remove the barrier; what was removed is the COLUMN. This route observes
    // IPv6 and nothing else in practice (measured: 100% of real clicks arrive
    // in `2804:…`, because every hostname Cloudflare proxies publishes AAAA),
    // and IPv6 is no longer kept: the operator chose on 2026-09-03 to store the
    // less identifying family only, and an IPv4 under CGNAT points at a crowd
    // where a /64 prefix identifies a household. The one address that enters the
    // database now comes from `POST /api/attribution/ip`, reached over a
    // DNS-only host that can only answer A.
    //
    // `clientAddressOf` stays the single owner of the reading, shared with the
    // limiter — and `unknown` is a perfectly good counter key, so there is no
    // loopback fallback any more: it existed only because the column was NOT
    // NULL, and there is no column.
    const address = clientAddressOf(req.headers);

    // FIRST TOUCH, ENFORCED ON THE SERVER (BR-B2B-002). The browser also skips
    // the call when it already holds a cookie, but that check is a page away
    // from the write and this one is not: a visitor who scanned a second QR
    // gets the id of the FIRST click back, no second row is written, and the
    // second partner earns nothing from a visit it did not cause.
    //
    // AND IT IS DECIDED BEFORE THE WRITE BUDGET IS TOUCHED. Do not "simplify"
    // this by counting once, above both branches — that is what it used to do,
    // and it is a defect: a request that writes NOTHING was spending a slot of
    // the 30/h that belongs to first touches. Since the consent gate
    // (BR-USUARIO-033) put the reading of `tuggi_attr` behind a same-origin
    // verdict, `PartnerHero` posts on every load of an already-attributed
    // visitor, so on the shared Wi-Fi of a rental desk a reload was quietly
    // spending a stranger's first touch — and a first touch lost is a
    // commission lost, with nothing in the log to say so.
    //
    // The read is counted too, just against its own budget (`ECHO_BUCKET`), and
    // that is deliberate: the cookie is the client's, anyone can forge two
    // well-formed UUIDs and land here, so this branch may not be the one path
    // through a public door with no ceiling at all. What the forger gets is his
    // own value echoed back and no row; what he does not get is the write
    // budget of the address he shares. The reasoning for both numbers is in
    // `@/lib/attribution-limits`.
    const existing = parseAttribution(readCookie(req.headers.get("cookie"), ATTRIBUTION_COOKIE));
    if (existing) {
      const echo = await registerEchoAttempt(address);
      if (!echo.allowed) return tooManyRequests("too_many_reads", echo.retryAfterSeconds);

      return NextResponse.json(
        { click_id: existing.click_id, partner_id: existing.partner_id, first_touch: false },
        { status: 200 }
      );
    }

    const limit = await registerCaptureAttempt(address);
    if (!limit.allowed) return tooManyRequests("too_many_captures", limit.retryAfterSeconds);

    // The body is read AFTER the write is counted, so a flood of malformed
    // bodies is counted like any other attempt — same order as the other public
    // door of this site (`/api/partner-proposal`).
    const data = await req.json();
    const partnerId = typeof data?.partner_id === "string" ? data.partner_id.trim() : "";

    // Rejected before the write, not after: a malformed id can never match an
    // install, so the row would only ever be noise in the match window. The
    // internal Tuggi client is refused by the same call — it is a row in
    // partner.clients, it refers nobody, and a fingerprint for it is a row that
    // can only ever credit us to ourselves.
    if (!isAttributablePartnerId(partnerId)) {
      return NextResponse.json({ error: "Invalid partner_id" }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .schema("drive")
      .from("click_fingerprints")
      .insert([
        {
          partner_id: partnerId,
          // NO ADDRESS COLUMN AT ALL — see the reading above. `ip_address` was
          // written here until 2026-09-03 and is left untouched from now on;
          // it stays in the database only until the Edge Function has moved
          // onto `ip_address_v4`, and it is `data`'s to drop after that.
          user_agent: readText(data?.user_agent, "Unknown"),
          // Normalised on the way in, both fields, because the match compares
          // stored values: `pt-BR` here against `pt` from the app never fired,
          // and a literal "Unknown" timezone matched every other unknown.
          language: normalizeLanguage(data?.language),
          timezone: normalizeTimezone(data?.timezone),
        },
      ])
      // The id IS the deliverable: without it the site has nothing to put in
      // the store link, and the download goes out unattributed.
      .select("id")
      .single();

    if (error || !inserted?.id || !UUID_PATTERN.test(inserted.id)) {
      // No IP, no user agent: this log is read on an ordinary support
      // question, and the row it describes is personal data.
      console.error("Attribution Database Error:", error?.message ?? "insert returned no id");
      throw error ?? new Error("insert returned no id");
    }

    const clickId = inserted.id as string;

    const response = NextResponse.json(
      { click_id: clickId, partner_id: partnerId, first_touch: true },
      { status: 201 }
    );
    // Set here and not in the browser so the write is atomic with the row that
    // it names. Not HttpOnly on purpose: every store CTA of the site is a
    // client component and reads this to build its link.
    response.cookies.set({
      name: ATTRIBUTION_COOKIE,
      value: serializeAttribution({
        partner_id: partnerId,
        click_id: clickId,
        ts: new Date().toISOString(),
      }),
      maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      // Secure follows the SCHEME OF THE REQUEST and not NODE_ENV: production
      // is always https behind Cloudflare, so it is always set there, while a
      // local `next start` (and the e2e suite) speaks plain http, where a
      // Secure cookie is simply dropped and the whole flow becomes untestable
      // outside production.
      secure: isHttps(req),
    });
    return response;
  } catch (error: unknown) {
    console.error(
      "Attribution API Error:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}
