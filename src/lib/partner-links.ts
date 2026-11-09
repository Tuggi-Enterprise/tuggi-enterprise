/** Contacts of a partner, as the CMS and the partner page resolver send them, turned into links for its page. */

/** A URL without a protocol still has to open as one. */
export function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** A social value may be a full URL or a bare @handle. A link target, or null for a bare handle (platform unknown). */
export function socialHref(social: string): string | null {
  if (/^https?:\/\//i.test(social)) return social;
  if (social.includes(".")) return `https://${social}`;
  return null;
}

/** What the page prints for a social value: the URL without its scheme, or the handle with its @. */
export function formatSocial(social: string): string {
  if (/^https?:\/\//i.test(social)) return social.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return social.startsWith("@") ? social : `@${social}`;
}

/**
 * The partner's social networks, BR-B2B-061 item 6: a closed list, in the
 * order the page shows them (6.d). A new network is an amendment of the rule,
 * and then one more entry here.
 */
export const PARTNER_SOCIAL_NETWORKS = ["instagram", "tiktok", "youtube", "facebook"] as const;
export type PartnerSocialNetwork = (typeof PARTNER_SOCIAL_NETWORKS)[number];

/** The stored name per network, `@` left out and lowercase. A network without one is absent. */
export type PartnerSocial = Partial<Record<PartnerSocialNetwork, string>>;

/** A Facebook profile that has only its numeric id. */
const FACEBOOK_ID = /^[0-9]{5,20}$/;

/**
 * The shape of a stored name per network, the same the database judges with
 * `core.social_handle_ok` (contract `banco-para-app.md` Parte 34, the one
 * source of the format). The database already refuses anything else; this
 * keeps a value the page cannot vouch for out of an address it builds.
 */
const HANDLE_FORMAT: Record<PartnerSocialNetwork, (handle: string) => boolean> = {
  instagram: (h) => /^[a-z0-9._]{1,30}$/.test(h),
  tiktok: (h) => /^[a-z0-9._]{2,24}$/.test(h),
  youtube: (h) => /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/.test(h),
  facebook: (h) => FACEBOOK_ID.test(h) || (/^[a-z0-9.]{5,50}$/.test(h) && !/^[0-9]+$/.test(h)),
};

/**
 * The `social` object of `partner.resolve_public_page`, read with distrust:
 * absent, `null`, an unknown network or a name out of its network's format is
 * left out, never turned into a link.
 */
export function partnerSocialOf(value: unknown): PartnerSocial {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: PartnerSocial = {};
  for (const network of PARTNER_SOCIAL_NETWORKS) {
    const handle = raw[network];
    if (typeof handle === "string" && HANDLE_FORMAT[network](handle)) out[network] = handle;
  }
  return out;
}

/** The profile address of a stored name (Parte 34). A Facebook numeric id opens by `profile.php`. */
export function socialProfileUrl(network: PartnerSocialNetwork, handle: string): string {
  switch (network) {
    case "instagram":
      return `https://www.instagram.com/${handle}`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    case "facebook":
      return FACEBOOK_ID.test(handle)
        ? `https://www.facebook.com/profile.php?id=${handle}`
        : `https://www.facebook.com/${handle}`;
  }
}

export interface PartnerSocialLink {
  network: PartnerSocialNetwork;
  url: string;
}

/** The links the page draws, in the fixed order of BR-B2B-061 item 6.d; a network without a name has none. */
export function partnerSocialLinks(social: PartnerSocial): PartnerSocialLink[] {
  return PARTNER_SOCIAL_NETWORKS.flatMap((network) => {
    const handle = social[network];
    return handle ? [{ network, url: socialProfileUrl(network, handle) }] : [];
  });
}
