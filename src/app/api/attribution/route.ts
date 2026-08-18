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
import { clientAddressOf, registerAttempt } from "@/lib/rate-limit";

/**
 * The capture of a partner click — BR-B2B-002, and the contract is
 * `docs/contracts/atribuicao-de-parceiro.md`.
 *
 * It does three things, and the order matters:
 *
 *   1. counts the caller (this is a public door in front of a `service_role`
 *      write, and it had no barrier at all);
 *   2. writes ONE row in `drive.click_fingerprints` and answers with its id —
 *      the `click_id`, which is what travels through the store instead of the
 *      partner's UUID (contract §1);
 *   3. keeps that first touch in a cookie and NEVER overwrites it, which is
 *      what makes the rule first touch instead of last touch (contract §9).
 *
 * service_role, deliberately — not the publishable key `/api/leads` uses.
 *
 * `drive.click_fingerprints` does accept an anonymous insert today
 * (`WITH CHECK (true)`), so the swap would appear to work. It would also mean
 * this row could be written without passing through the handler below, and the
 * handler is the whole point: it is what takes the IP from the edge header
 * instead of from the caller, what normalises the fields the match compares,
 * and what refuses the second partner of the same visitor. Narrowing this key
 * is a separate card with a `WITH CHECK` of its own to write first.
 *
 * Built at module scope: a missing variable fails the build, not the request.
 */
const supabase = getSupabaseClient("serviceRole");

/** Free-text fields are stored as written; cap them so a row stays a row. */
const MAX_FIELD_LENGTH = 512;

/**
 * How often one address may open a click row: 30 in an hour.
 *
 * The legitimate shape is one visitor, one row, once — the cookie below means
 * a returning visitor does not write again. The generous ceiling is for the
 * hotel lobby and the restaurant Wi-Fi, where a whole coach of tourists scans
 * the same printed QR from behind one NAT address within minutes. Mass
 * planting of rows to farm the probabilistic match is orders of magnitude
 * above this.
 */
const CAPTURE_LIMIT_PER_WINDOW = 30;
const CAPTURE_WINDOW_SECONDS = 60 * 60;

/** Its own budget, so a tourist's scan cannot lock a partner out of the proposal form. */
const CAPTURE_BUCKET = "attribution";

function readText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_FIELD_LENGTH) : fallback;
}

/**
 * The visitor's IP, taken from the edge and from nowhere else.
 *
 * `clientAddressOf` is the single owner of that reading, shared with the rate
 * limiter so the row and the counter can never disagree about who called. It
 * prefers `CF-Connecting-IP` — Cloudflare proxies our deployment, and before
 * that every row here stored a Cloudflare edge address, personal data with no
 * use — but ONLY when the request proves it came through that edge, because
 * the origin is also reachable without Cloudflare and there the header is
 * whatever the caller typed. The rule and the proof live there, once. The body
 * is never read for this either: accepting `client_ip` once let anyone pair a
 * partner of their choosing with a victim's address and take the commission
 * for someone else's install.
 *
 * The column is NOT NULL, so a request with no edge header at all (only
 * possible off-platform) stores loopback rather than refusing the capture.
 */
/** Whether the visitor reached us over TLS — the edge says so in a header. */
function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto) return proto === "https";
  return new URL(req.url).protocol === "https:";
}

function readClientIp(req: Request): string {
  const address = clientAddressOf(req.headers);
  return address === "unknown" ? "127.0.0.1" : address;
}

export async function POST(req: Request) {
  try {
    const address = readClientIp(req);

    const limit = await registerAttempt({
      bucket: CAPTURE_BUCKET,
      clientAddress: address,
      windowSeconds: CAPTURE_WINDOW_SECONDS,
      maxAttempts: CAPTURE_LIMIT_PER_WINDOW,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "too_many_captures", retryAfterSeconds: limit.retryAfterSeconds },
        { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
      );
    }

    const data = await req.json();
    const partnerId = typeof data?.partner_id === "string" ? data.partner_id.trim() : "";

    // Rejected before the write, not after: a malformed id can never match an
    // install, so the row would only ever be noise in the match window. The
    // internal Tuggi client is refused by the same call — it is a row in
    // core.clients, it refers nobody, and a fingerprint for it is a row that
    // can only ever credit us to ourselves.
    if (!isAttributablePartnerId(partnerId)) {
      return NextResponse.json({ error: "Invalid partner_id" }, { status: 400 });
    }

    // FIRST TOUCH, ENFORCED ON THE SERVER (BR-B2B-002). The browser also skips
    // the call when it already holds a cookie, but that check is a page away
    // from the write and this one is not: a visitor who scanned a second QR
    // gets the id of the FIRST click back, no second row is written, and the
    // second partner earns nothing from a visit it did not cause.
    const existing = parseAttribution(readCookie(req.headers.get("cookie"), ATTRIBUTION_COOKIE));
    if (existing) {
      return NextResponse.json(
        { click_id: existing.click_id, partner_id: existing.partner_id, first_touch: false },
        { status: 200 }
      );
    }

    const { data: inserted, error } = await supabase
      .schema("drive")
      .from("click_fingerprints")
      .insert([
        {
          partner_id: partnerId,
          ip_address: address,
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
