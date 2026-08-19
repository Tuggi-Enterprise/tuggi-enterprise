import { NextResponse } from "next/server";
import {
  clientAddressOf,
  createProposal,
  registerSubmissionAttempt,
} from "@/lib/partner-proposal/proposal-service";
import { normalizeAnswers, validateAnswers } from "@/lib/partner-proposal/schema";

/**
 * The public partnership proposal — one address, one method: send the proposal (#341, moved
 * here from the CMS by #396).
 *
 * Public on purpose: the person filling this in is a restaurant owner who has no CMS login and
 * never will (BR-B2B-026, item 2). There is no invite token either — the same link goes to
 * every partner and, since #396, the landing page links to it — so this route has NO CREDENTIAL
 * OF ANY KIND. It is a door on the internet in front of a `service_role` write, and that changes
 * what has to be true here rather than what the route does:
 *
 *   1. A durable per-address limit, counted by the database, decides before anything else. It is
 *      the barrier and there is no second one; see `registerSubmissionAttempt`. A refusal it
 *      could not decide (no secret, RPC down) answers 503 and never 429 — #400.
 *   2. The body is validated against the field allowlist before anything is persisted — unknown
 *      keys are stripped, so `commission_rate` posted by hand goes nowhere.
 *   3. THIS ROUTE DOES NOT READ `partner.clients` AT ALL, and that is the point of item 3 rather
 *      than an omission. It used to: a CNPJ already registered was refused with a 409, and the
 *      lookup that decided it was the only thing this surface asked of the client table.
 *   4. Nothing here writes `partner.clients`. The submission is a proposal, and the promotion into
 *      the live registration is an authenticated act of the team, in the CMS (BR-B2B-026, item 4).
 *
 * ---------------------------------------------------------------------------------------------
 * WHY THE 409 LEFT, on 2026-08-19 — and it is the same reason it existed
 * ---------------------------------------------------------------------------------------------
 *
 * The refusal was there to stop one company being registered twice. It never did that: the
 * guarantee lived in two application reads — this one and `buildPromotionPlan` in the CMS — and
 * that is a race (read then insert is not atomic) which also missed the four other write paths
 * into `partner.clients`. Meanwhile it was the one control anybody on the internet could probe,
 * and what a probe bought was a public oracle of who is a client of the Tuggi.
 *
 * The guarantee moved to where it cannot fail: `clients_tax_id_normalized_uk`, a UNIQUE index on
 * the same normalised expression this code used to compare by (migration `20260819190000`). The
 * database refuses the second row now, on every path, without anybody being told anything.
 *
 * SO THIS ROUTE ANSWERS THE SAME BYTES TO EVERY VALID CNPJ, and the lookup went with the branch
 * rather than staying to mark the row: a read kept for any reason at all leaves a difference in
 * TIMING, which is a narrower oracle and still an oracle. There is no `partner.clients` read here
 * to be timed.
 *
 * A CNPJ that already has a pending proposal, or that is already a client, is accepted and becomes
 * another proposal. The conference screen in the CMS recognises both — `findClientByTaxId` turns
 * the promotion into an UPDATE of the existing record — and a person decides. What the person on
 * the form is spared is a refusal at field 24; what they are offered instead is a line at the top
 * of the page, shown to EVERY visitor so it discloses nothing, telling an existing partner to talk
 * to us rather than fill this in (`lede`, and `DS-COMPONENTE-026`).
 *
 * Logs carry the outcome and nothing else — no e-mail, no CNPJ, no answers, no address.
 *
 * The shape of `answers`, and who reads it, is `docs/contracts/partner-proposal-answers.md`.
 */
export async function POST(req: Request) {
  const limit = await registerSubmissionAttempt(clientAddressOf(req.headers));

  // A COUNTER THAT COULD NOT ANSWER IS NOT A LIMIT THAT WAS REACHED — #400, second defect.
  // `registerSubmissionAttempt` fails closed for two different events: the window really is
  // spent, or `PARTNER_FORM_HASH_SECRET` is missing and nothing counted. Both refuse, and until
  // 2026-08-19 both refused with the SAME 429 body, so an environment without the variable
  // turned away every proposal while telling each owner to wait a few minutes for something
  // that never passes with time. The status is what separates them now, and the two copies on
  // the other end say different things because they are different problems.
  if (!limit.allowed && limit.reason === "unavailable") {
    return NextResponse.json({ error: "submit_failed" }, { status: 503 });
  }
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "too_many_submissions", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const answers = normalizeAnswers((body as { answers?: unknown }).answers);
  if (!answers) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const problems = validateAnswers(answers);
  if (problems.length > 0) {
    return NextResponse.json({ error: "invalid_answers", problems }, { status: 400 });
  }

  const outcome = await createProposal(answers);
  if (!outcome.ok) {
    console.error("[partner-proposal] proposal insert failed");
    return NextResponse.json({ error: "submit_failed" }, { status: 503 });
  }

  return NextResponse.json({
    state: "submitted",
    // Echoed from what was just accepted, so the confirmation names the address the team will
    // write to and the person can see a typo while it still costs nothing.
    contactEmail: answers.representative_email ?? null,
  });
}

async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
