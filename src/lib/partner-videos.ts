/**
 * The partner videos of the `/partners` hub — §4 of
 * `docs/design/spec-lp-parcerias-2026-08.md`.
 *
 * **The list is empty, and the empty list is the specification, not a
 * pending.** The URLs exist but the narration-language mapping and the
 * captions are not resolved, and SC 1.2.2 *Captions (Prerecorded)* is level A:
 * no URL enters here before a person has checked the caption in the language of
 * the narration — YouTube's automatic caption does not count. What ships with
 * the URLs is a block of its own (#294 comment); what ships now is the shape of
 * the data, so that card costs zero decisions.
 *
 * `PARTNER_VIDEOS.length === 0` has one visible effect today, and the hub reads
 * it in one place: the hero publishes **no secondary call to action**. A grey
 * rectangle reading "video coming soon" on a conversion page looks like a
 * loading defect and spends credibility instead of buying it — "a block with no
 * data does not render; never an orphan heading, never an empty box, never
 * *coming soon*" is already the rule of the template (spec #195 §2.2).
 */

export type PartnerVideo = {
  /** Stable identifier. i18n key and event value. Never translated. */
  id: string;
  /** Language of the narration, ISO 639-1. **Not** the interface locale. */
  audioLocale: string;
  /** The YouTube id, never the whole URL. */
  youtubeId: string;
  /** Poster under /public, 16:9, with width and height declared. */
  poster: string;
};

export const PARTNER_VIDEOS: readonly PartnerVideo[] = [];
