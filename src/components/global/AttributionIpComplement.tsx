"use client";

import { useAttributionIpComplement } from "@/lib/conversionHooks";

/**
 * Mounts the IPv4 complement of BR-B2B-002 on every page of the site, and
 * renders nothing.
 *
 * WHY IT IS GLOBAL AND NOT ONLY ON THE PARTNER PAGE. `PartnerHero` calls the
 * same hook with the id its own capture just returned, which covers the tourist
 * scanning the QR right now. This mount covers the other half: a browser
 * captured BEFORE the complement existed carries a `tuggi_attr` whose row has
 * no address at all, and it will never see `/d/<slug>` again — it comes back
 * through the home page, the download page or a destination article. Without a
 * mount that lives in the layout, that row stays empty for the whole 30 days it
 * has left.
 *
 * IT HAS TO SIT INSIDE `AttributionGateProvider`, and that is not tidiness: the
 * hook reads `useAttributionClickId`, whose whole gate is the context this
 * provider carries (BR-USUARIO-033). Mounted outside it, the context default is
 * the closed answer and this component would simply never fire — silently,
 * which is the failure mode the provider's own comment warns about.
 *
 * One request per page load at most, shared with `PartnerHero` through a module
 * flag in `conversionHooks.ts`; the server write is write-once anyway.
 */
export function AttributionIpComplement() {
  useAttributionIpComplement();
  return null;
}
