/**
 * Counts one scan of a kit piece: `/d/{slug}?k={piece}` (#815, BR-B2B-050 item 4).
 *
 * The QR of each kit piece carries `k` so the partner's portal can show which piece is read
 * (`core.portal_get_submission.activation_scans`). The row is written by
 * `partner.record_activation_scan`, which stores slug, piece and time — no IP, no user, no
 * user agent — and answers `false` without error for an unknown piece or an unknown/retired
 * slug. Contract: docs/contracts/places-portal-rascunho.md §9.
 *
 * A public URL writing with `service_role` gets the site's rate limit in front, per address
 * and in its own bucket (src/lib/rate-limit.ts). Counting is best effort: any failure — the
 * limit, the counter, or the function not existing before its migration is applied — skips
 * the count and never the page.
 */

import { clientAddressOf, registerAttempt } from "@/lib/rate-limit";
import { getSupabaseClient } from "@/lib/supabase-server";

/** a sticker · d display · p post · s story · q standalone QR. Same list as `activation_scans_piece_check`. */
export const KIT_PIECES = ["a", "d", "p", "s", "q"] as const;
export type KitPiece = (typeof KIT_PIECES)[number];

export const SCAN_BUCKET = "activation-scan";
export const SCAN_WINDOW_SECONDS = 60 * 60;
/**
 * Per address per hour. A table of tourists on one restaurant Wi-Fi scanning the same display
 * stays well under it; a script refreshing the URL to inflate a partner's count does not.
 */
export const SCAN_LIMIT_PER_WINDOW = 30;

export function kitPieceOf(value: unknown): KitPiece | null {
  return typeof value === "string" && (KIT_PIECES as readonly string[]).includes(value)
    ? (value as KitPiece)
    : null;
}

export async function recordActivationScan(
  slug: string,
  piece: KitPiece,
  requestHeaders: Headers
): Promise<void> {
  try {
    const decision = await registerAttempt({
      bucket: SCAN_BUCKET,
      clientAddress: clientAddressOf(requestHeaders),
      windowSeconds: SCAN_WINDOW_SECONDS,
      maxAttempts: SCAN_LIMIT_PER_WINDOW,
    });
    if (!decision.allowed) return;

    const { error } = await getSupabaseClient("serviceRole")
      .schema("partner")
      .rpc("record_activation_scan", { p_slug: slug, p_piece: piece });
    if (error) console.error("[activation-scan] not recorded:", error.code ?? "unknown");
  } catch {
    console.error("[activation-scan] not recorded");
  }
}
