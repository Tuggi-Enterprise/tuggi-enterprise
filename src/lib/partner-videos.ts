/**
 * The partner videos of the `/partners` hub — §3 of
 * `docs/design/spec-lp-parcerias-conversao-2026-08.md` (card #306), which moved
 * the block from a section of its own into the hero: the H1 states that the
 * traveller is already on the merchant's street, and a real narrated drive is
 * the evidence of that sentence rather than an illustration of it.
 *
 * **The list is empty, and the empty list is the specification, not a
 * pending.** SC 1.2.2 *Captions (Prerecorded)* is level A: no id enters here
 * before a person has written the caption track in the language of the
 * narration — YouTube's automatic caption does not count — and the
 * narration-language mapping is still open (§3.6 and §8.1 of the spec).
 *
 * `PARTNER_VIDEOS.length === 0` has exactly one effect, and the hub reads it in
 * one place: no `media` reaches `SegmentHero`, so the hero renders in a single
 * column, byte for byte as it did before this card. It degrades to the current
 * page, never to a grey rectangle — "a block with no data does not render;
 * never an orphan heading, never an empty box, never *coming soon*" is the rule
 * of the template (spec #195 §2.2).
 */

export type PartnerVideo = {
  /** Stable identifier. Analytics value and React key. Never translated. */
  id: string;
  /**
   * Language of the narration, ISO 639-1. **Not** the interface locale, and it
   * is not expected to match one: the site speaks four languages and the clips
   * include a fifth. A visitor who sees a language the page does not speak is
   * seeing the reach of the product, which is the point (spec §3.4).
   */
  audioLocale: string;
  /** The YouTube id, never the whole URL. */
  youtubeId: string;
  /** Poster under /public, 16:9, with width and height declared. */
  poster: string;
  /** Intrinsic width of the poster, so the 16:9 box reserves itself. CLS zero. */
  posterWidth: number;
  /** Intrinsic height of the poster. */
  posterHeight: number;
  /**
   * Length of the clip, in seconds. Rendered as `m:ss` by
   * `formatClipDuration` — a property of the file, not a figure about the
   * product, which is why it lives here and not in `product-facts.ts`, and why
   * no digit of it ever reaches a message file (spec §3.3).
   */
  durationSeconds: number;
};

export const PARTNER_VIDEOS: readonly PartnerVideo[] = [];

/** `m:ss`, from a duration in seconds. Locale-independent by design. */
export function formatClipDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * The name of the narration language, in the language of the page.
 *
 * `Intl.DisplayNames`, never an index into `Languages.langs`: that key is a
 * flat array of ten names with no ISO code beside them, so mapping by position
 * would break silently the day somebody reorders the list. Computed on the
 * server — the caller is a server component — so the browser's ICU data cannot
 * disagree with the build's.
 *
 * When `of()` hands the code back unchanged (an ICU build that does not know
 * it), the code goes out upper-cased rather than lower-case noise.
 */
export function narrationLanguageLabel(pageLocale: string, audioLocale: string): string {
  const display = new Intl.DisplayNames([pageLocale], { type: "language" });
  const name = display.of(audioLocale) ?? audioLocale;
  if (name.toLowerCase() === audioLocale.toLowerCase()) return audioLocale.toUpperCase();
  return name.charAt(0).toLocaleUpperCase(pageLocale) + name.slice(1);
}

/**
 * Which clip opens: the one narrated in the language of the page if there is
 * one, English otherwise, and the first entry if there is no English either.
 */
export function initialPartnerVideo(
  videos: readonly PartnerVideo[],
  pageLocale: string
): PartnerVideo | undefined {
  return (
    videos.find((video) => video.audioLocale === pageLocale) ??
    videos.find((video) => video.audioLocale === "en") ??
    videos[0]
  );
}
