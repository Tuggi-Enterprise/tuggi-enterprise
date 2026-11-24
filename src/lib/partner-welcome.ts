import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST filter values are interpolated into `or=(...)`, so only a UUID gets in. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asUuid = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && UUID.test(trimmed) ? trimmed : null;
};

/**
 * Which POI's text and audio the partner page (`/@nome`, `/d/{slug}`, BR-B2B-037 item 2) plays as
 * its welcome. The one place that decides it: the partner pass and the coupon pass both call it.
 *
 *  1. the chosen welcome POI (`welcome_poi_id`), only while it is on the air: approved and active.
 *     A POI the curator deactivated must not keep speaking on the page;
 *  2. else the partner's own POI on the air, latest approved first. SAME PICK AND ORDER as
 *     `partner.partner_place_id` and the social networks of `partner.resolve_public_page`
 *     (db-tuggiApp migrations): change one, change the other;
 *  3. else null, and the page renders without a welcome.
 *
 * One read. A failed read is logged and answers null: the welcome fails soft, the partner never.
 */
export async function resolveWelcomePoiId(
  supabase: SupabaseClient,
  clientId: string | null | undefined,
  chosenPoiId: string | null | undefined
): Promise<string | null> {
  const client = asUuid(clientId);
  const chosen = asUuid(chosenPoiId);
  const terms = [client && `partner_client_id.eq.${client}`, chosen && `id.eq.${chosen}`].filter(Boolean);
  if (!terms.length) return null;

  const { data, error } = await supabase
    .schema("core")
    .from("attractions")
    .select("id")
    .eq("approved", true)
    .eq("is_active", true)
    .or(terms.join(","))
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true });

  if (error) {
    console.error("Error choosing the partner welcome POI:", error.code, error.message);
    return null;
  }

  const onAir = ((data ?? []) as { id: string }[]).map((row) => row.id);
  if (chosen && onAir.includes(chosen)) return chosen;
  // The chosen one is not on the air, so every row left is the partner's own, in the resolver's order.
  return onAir[0] ?? null;
}
