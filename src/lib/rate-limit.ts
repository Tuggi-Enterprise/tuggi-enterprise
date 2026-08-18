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

import { createHmac } from "node:crypto";
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
 * Which address a request came from, and it is read in the topology we
 * actually run.
 *
 * CLOUDFLARE PROXIES VERCEL for tuggi.app — `dig` answers Cloudflare ranges and
 * the response carries `server: cloudflare` next to `x-vercel-id`. So
 * `x-forwarded-for` at the Function is the Cloudflare edge, and
 * `CF-Connecting-IP` is the visitor (developers.cloudflare.com, "Restoring
 * original visitor IPs"). Reading the wrong one put 172.69/172.71/162.158
 * addresses in every stored fingerprint and gave every visitor behind one edge
 * node the same rate-limit bucket.
 *
 * `x-forwarded-for` is a list when there are proxies in front and the first
 * entry is the client; `x-real-ip` is the local fallback. None of the three is
 * taken from the request body — a caller choosing its own address is the spoof
 * that moved a partner's commission once already.
 */
export function clientAddressOf(headers: Headers): string {
  const candidates = [
    headers.get("cf-connecting-ip"),
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
