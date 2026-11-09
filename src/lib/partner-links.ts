/** Contacts of a partner as the CMS stores them, turned into links for its page. */

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
