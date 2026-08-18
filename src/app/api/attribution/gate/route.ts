/**
 * May this browser's first touch be READ? — BR-USUARIO-033, items 1, 2 and 5.
 *
 * WHY A ROUTE EXISTS FOR A QUESTION `/api/attribution` ALREADY ANSWERS. The
 * POST gates the CAPTURE: no row, no cookie. It cannot gate what happens on a
 * later visit, and that is the case this route is here for — a visitor whose
 * `tuggi_attr` was planted lawfully in Brazil and who then opens the site in
 * Portugal. Art. 5(3) of the ePrivacy Directive reaches "qualquer armazenamento
 * ou ACESSO a informação no equipamento terminal" (BR-USUARIO-033, item 3, the
 * EU/EEA line): the lawfulness of the write does not travel with the visitor,
 * so the READ of that cookie is itself a gated operation, and so is the
 * pasteboard write the App Store CTA makes out of it.
 *
 * WHY IT IS NOT `/api/geo`, WHICH ALSO ANSWERS A COUNTRY. That route runs on
 * `runtime = "edge"` and therefore passes `edgeProven = false` to `countryOf`:
 * it cannot verify our Cloudflare proof, because that verification is built on
 * `node:crypto`. Without the proof the answer falls back to
 * `x-vercel-ip-country`, which for a South American visitor served from the
 * Miami PoP reads `US` — the PERMISSIVE side of this gate. A price published
 * one market off is a bug; a legal gate that opens on the same mistake is the
 * defect item 2 exists to forbid. So this route runs on Node and asks the very
 * same `attributionGateOf` the capture asks. There is no second source of
 * truth about territory anywhere on this site — `src/lib/territory.ts` is it.
 *
 * WHAT IT DOES NOT ANSWER, ON PURPOSE. Not the country, not the consent flag,
 * not why. One boolean, so the client has one thing to read and no room to
 * recombine the parts into a decision of its own — a gate decided on the
 * client is a gate the client edits.
 */
import { NextResponse } from "next/server";
import { attributionGateOf } from "@/lib/consent";
import { requestCameThroughOurEdge } from "@/lib/rate-limit";

/**
 * Node, and it is load-bearing rather than a default left alone: the edge
 * runtime has no `node:crypto`, so `requestCameThroughOurEdge` cannot run
 * there and the route would silently degrade to the permissive reading above.
 */
export const runtime = "nodejs";
/** Per visitor, per request. `no-store` below is the half Cloudflare reads. */
export const dynamic = "force-dynamic";

export function GET(req: Request): Response {
  const edgeProven = requestCameThroughOurEdge(req.headers);
  const gate = attributionGateOf(req.headers, edgeProven);

  // THE SIGNAL BR-USUARIO-033 ASKS FOR, and it is not a copy of the POST's:
  // that one only fires on a partner page, and this route runs on every page
  // of the site, which is where a first touch is now READ. Vercel's network
  // sets the country header on every request, so in production a line here
  // means something is broken and the FREQUENCY is the finding — a handful is
  // a proxy or a bot, a flood is the edge configuration. No IP, no user agent,
  // no partner: the counting item 7 permits is aggregate, and nothing here can
  // re-find the person.
  if (!gate.country) {
    console.warn("[attribution] territory not determined — gated (BR-USUARIO-033)", { edgeProven });
  }

  return NextResponse.json(
    { allowed: gate.allowed },
    // Every page of this site is CDN-cached; this answer is the one thing on
    // it that is per-visitor, and a cached verdict would hand one tourist's
    // permission to the next one behind the same PoP.
    { headers: { "cache-control": "no-store" } }
  );
}
