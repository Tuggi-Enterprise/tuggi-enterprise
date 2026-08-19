import { NextResponse } from "next/server";
import {
  clientAddressOf,
  createProposal,
  lookupTaxId,
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
 *   3. A CNPJ that already exists in `partner.clients` is refused. That read is the only thing this
 *      surface asks of the client table, and it answers `registered`/`free`/`unknown` — never a
 *      column.
 *   4. Nothing here writes `partner.clients`. The submission is a proposal, and the promotion into
 *      the live registration is an authenticated act of the team, in the CMS (BR-B2B-026, item 4).
 *
 * THE ORDER OF THE FOUR IS PART OF THE DESIGN, not a style. The limit is registered before the
 * body is even parsed, so a flood of malformed bodies is counted like any other attempt; and the
 * CNPJ is looked up before the INSERT, so a company already registered never produces a row.
 * Removing either step leaves this file reading the same and behaving like an open pipe — which
 * is why both are pinned by mutation in `tests/e2e/partner-proposal.spec.ts`.
 *
 * A CNPJ that already has a PENDING PROPOSAL is accepted and becomes a second proposal: the
 * conference screen in the CMS shows the duplicate and a person decides. Answering "you already
 * sent this" would turn a public number into a lookup for who is talking to the Tuggi.
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

  const taxId = await lookupTaxId(answers.tax_id ?? "");
  if (taxId === "registered") {
    // 409 and not 400: nothing the person typed is wrong. The field is named so the form can
    // put the message beside the CNPJ instead of at the top of a page they already left.
    return NextResponse.json({ error: "tax_id_registered", field: "tax_id" }, { status: 409 });
  }
  if (taxId === "unknown") {
    return NextResponse.json({ error: "submit_failed" }, { status: 503 });
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
