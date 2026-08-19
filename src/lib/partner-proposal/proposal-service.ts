/**
 * The proposal's data access — the only part of the site that reaches `core` with a
 * `service_role` key on behalf of an anonymous caller.
 *
 * WHY `service_role` AND NOT THE PUBLISHABLE KEY. Measured on the live database on 2026-08-17,
 * not assumed: the five tables of this pipeline (`partner_form_submissions`,
 * `partner_form_attempts`, `partner_contracts`, `partner_contract_acceptances`,
 * `partner_triage_refusals`) have RLS on with ZERO policies and grants only to `service_role`,
 * and `core.record_partner_form_attempt` is SECURITY INVOKER. The publishable key runs as
 * `anon` and reaches none of it: the INSERT would answer 42501 and the rate-limit RPC would
 * answer nothing at all — which is the one failure this surface may not have, because failing
 * to count is failing to limit. Swapping this for a `SECURITY DEFINER` RPC granted to `anon`
 * was considered in #396 and deferred by scope, not by merit.
 *
 * WHAT KEEPS A BYPASS-RLS KEY BEHIND A PUBLIC DOOR HONEST — three things that are code, not
 * intent:
 *
 *  1. The API here is closed and narrow. There is no "run this query" export. Every function
 *     names one operation, and none of them can be pointed at another table.
 *  2. The only public write is one INSERT into one table, of a value the caller has already had
 *     stripped to an allowlist (`normalizeAnswers`).
 *  3. That INSERT is behind a durable per-address limit decided by the database, not by this
 *     process — see `registerSubmissionAttempt`.
 *
 * `partner.clients` IS REACHABLE FROM HERE, and in one direction only: `lookupTaxId` asks whether a
 * CNPJ is already registered and gets back one of three words. It selects `id`, returns no
 * column to the caller, and has no sibling that writes. The submission is still a proposal, and
 * the promotion into the live record is still an authenticated act of the team in the CMS
 * (BR-B2B-026, item 4).
 *
 * Logs carry the outcome and nothing else — no e-mail, no CNPJ, no answers, no address.
 */

import { getSupabaseClient } from "@/lib/supabase-server";
import { registerAttempt } from "@/lib/rate-limit";
import type { PartnerAnswers } from "./schema";
import { cnpjLookupValues } from "@/lib/cnpj";

const SCHEMA = "core";
const SUBMISSIONS = "partner_form_submissions";
const CLIENTS = "clients";

/**
 * `.schema("core")` on every call, and never a bare client: `getSupabaseClient` builds one with
 * no `db.schema`, which makes supabase-js assert `public` — a schema where none of these tables
 * exists, so the error would be "relation does not exist" and would read like a missing
 * migration.
 */
function service() {
  return getSupabaseClient("serviceRole").schema(SCHEMA);
}

// ── The CNPJ is the deduplication key ───────────────────────────────────────────────────

/**
 * Whether this CNPJ is already a client of ours — `registered`, `free`, or `unknown` when the
 * question could not be asked.
 *
 * A CNPJ already in `partner.clients` is a partner the team has registered, and a second
 * registration of the same company through a public form would either duplicate the record or
 * invite somebody to overwrite it. It is refused at the door.
 *
 * A CNPJ that only has a PENDING PROPOSAL is not refused — it becomes another proposal, and a
 * human resolves the duplicate on the conference screen. Refusing there would let anyone with a
 * CNPJ (a public number) find out whether that company is talking to the Tuggi.
 *
 * WHICH SHAPES COUNT AS THE SAME CNPJ is `cnpjLookupValues`, and the CMS promotion asks the same
 * question of the same column with the same helper: the two ends of this feature must not
 * disagree about what "already registered" means.
 */
export type TaxIdLookup = "registered" | "free" | "unknown";

export async function lookupTaxId(taxId: string): Promise<TaxIdLookup> {
  const candidates = cnpjLookupValues(taxId);
  if (candidates.length === 0) return "free";

  const { data, error } = await service().from(CLIENTS).select("id").in("tax_id", candidates).limit(1);

  // `unknown` and never `free`: a lookup that did not answer is not permission to write. A CNPJ
  // that got through here would become a duplicate client record somebody has to unpick by
  // hand, and the route turns this into "try again", not into a silent second registration.
  if (error) {
    console.error("[partner-proposal] tax id lookup failed");
    return "unknown";
  }

  return Array.isArray(data) && data.length > 0 ? "registered" : "free";
}

// ── The submission ──────────────────────────────────────────────────────────────────────

export type CreateProposalOutcome =
  | { ok: true; submissionId: string }
  | { ok: false; reason: "write_failed" };

/**
 * The columns this route writes, and the whole list. Exported because a test asserts the INSERT
 * payload against it rather than against a comment.
 *
 * `tax_id_normalized` IS NOT HERE, AND MAY NEVER BE. That column is `GENERATED ALWAYS ... STORED`
 * — measured on the live database on 2026-08-17 (`attgenerated = 's'`, `column_default = NULL`),
 * and migration `20260814140000_issue341_proposta_do_parceiro_em_formulario_unico` says the same,
 * probe included. #396 wrote "column DEFAULT" here and #398 put it back: the difference matters
 * to whoever reads this before adding a fifth column. An INSERT that supplies a generated column
 * is REFUSED by Postgres (428C9), so the deduplication key cannot be overwritten by a caller —
 * this list stays four names long because the write has no business naming the key, and the test
 * exists so a fifth name is a red build here rather than a 500 in production.
 */
export const SUBMISSION_COLUMNS = ["answers", "status", "submitted_at", "updated_at"] as const;

/**
 * Turns the answers into a submitted proposal. One INSERT, no read before it, nothing to
 * update: every submission is a new proposal, including the second one for a CNPJ that already
 * has one waiting.
 *
 * There is no `draft` row — the draft lives on the person's device (`draft-mirror.ts`) precisely
 * because there is no credential that could address a server-side one.
 */
export async function createProposal(answers: PartnerAnswers): Promise<CreateProposalOutcome> {
  const now = new Date().toISOString();

  const { data, error } = await service()
    .from(SUBMISSIONS)
    .insert(buildSubmissionRow(answers, now))
    .select("id")
    .single();

  if (error || !data) return { ok: false, reason: "write_failed" };
  return { ok: true, submissionId: data.id as string };
}

/**
 * The row, built in one place so the test can read the same function the route runs. Written as
 * a literal and never spread from the caller: a spread is how a column nobody meant to write
 * arrives from a request body.
 */
export function buildSubmissionRow(answers: PartnerAnswers, nowIso: string) {
  return {
    answers,
    status: "submitted",
    submitted_at: nowIso,
    updated_at: nowIso,
  };
}

// ── The abuse limit, decided by the database ────────────────────────────────────────────

/**
 * How many submissions one address may make, and over how long.
 *
 * Ten in an hour: an owner with several places fills a handful in one sitting and never notices
 * this, while a script gets 10 rows instead of an unbounded number. The numbers are arguments of
 * the call and not constants in SQL so that "how often may a stranger write to this table" is
 * answerable from the route that allows it.
 */
export const SUBMISSION_LIMIT_PER_WINDOW = 10;
export const SUBMISSION_WINDOW_SECONDS = 60 * 60;

export interface SubmissionLimitDecision {
  allowed: boolean;
  /** How long until the oldest attempt in the window falls out of it. */
  retryAfterSeconds: number;
}

/**
 * Counts this address's submissions and says whether another one is allowed.
 *
 * THIS IS THE BARRIER, AND IT IS THE ONLY ONE. The CMS had an in-process `Map` composer in front
 * of it; that did not come across, and dropping it is the decision rather than an oversight. On
 * Vercel every instance keeps its own `Map`, instances are created and destroyed per request
 * burst, and a caller that spreads its requests hits a fresh counter almost every time — so it
 * was a brake on one accidental double-click and never a barrier, while reading like one.
 *
 * The count is the database's, in one statement: PostgREST cannot count-then-insert without a
 * race, so the RPC does both and returns the verdict.
 *
 * THE ADDRESS IS KEY-HASHED, and this docstring will not claim more than that — see
 * `hashClientAddress`.
 *
 * FAIL CLOSED, for two reasons. An RPC that errors means nobody counted — and an uncounted write
 * to a `service_role` table from an anonymous caller is the thing this function exists to
 * prevent. A missing server secret means the key could only be built by dropping it, which would
 * silently downgrade every row already written into the brute-forceable shape this stopped being.
 * Both refuse; the route turns that into "try again in a moment", never into a silent allow.
 */
export async function registerSubmissionAttempt(
  clientAddress: string
): Promise<SubmissionLimitDecision> {
  // The mechanism is `@/lib/rate-limit`, shared with the other public door of
  // this site; the bucket is empty here so the hash of an address stays byte
  // for byte what it was, and the rows already counted keep their key.
  return registerAttempt({
    bucket: "",
    clientAddress,
    windowSeconds: SUBMISSION_WINDOW_SECONDS,
    maxAttempts: SUBMISSION_LIMIT_PER_WINDOW,
  });
}

/**
 * The key-hash, the address reader and the name of the secret's variable now live in
 * `@/lib/rate-limit`: the attribution capture is a second anonymous door into a `service_role`
 * write, and two implementations of "who is calling and how often" is how one of them ends up
 * without a barrier. Re-exported, not re-implemented — the docstrings of the mechanism are there.
 *
 * WHAT IT IS STILL NOT. This is pseudonymisation, not anonymisation, and calling it anonymous
 * would be the same overclaim with a longer key: the same address always produces the same value
 * (that is the whole point — the counter has to recognise a repeat caller), so the rows remain
 * linkable to each other, and whoever holds the secret can re-derive the key for an address they
 * already suspect. What it buys is that the raw address is not in the table, not kept in this
 * process and not in any log line, and that the table alone reveals nobody. `Legal.Privacy.s1Item5`
 * publishes exactly that, in four languages (BR-USUARIO-028 item 1, BR-USUARIO-030 item 6).
 *
 * The secret has to be set on Vercel for this repository, and it is the same value the CMS used
 * to hold: the rows in `partner.partner_form_attempts` were keyed with it, and a different secret
 * re-keys everybody, which costs at most one window of counting.
 */
export { HASH_SECRET_VAR, clientAddressOf, hashClientAddress } from "@/lib/rate-limit";
