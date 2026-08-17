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
 * `core.clients` IS REACHABLE FROM HERE, and in one direction only: `lookupTaxId` asks whether a
 * CNPJ is already registered and gets back one of three words. It selects `id`, returns no
 * column to the caller, and has no sibling that writes. The submission is still a proposal, and
 * the promotion into the live record is still an authenticated act of the team in the CMS
 * (BR-B2B-026, item 4).
 *
 * Logs carry the outcome and nothing else — no e-mail, no CNPJ, no answers, no address.
 */

import { createHmac } from "node:crypto";
import { getSupabaseClient } from "@/lib/supabase-server";
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
 * A CNPJ already in `core.clients` is a partner the team has registered, and a second
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
 * `tax_id_normalized` IS NOT HERE, AND MAY NEVER BE. That column is filled by a column DEFAULT —
 * measured on the live database on 2026-08-17, and *not* `GENERATED ALWAYS`, which is what a
 * reader assumes from the name. A DEFAULT only applies when the INSERT omits the column, so a
 * caller that sends it wins: the row keeps whatever the caller said, the deduplication key for
 * that company becomes whatever a client typed, and the CMS's `tax_id_normalized=eq.<key>`
 * filter stops finding the duplicate. The write reads identically in both cases, which is why
 * this is pinned by a test and not by care.
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
  const clientHash = hashClientAddress(clientAddress);
  if (!clientHash) {
    console.error(`[partner-proposal] ${HASH_SECRET_VAR} is not configured — the submission was refused`);
    return { allowed: false, retryAfterSeconds: SUBMISSION_WINDOW_SECONDS };
  }

  const { data, error } = await service().rpc("record_partner_form_attempt", {
    p_client_hash: clientHash,
    p_window_seconds: SUBMISSION_WINDOW_SECONDS,
    p_max_attempts: SUBMISSION_LIMIT_PER_WINDOW,
  });

  const decision = Array.isArray(data) ? data[0] : data;

  if (error || !decision || typeof decision.allowed !== "boolean") {
    console.error("[partner-proposal] submission limit could not be consulted");
    return { allowed: false, retryAfterSeconds: SUBMISSION_WINDOW_SECONDS };
  }

  return {
    allowed: decision.allowed,
    retryAfterSeconds:
      typeof decision.retry_after_seconds === "number"
        ? decision.retry_after_seconds
        : SUBMISSION_WINDOW_SECONDS,
  };
}

/**
 * The environment variable holding the server-side secret of the key-hash below. Named here
 * because the log line has to say WHICH variable is missing — an operator reading "not
 * configured" learns nothing. It has to be set on Vercel for this repository, and it is the same
 * value the CMS used to hold: the rows in `core.partner_form_attempts` were keyed with it, and a
 * different secret re-keys everybody, which costs at most one window of counting.
 */
export const HASH_SECRET_VAR = "PARTNER_FORM_HASH_SECRET";

/**
 * The counter's key for one address: HMAC-SHA-256 of the address under a server secret.
 *
 * WHY A SECRET AND NOT A PLAIN DIGEST. A bare `sha256(ip)` is reversible by anybody who gets the
 * table: the whole IPv4 space is 2^32 digests, which is minutes of laptop time, and IPv6
 * assignments in practice are not much better. The secret takes that offline attack away —
 * without it there is nothing to enumerate against.
 *
 * WHAT IT IS STILL NOT. This is pseudonymisation, not anonymisation, and calling it anonymous
 * would be the same overclaim with a longer key: the same address always produces the same value
 * (that is the whole point — the counter has to recognise a repeat caller), so the rows remain
 * linkable to each other, and whoever holds the secret can re-derive the key for an address they
 * already suspect. What it buys is that the raw address is not in the table, not kept in this
 * process and not in any log line, and that the table alone reveals nobody. `Legal.Privacy.s1Item5`
 * publishes exactly that, in four languages (BR-USUARIO-028 item 1, BR-USUARIO-030 item 6).
 *
 * NULL, NEVER AN UNSALTED FALLBACK. Returning a plain digest when the secret is missing would be
 * worse than never having had one: the door would stay open, the rows would look identical to the
 * good ones, and nobody would find out until somebody dumped the table. The caller refuses
 * instead — `registerSubmissionAttempt`, and the type is what forces it to.
 */
export function hashClientAddress(clientAddress: string): string | null {
  const secret = (process.env[HASH_SECRET_VAR] ?? "").trim();
  if (!secret) return null;

  return createHmac("sha256", secret).update((clientAddress ?? "").trim(), "utf8").digest("hex");
}

/**
 * Which address a request came from. `x-forwarded-for` is a list when there are proxies in
 * front, and the FIRST entry is the client.
 *
 * The address is read, hashed and dropped inside one call chain: it is never stored, never
 * logged and never put in the row — the same promise `/api/leads` keeps about the IP.
 */
export function clientAddressOf(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || "unknown";
}
