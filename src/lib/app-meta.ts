/**
 * Single source of truth for app-level metadata.
 * Reused by JSON-LD (structured data), /llms.txt, and (optionally) the
 * download CTAs that currently hardcode the store URLs.
 */

export const APP_NAME = "TUGGI";
export const SITE_URL = "https://www.tuggi.app";
export const SUPPORT_EMAIL = "support@tuggi.app";

export const APP_STORE_URL = "https://apps.apple.com/app/tuggi-drive/id6744379818";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.tuggidrive.app";

/** Public social profiles for schema.org `sameAs`. */
export const SOCIAL_PROFILES: string[] = [
  "https://www.linkedin.com/company/tuggi/",
  "https://www.instagram.com/tuggi_app",
  "https://www.tiktok.com/@tuggi_app",
  "https://www.facebook.com/people/Tuggi-Personal-tour-guide/61580839157589/",
];

/** Key product features (English) for SoftwareApplication.featureList. */
export const APP_FEATURES = [
  "Self-guided audio stories that trigger automatically by GPS location",
  "Hands-free, screen-off playback while you drive, walk, or cycle",
  "Works fully offline — download routes in advance, no roaming",
  "Audio in 8+ languages with synchronized closed captions",
  "Free to start; optional 7-day, 30-day, or annual Travel Pass",
];
