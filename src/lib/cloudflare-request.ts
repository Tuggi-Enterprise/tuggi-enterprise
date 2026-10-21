/**
 * What Cloudflare's runtime says about the request being served, and whether
 * there is a Cloudflare runtime at all (tuggi-app#987).
 *
 * TWO HOSTS RUN THIS SAME CODE DURING THE CUT-OVER. The site moves from Vercel
 * to a Cloudflare Worker (`@opennextjs/cloudflare`), and the move is gradual:
 * the Worker is validated on workers.dev first, the DNS of tuggi.app changes
 * after that, and Vercel stays connected for seven days as the way back. Vercel
 * keeps building `main` the whole time, so every commit here runs on both. The
 * two hosts differ in exactly the facts this file answers for, and a reading
 * that is correct on one is spoofable on the other:
 *
 * - On the Worker, `request.cf` is filled by Cloudflare's runtime and no client
 *   can write it, and `cf-connecting-ip` is set by Cloudflare on every request
 *   it delivers ("No Worker subrequest: `cf-connecting-ip` reflects the
 *   client's IP address and the `x-real-ip` header is stripped",
 *   developers.cloudflare.com, "Cloudflare HTTP headers", consulted 2026-10-20).
 *   `x-forwarded-for` is NOT trustworthy there: Cloudflare appends to a header
 *   the client sent, so its first entry is the caller's choice.
 * - On Vercel, the floor is what Vercel overwrites (`x-forwarded-for`,
 *   `x-vercel-ip-country`), and the Cloudflare headers are honoured only
 *   against the edge proof of `src/lib/rate-limit.ts`.
 *
 * THE DETECTION IS THE RUNTIME, NOT A HEADER. The OpenNext worker wraps every
 * request in an AsyncLocalStorage holding `{ env, ctx, cf: request.cf }`
 * (`@opennextjs/cloudflare` 1.20.12, `dist/cli/templates/init.js`,
 * `runWithCloudflareRequestContext`), and `getCloudflareContext()` reads it.
 * Outside the Worker (Vercel, `next start`, the Playwright process) there is no
 * store and the call throws. Nothing a caller sends can create the store, which
 * is what makes it a proof and not a claim.
 *
 * The Vercel branch of every reader exists only for the cut-over. It goes away
 * when the Vercel project is disconnected, and with it the edge proof.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The two `request.cf` fields this site reads. */
export interface CloudflareRequestFacts {
  /**
   * `request.cf.country`: ISO-3166-1 alpha-2, or Cloudflare's own `XX` and
   * `T1`, which `src/lib/territory.ts` refuses as countries.
   */
  country: string | null;
  /**
   * `request.cf.city`, as plain UTF-8. Unlike Vercel's `x-vercel-ip-city` it
   * is not percent-encoded, because it is a runtime value and not a header.
   */
  city: string | null;
}

/** Only what is read here; the full type is `IncomingRequestCfProperties`. */
type ReadCfFields = Record<string, unknown> & { country?: unknown; city?: unknown };

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * `request.cf` of the request being served when this code runs inside our
 * Worker, and `null` anywhere else.
 *
 * A Worker request whose `cf` lacks a field answers that field as `null`, never
 * `null` for the whole object: absence of a datum on the Worker must not be
 * mistaken for "not on the Worker", which would fall back to headers a client
 * can write there.
 */
export function cloudflareRequestFacts(): CloudflareRequestFacts | null {
  let cf: ReadCfFields | undefined;
  try {
    cf = getCloudflareContext<ReadCfFields>().cf;
  } catch {
    return null;
  }
  return { country: nonEmpty(cf?.country), city: nonEmpty(cf?.city) };
}

/** Whether this code is serving a request inside our Cloudflare Worker. */
export function runsOnCloudflareWorker(): boolean {
  return cloudflareRequestFacts() !== null;
}
