/**
 * Geo lookup for the base-market price. Answers the country code, or
 * `null` when there is no usable one.
 *
 * **No fallback country, ever** — BR-MONETIZACAO-069. This route used to answer
 * with the United States when the header was absent (local dev, a proxy that
 * strips it, a request that never went through Vercel's edge). That was
 * harmless while the page published no price; with the price back, "I do not
 * know where you are" would publish the US amounts as a binding offer to
 * someone who is not there. Absence of information is not a market — and the
 * guard in tests/e2e/base-market-price.spec.ts reads this file for a country
 * literal, which is why the code here names none.
 *
 * The reading itself is NOT here: `src/lib/territory.ts` owns which header
 * says where a visitor is, because the consent gate of the attribution capture
 * (BR-USUARIO-033) asks the same question and two answers to it is exactly the
 * kind of split this repo has paid for before. This route used to run on
 * `runtime = "edge"` and pass `false` for the edge proof, because verifying it
 * is built on `node:crypto`. The Cloudflare adapter does not support the edge
 * runtime ("The edge runtime is not supported yet with
 * `@opennextjs/cloudflare`", opennext.js.org/cloudflare/get-started, consulted
 * 2026-10-20), so it runs on Node now (#987) and asks for the proof like the
 * consent gate does. On the Worker the proof is moot: the country is
 * `request.cf.country`.
 *
 * The shape of the answer is deliberate: `country` is `string | null`, so the
 * client has one thing to read and no sentinel to interpret.
 *
 * Keeps /drive statically generated — only this endpoint is request-time.
 */
import { requestCameThroughOurEdge } from "@/lib/rate-limit";
import { countryOf } from "@/lib/territory";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return Response.json(
    { country: countryOf(request.headers, requestCameThroughOurEdge(request.headers)) },
    { headers: { "cache-control": "no-store" } }
  );
}
