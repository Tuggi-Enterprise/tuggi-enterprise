/**
 * The one barrier in front of the site's anonymous `service_role` writes.
 *
 * Two public doors write to the database with a key that ignores RLS: the
 * partnership proposal (`/api/partner-proposal`) and the attribution capture
 * (`/api/attribution`). They had one counter between them and it lived inside
 * the proposal feature, so the second door was built without one. The
 * mechanism moved here and the proposal re-exports it — same function, same
 * secret, one owner.
 *
 * WHAT IS SHARED IS THE MECHANISM, NOT THE BUDGET. Every caller names a
 * `bucket`, and the bucket goes into the hash: a tourist scanning a QR cannot
 * spend the proposal budget of the restaurant owner sitting at the same Wi-Fi,
 * and neither can lock the other out.
 *
 * THE COUNT IS THE DATABASE'S. An in-process `Map` on Vercel is a brake on a
 * double-click and never a barrier: instances are per burst, and a caller that
 * spreads requests meets a fresh counter almost every time.
 *
 * The RPC and its table are still named `..._partner_form_...`, from when the
 * proposal was the only door. They are a counter of `(hash, timestamp)` and
 * nothing in them is about a form; renaming both is a `data` task and is
 * deliberately not faked here with an alias that would hide which object is
 * actually written.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabaseClient } from "@/lib/supabase-server";

/**
 * The environment variable holding the server-side secret of the key-hash.
 * Named because the log line has to say WHICH variable is missing — an
 * operator reading "not configured" learns nothing.
 */
export const HASH_SECRET_VAR = "PARTNER_FORM_HASH_SECRET";

export interface RateLimitDecision {
  allowed: boolean;
  /** How long until the oldest attempt in the window falls out of it. */
  retryAfterSeconds: number;
}

/**
 * The environment variable holding the secret that PROVES a request reached
 * this Function through our own Cloudflare edge, and the header that carries
 * it.
 *
 * A Transform Rule on Cloudflare SETS `x-tuggi-edge` on every request it
 * forwards to the origin (Cloudflare, *Request header modification*, consulted
 * 2026-08-18: "Set the value of an HTTP request header to a literal string
 * value, overwriting its previous value"). Overwriting is the load-bearing
 * word: a visitor who sends the header themselves has it replaced on the
 * proxied path, and a caller who reaches the origin directly does not know the
 * value to send.
 *
 * Both are exported because the operator has to configure the two ends by
 * name, and `docs/dev/2026-08-18-borda-confiavel-cf-connecting-ip.md` cites
 * these constants rather than repeating the strings.
 */
export const EDGE_SECRET_VAR = "TUGGI_EDGE_SHARED_SECRET";
export const EDGE_PROOF_HEADER = "x-tuggi-edge";

/**
 * Read once, at module scope — the same shape as every other configured value
 * in this repo (`src/lib/supabase-server.ts`): what a request is allowed to
 * assert cannot depend on when it arrived.
 *
 * UNSET IS A LEGAL STATE, and it is the SAFE one: with no secret there is no
 * proof to check, so `cf-connecting-ip` is ignored entirely and the address
 * falls back to what Vercel guarantees. The inverse — trusting the header
 * because the variable is missing — is the misconfiguration that reopens the
 * spoof, so it is not reachable from here.
 */
const EDGE_SHARED_SECRET = (process.env[EDGE_SECRET_VAR] ?? "").trim();

/**
 * A per-process key for the comparison below. It is not a secret of the
 * product and never leaves this process: HMAC-ing both sides under it makes
 * them fixed-length, which is what `timingSafeEqual` requires, and hides the
 * LENGTH of the presented value as well as its bytes. Comparing with `===`
 * returns on the first differing byte and hands an attacker the value one
 * character at a time.
 */
const COMPARISON_KEY = randomBytes(32);

function equalsInConstantTime(presented: string, expected: string): boolean {
  const digest = (value: string) =>
    createHmac("sha256", COMPARISON_KEY).update(value, "utf8").digest();
  return timingSafeEqual(digest(presented), digest(expected));
}

/** Logged once per process: a flood of identical lines helps nobody. */
let missingEdgeSecretReported = false;

/**
 * Whether this request carries the proof that it came through our edge.
 *
 * No proof is not an error — the origin is reachable directly, and that path
 * is served normally, just without any claim about who the caller is.
 */
function cameThroughOurEdge(headers: Headers, edgeSharedSecret: string): boolean {
  const presented = headers.get(EDGE_PROOF_HEADER)?.trim();
  if (!presented) return false;

  if (!edgeSharedSecret) {
    if (!missingEdgeSecretReported) {
      missingEdgeSecretReported = true;
      console.error(
        `[rate-limit] ${EDGE_SECRET_VAR} is not set — ${EDGE_PROOF_HEADER} cannot be verified, ` +
          `so cf-connecting-ip is being ignored and x-forwarded-for is used instead`
      );
    }
    return false;
  }

  return equalsInConstantTime(presented, edgeSharedSecret);
}

/**
 * Which address a request came from, and it is read in the topology we
 * actually run — which has TWO ways in, not one.
 *
 * WHY `CF-Connecting-IP` IS NOT TRUSTWORTHY ON ITS OWN, and this is the part
 * that reads backwards. Cloudflare does proxy tuggi.app, and on that path
 * `x-forwarded-for` at the Function is the Cloudflare edge while
 * `CF-Connecting-IP` is the visitor (developers.cloudflare.com, "Restoring
 * original visitor IPs"). That is true and it is not enough: THE ORIGIN IS
 * ALSO REACHABLE WITHOUT CLOUDFLARE. Measured 2026-08-18 —
 * `https://tuggi-enterprise.vercel.app/` answers 307 with `server: Vercel` and
 * no `cf-ray`. On that path `CF-Connecting-IP` is an ordinary client header
 * and arrives exactly as the caller typed it, so reading it first let anyone
 * file a capture under a victim's address and, because the rate-limit bucket
 * is keyed on the same value, mint a fresh 30/h budget per request by changing
 * one header.
 *
 * So the header is honoured only against PROOF: `x-tuggi-edge` carrying the
 * shared secret above. Without the proof the order is the one Vercel
 * guarantees — `x-forwarded-for`, then `x-real-ip` (vercel.com/docs/headers/
 * request-headers, consulted 2026-08-18: Vercel "overwrite[s] the
 * `X-Forwarded-For` header and do[es] not forward external IPs… to prevent IP
 * spoofing", and `x-real-ip` "is identical").
 *
 * `x-forwarded-for` is a list when there are proxies in front and the first
 * entry is the client. None of the three is taken from the request body
 * — a caller choosing its own address is the spoof that moved a partner's
 * commission once already.
 *
 * @param edgeSharedSecret Only the test passes this. Production callers pass
 * the headers and nothing else, so the secret is the one read from the
 * environment at module scope; the parameter exists because the four cases
 * (valid proof, absent secret, wrong proof, no proof at all) cannot otherwise
 * be exercised in one process. It is never derived from the request.
 */
export function clientAddressOf(
  headers: Headers,
  edgeSharedSecret: string = EDGE_SHARED_SECRET
): string {
  const candidates = [
    cameThroughOurEdge(headers, edgeSharedSecret) ? headers.get("cf-connecting-ip") : null,
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-real-ip"),
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    // A Node server in front (self-hosted, or `next start`) reports IPv4 in the
    // IPv6-mapped form. The app sends the plain one and the install match is a
    // string equality on this value, so the prefix comes off here — once, for
    // the counter and for the stored row alike.
    if (trimmed) return trimmed.replace(/^::ffff:/i, "");
  }
  return "unknown";
}

/**
 * Whether this request proved it reached us through our own Cloudflare edge.
 *
 * The same proof `clientAddressOf` demands, exposed because a SECOND fact of
 * the request depends on it: which country header may be believed
 * (`src/lib/territory.ts`). One proof, read one way — a caller that decided
 * "came through the edge" on its own would be the second opinion this module
 * exists to prevent.
 *
 * @param edgeSharedSecret Only the test passes this; see `clientAddressOf`.
 */
export function requestCameThroughOurEdge(
  headers: Headers,
  edgeSharedSecret: string = EDGE_SHARED_SECRET
): boolean {
  return cameThroughOurEdge(headers, edgeSharedSecret);
}

/**
 * The counter's key for one address inside one bucket: HMAC-SHA-256 under a
 * server secret.
 *
 * WHY A SECRET AND NOT A PLAIN DIGEST. A bare `sha256(ip)` is reversible by
 * anybody who gets the table: the whole IPv4 space is 2^32 digests, minutes of
 * laptop time, and IPv6 assignments in practice are not much better. The
 * secret takes that offline attack away.
 *
 * The default empty bucket reproduces the pre-existing digest exactly, so the
 * rows already counted for the proposal door keep their key.
 */
export function hashClientAddress(clientAddress: string, bucket = ""): string | null {
  const secret = (process.env[HASH_SECRET_VAR] ?? "").trim();
  if (!secret) return null;

  const key = bucket ? `${bucket}:${(clientAddress ?? "").trim()}` : (clientAddress ?? "").trim();
  return createHmac("sha256", secret).update(key, "utf8").digest("hex");
}

/**
 * Counts this address's attempts in this bucket and says whether another one
 * is allowed.
 *
 * FAIL CLOSED, for two reasons. An RPC that errors means nobody counted — and
 * an uncounted write to a `service_role` table from an anonymous caller is the
 * thing this function exists to prevent. A missing server secret means the key
 * could only be built by dropping it, which would silently downgrade every row
 * already written into the brute-forceable shape this stopped being. Both
 * refuse; the route turns that into "try again in a moment", never into a
 * silent allow.
 */
export async function registerAttempt(options: {
  bucket: string;
  clientAddress: string;
  windowSeconds: number;
  maxAttempts: number;
}): Promise<RateLimitDecision> {
  const { bucket, clientAddress, windowSeconds, maxAttempts } = options;
  const clientHash = hashClientAddress(clientAddress, bucket);
  if (!clientHash) {
    console.error(`[rate-limit] ${HASH_SECRET_VAR} is not configured — ${bucket} was refused`);
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  const { data, error } = await getSupabaseClient("serviceRole")
    .schema("core")
    .rpc("record_partner_form_attempt", {
      p_client_hash: clientHash,
      p_window_seconds: windowSeconds,
      p_max_attempts: maxAttempts,
    });

  const decision = Array.isArray(data) ? data[0] : data;

  if (error || !decision || typeof decision.allowed !== "boolean") {
    console.error(`[rate-limit] ${bucket} limit could not be consulted`);
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  return {
    allowed: decision.allowed,
    retryAfterSeconds:
      typeof decision.retry_after_seconds === "number"
        ? decision.retry_after_seconds
        : windowSeconds,
  };
}
