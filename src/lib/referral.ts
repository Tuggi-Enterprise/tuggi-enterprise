import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase-server";
import { PLAY_STORE_URL } from "@/lib/app-meta";

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
 * The shape of a code — BR-MONETIZACAO-085 item 2: six characters, upper case, from an
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
 * The shape of an @ — BR-USUARIO-050 item 1.b, the same test as
 * `drive.public_identity_value_ok('nickname', ...)`: letters and digits, with
 * one separator (`.`, `_`, `-`) at a time and never at either end. The length
 * bounds are below. Like the code pattern, it only decides what is worth
 * asking the database about; whether the name points to anyone is the
 * database's answer.
 */
export const INVITE_NAME_PATTERN = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const INVITE_NAME_MIN_LENGTH = 3;
const INVITE_NAME_MAX_LENGTH = 30;

/**
 * What a `/c/` link carries — BR-MONETIZACAO-085 item 2.a: `tuggi.app/c/@nome`
 * since 2026-11-08, and `tuggi.app/c/<code>` for good (item 2). A leading `@`
 * is always a name; without it, only a code. A bare name (`/c/ana`) is not a
 * link anybody shares, so it is not guessed at.
 */
export type InviteSegment = { via: "code"; code: string } | { via: "name"; name: string };

export function parseInviteSegment(raw: string): InviteSegment | null {
  let segment: string;
  try {
    // `@` may arrive percent-encoded (`%40`), depending on who built the link.
    segment = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (segment.startsWith("@")) {
    const name = segment.slice(1);
    const fits =
      name.length >= INVITE_NAME_MIN_LENGTH &&
      name.length <= INVITE_NAME_MAX_LENGTH &&
      INVITE_NAME_PATTERN.test(name);
    return fits ? { via: "name", name } : null;
  }
  const code = normalizeReferralCode(segment);
  return code ? { via: "code", code } : null;
}

/**
 * What the page may know about an invite. Only the nickname of whoever
 * invited — never an id, an e-mail or a count (BR-USUARIO-042).
 *
 * `shared` is the text the page shows next to Copy and hands to the app: the
 * code when the link carried a code, and the inviter's CURRENT @ when it
 * carried a name (BR-MONETIZACAO-085 item 2.b). The current one and not the
 * one in the URL: an old @ of a common account stops resolving after 14 days
 * (item 2.d), and a spelling variant is the same key but not the same text.
 *
 * There is no "exhausted" state for the friend: after the inviter's tenth
 * stamp the invite keeps working for whoever pastes it (#836, update of
 * 2026-10-04). The page renders `valid` or the inactive variant, nothing else,
 * and the inactive one is the same for an unknown @, an @ without an owner
 * and an invalid code (item 2.b).
 */
export type ReferralInvite =
  | { status: "valid"; via: InviteSegment["via"]; shared: string; nickname: string }
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
 * one-row array (a `returns table`): the contract names the fields, not the
 * SQL return type. Anything that is not explicitly `valid` with a usable
 * nickname is the inactive page: an invitation we cannot attribute to a name
 * is not one we show.
 */
export function parseReferralRow(data: unknown, segment: InviteSegment): ReferralInvite {
  const row = (Array.isArray(data) ? data[0] : data) as PublicReferralRow | null | undefined;
  if (!row || typeof row !== "object") return INVALID;
  if (row.status !== "valid") return INVALID;
  if (typeof row.nickname !== "string") return INVALID;
  const nickname = row.nickname.trim();
  if (!nickname || nickname.length > NICKNAME_MAX_LENGTH) return INVALID;
  const shared = segment.via === "code" ? segment.code : `@${nickname}`;
  return { status: "valid", via: segment.via, shared, nickname };
}

/** The argument of `get_referral_code_public`: the code, or the name with its `@` (contract §7.5). */
function lookupArgument(segment: InviteSegment): string {
  return segment.via === "code" ? segment.code : `@${segment.name}`;
}

/**
 * The invite behind a `/c/<code>` or `/c/@nome` segment.
 *
 * `cache` dedupes the call between `generateMetadata` and the page, so one
 * request is one RPC. A database error renders the inactive page — which
 * still carries the store badges — rather than a 500: the visitor wanted the
 * app, and the page without the invite is still a way to it.
 */
export const getReferralInvite = cache(async (rawSegment: string): Promise<ReferralInvite> => {
  const segment = parseInviteSegment(rawSegment);
  if (!segment) return INVALID;

  try {
    const { data, error } = await getSupabaseClient("publishable")
      .schema("drive")
      .rpc("get_referral_code_public", { p_code: lookupArgument(segment) });

    if (error) {
      // The invite is not logged: a code or an @ is a per-user identifier, and
      // the error code alone says whether the function is missing or failing.
      console.error("get_referral_code_public failed:", error.code ?? "unknown");
      return INVALID;
    }
    return parseReferralRow(data, segment);
  } catch (err) {
    console.error("get_referral_code_public threw:", (err as Error)?.name ?? "unknown");
    return INVALID;
  }
});

/**
 * The canonical address of an invite: `/c/@nome` for a name, `/c/<code>` for a
 * code. It is what the desktop QR encodes and what the share tags carry, so a
 * spelling variant or an old @ is never echoed back.
 */
export function invitePath(invite: Extract<ReferralInvite, { status: "valid" }>): string {
  return `/c/${invite.shared}`;
}

/**
 * The Play link of the invite page — BR-MONETIZACAO-085 item 2.e.i. Play hands
 * `referrer` to the app on its first launch, and the app reads
 * `tuggi_invite=<code or @nome>` from it to open the step "Alguém te indicou o
 * Tuggi?" already filled in (contract `indicacao.md` §7.5). Same shape as the
 * route page's `routePlayStoreUrl`. No partner token rides here: this page
 * does not run the partner capture, and the two programmes are independent.
 *
 * Without an invite (the inactive page) the link keeps only the `stamps` tag.
 */
export function invitePlayStoreUrl(shared?: string | null): string {
  const tags = "utm_source=tuggi_site&utm_medium=referral&utm_campaign=stamps";
  const referrer = shared ? `${tags}&tuggi_invite=${shared}` : tags;
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer)}`;
}
