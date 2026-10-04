import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase-server";

/**
 * The invite page's one door to the app database — card #840, contract
 * `docs/contracts/indicacao.md` (written by the `data` with #839).
 *
 * Every read of `drive.get_referral_code_public` goes through this module and
 * nothing else in the site calls it, so a change of shape in the contract is a
 * change in one file.
 *
 * WHY THE PUBLISHABLE KEY. The function is SECURITY DEFINER and executable by
 * `anon` (#839 item 3), so the page needs no power above that. It is also the
 * only read on the page: unlike `/d/<slug>`, nothing here touches a table that
 * `anon` cannot read. A public, unauthenticated URL that takes an arbitrary
 * code is exactly where a key that bypasses RLS should not be.
 */

/**
 * The shape of a code — #836/#839: six characters, upper case, from an
 * alphabet without the ambiguous 0/O and 1/I.
 *
 * It is checked before the database is asked, so a URL that can never be a
 * code (a typo, a scanner, `/c/../../etc`) costs nothing upstream and is never
 * forwarded as an argument. The alphabet here is the *widest* one the cards
 * allow: if the generator also drops L, every code it mints still matches.
 */
export const REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Codes are case-insensitive (#839 item 1) and travel in WhatsApp messages,
 * where a keyboard may lowercase them. Returns null when the segment can never
 * be a code.
 */
export function normalizeReferralCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(code) ? code : null;
}

/**
 * What the page may know about an invite. Only the nickname of whoever
 * invited — never an id, an e-mail or a count (BR-USUARIO-042).
 *
 * There is no "exhausted" state for the friend: after the inviter's tenth
 * stamp the code keeps working for whoever pastes it (#836, update of
 * 2026-10-04). The page renders `valid` or the inactive variant, nothing else.
 */
export type ReferralInvite =
  | { status: "valid"; code: string; nickname: string }
  | { status: "invalid" };

const INVALID: ReferralInvite = { status: "invalid" };

/** Longest nickname rendered; a longer value is treated as a broken row, not shown. */
const NICKNAME_MAX_LENGTH = 40;

interface PublicReferralRow {
  status?: unknown;
  nickname?: unknown;
}

/**
 * Reads the RPC envelope. Accepts a single object (a `jsonb` return) or a
 * one-row array (a `returns table`), because #839 is being written in parallel
 * and the contract names the fields, not the SQL return type. Anything that is
 * not explicitly `valid` with a usable nickname is the inactive page: an
 * invitation we cannot attribute to a name is not one we show.
 */
export function parseReferralRow(data: unknown, code: string): ReferralInvite {
  const row = (Array.isArray(data) ? data[0] : data) as PublicReferralRow | null | undefined;
  if (!row || typeof row !== "object") return INVALID;
  if (row.status !== "valid") return INVALID;
  if (typeof row.nickname !== "string") return INVALID;
  const nickname = row.nickname.trim();
  if (!nickname || nickname.length > NICKNAME_MAX_LENGTH) return INVALID;
  return { status: "valid", code, nickname };
}

/**
 * The invite behind a `/c/<code>` segment.
 *
 * `cache` dedupes the call between `generateMetadata` and the page, so one
 * request is one RPC. A database error renders the inactive page — which
 * still carries the store badges — rather than a 500: the visitor wanted the
 * app, and the page without the code is still a way to it.
 */
export const getReferralInvite = cache(async (rawCode: string): Promise<ReferralInvite> => {
  const code = normalizeReferralCode(rawCode);
  if (!code) return INVALID;

  try {
    const { data, error } = await getSupabaseClient("publishable")
      .schema("drive")
      .rpc("get_referral_code_public", { p_code: code });

    if (error) {
      // The code is not logged: it is a per-user identifier, and the error
      // code alone says whether the function is missing or failing.
      console.error("get_referral_code_public failed:", error.code ?? "unknown");
      return INVALID;
    }
    return parseReferralRow(data, code);
  } catch (err) {
    console.error("get_referral_code_public threw:", (err as Error)?.name ?? "unknown");
    return INVALID;
  }
});
