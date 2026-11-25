import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The partner's brand on its page `tuggi.app/@nome` (#1254): the approved logo
 * and, with the CMS switch on, the colour pair. Contract
 * `docs/contracts/tuggi-do-parceiro.md` §2 and §3.
 *
 * BR-B2B-070 item 2: the brand exists only with a logo the CMS approved. The
 * public read `drive.resolve_partner_brand_public_v1` answers one row for a
 * partner with the brand and zero rows for everything else, so "no brand" is
 * the ordinary answer here. `partner.clients.avatar_url` is not read.
 *
 * Imports only types, so a spec can run it in Node against a double.
 */

export interface PartnerBrand {
  /** A signed URL of the approved logo in the private bucket `partner-logos`. */
  logoUrl: string;
  /** `#RRGGBB` pair the server computed; null when the switch is off or the colour was refused (DS-MARCA-002). */
  color: { background: string; ink: string } | null;
}

export const PARTNER_LOGO_BUCKET = "partner-logos";

/**
 * Lifetime of the logo's signed URL, in seconds. It has to outlive the page's
 * cached read of the partner (`PARTNER_CACHE_SECONDS`, 5 minutes), and that read
 * can be served past its age when a refresh fails (`lookupPartnerSlug`), so the
 * margin is wide: a day. The object is public by policy for the approved logo
 * (contract §3), so a longer link reveals nothing a shorter one would not.
 */
export const PARTNER_LOGO_URL_SECONDS = 86400;

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

type BrandRow = {
  logo_path?: string | null;
  brand_color?: string | null;
  brand_ink?: string | null;
};

/**
 * The brand of the partner whose @ is `handle`, or null. Fails soft: a read
 * that did not answer (the rate limit `TGB70`, the function missing) is
 * logged and the page shows the name without a logo, which is the page of
 * every partner without the brand.
 *
 * `supabase` is a client on the publishable key: the read is public by design
 * (contract §2), and the service role would skip nothing it needs.
 */
export async function fetchPartnerBrand(supabase: SupabaseClient, handle: string): Promise<PartnerBrand | null> {
  const input = handle.trim();
  if (!input) return null;
  try {
    const { data, error } = await supabase
      .schema("drive")
      .rpc("resolve_partner_brand_public_v1", { p_input: input });
    if (error) {
      console.warn(`drive.resolve_partner_brand_public_v1: ${error.code} ${error.message}`);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : null) as BrandRow | null | undefined;
    const logoPath = row?.logo_path?.trim();
    if (!logoPath) return null;

    const { data: signed, error: signError } = await supabase.storage
      .from(PARTNER_LOGO_BUCKET)
      .createSignedUrl(logoPath, PARTNER_LOGO_URL_SECONDS);
    if (signError || !signed?.signedUrl) {
      console.warn(`partner-logos sign: ${signError?.message ?? "no url"}`);
      return null;
    }

    const background = row?.brand_color?.trim() ?? "";
    const ink = row?.brand_ink?.trim() ?? "";
    // The two travel together or not at all; no client computes the ink (DS-MARCA-002).
    const color = HEX_COLOUR.test(background) && HEX_COLOUR.test(ink) ? { background, ink } : null;
    return { logoUrl: signed.signedUrl, color };
  } catch (err) {
    console.warn("Error reading the partner brand:", err);
    return null;
  }
}
