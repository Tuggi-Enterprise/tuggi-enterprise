import { NextResponse } from "next/server";
import { isFunnelKind, isFunnelStep } from "@/lib/partner-proposal/funnel";
import {
  FUNNEL_LIMIT_PER_WINDOW,
  recordFunnelEvent,
  registerFunnelAttempt,
} from "@/lib/partner-proposal/proposal-service";
import { clientAddressOf } from "@/lib/rate-limit";

/**
 * The server-side count of the proposal's funnel — one row per step reached, and nothing else.
 *
 * THIS IS AN ANONYMOUS WRITE WITH A `service_role` KEY BEHIND IT, like the proposal itself, so
 * it carries the same barrier — and it very nearly shipped without one.
 *
 * THE ARGUMENT THAT ALMOST WON, AND WHY IT IS WRONG. "What does an abuser get? Rows in a counting
 * table with two columns and no link to anybody — a skewed chart, and that is the whole damage."
 * The first half is true and the second is not: rows are DISK, and an unbounded anonymous INSERT
 * is unbounded disk on somebody else's card. The chart is the cheap loss.
 *
 * So the same counter guards it (`FUNNEL_LIMIT_PER_WINDOW` an hour, per address), and it costs no
 * new declaration: containing abuse on this public door is already the FOURTH declared purpose of
 * this collection (BR-USUARIO-030 item 4), and the key-hashed address it counts by is already the
 * mechanism that item 6 publishes, in four languages.
 *
 * A BUDGET OF ITS OWN, never the proposal's: `registerFunnelAttempt` passes its own `bucket`, and
 * the bucket goes into the hash. A tab left open on the form cannot spend the budget its own
 * submission needs.
 *
 * FAILING TO COUNT DROPS THE EVENT, and that is the right way round here. `registerAttempt` fails
 * closed, so an environment with no secret records no funnel at all — analytics that stops is a
 * blind chart, while analytics that writes without a limit is an open pipe.
 *
 * WHAT THE ROW ITSELF STILL CARRIES IS NOTHING ABOUT ANYBODY, and that is unchanged:
 *
 *  - the body is TWO values, both from closed vocabularies of this codebase (`FUNNEL_KINDS`,
 *    and a step of 1 to 4). Anything else is dropped, not stored;
 *  - the address is read to be counted and is never written — not into this row, not in a log;
 *    what lands in `partner.proposal_funnel_events` has two columns and neither is about a
 *    person;
 *  - there is no free text anywhere in the shape, so there is nothing to inject and nothing a
 *    later reader could be tempted to display.
 *
 * BR-USUARIO-030's fifth purpose is what allows this to exist (`funnel.ts` says who declared it
 * and when), and `Legal.Privacy.s1Item6` is the line that declares it. A test pins the two
 * together.
 *
 * Always 204, including for a body it dropped: the caller is a fire-and-forget `keepalive`
 * fetch that has nothing to do with an answer, and a status that varied would only teach a
 * prober the shape of the vocabulary.
 */
export async function POST(request: Request) {
  const limit = await registerFunnelAttempt(clientAddressOf(request.headers));
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  const body = await request.json().catch(() => null);
  const kind = (body as { kind?: unknown } | null)?.kind;
  const step = (body as { step?: unknown } | null)?.step;

  if (isFunnelKind(kind)) {
    await recordFunnelEvent(kind, isFunnelStep(step) ? step : null);
  }

  return new NextResponse(null, { status: 204 });
}
