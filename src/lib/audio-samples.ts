/**
 * The site's audio sample catalogue — the facts about the files, in one place.
 *
 * Spec §1.3 (docs/design/spec-repaginacao-site-2026-08.md): the page chooses
 * which samples it shows, but no page writes `/audio/sampleN-*.mp3` down a
 * second time. Both the home and /drive used to carry their own copy of the
 * paths *and* their own copy of the place names, in two message namespaces —
 * so renaming a sample meant editing eight strings and hoping (CLAUDE.md §6).
 *
 * What is here is what belongs to the file. What is translated — the place
 * name and the city — lives in `AudioSample.*` in the four message files and
 * is joined in by the page.
 */

export type AudioSampleFile = {
  /** Stable key. It is also the i18n key prefix and the GA event value. */
  id: string;
  src: string;
  /** ISO 3166-1 alpha-2. The country *name* is resolved at render time. */
  countryCode: string;
  /**
   * The transcript of the clip, or `null` while none has been produced.
   *
   * `null` is the whole state of the site today: finding 6 of
   * docs/design/acessibilidade-auditoria-2026-08.md (SC 1.2.1, level A) is
   * missing content, not missing markup, and the audit says so —
   * "ausência de conteúdo não é detectável por regra". The player renders the
   * disclosure the moment a string lands here and renders nothing until then;
   * an empty panel behind a "read the transcript" button would answer the
   * criterion with nothing while looking like it answered.
   */
  transcript: string | null;
  /**
   * BCP 47 tag of the recording, or `null` when it is not established.
   *
   * It is `null` for all three: one file per sample is served to all four
   * locales, the files carry no tags, and nothing in the repository records
   * which language was recorded. Naming one would be publishing a guess.
   */
  audioLang: string | null;
};

/**
 * The three clips, in the order they are published — spec §6.5, card #194.
 *
 * **The order is this array, and the ids do not move with it.** §6.5 asked for
 * the swap as a change of key content — `sample1` becoming Avenida Paulista,
 * and the `/audio/sampleN-*.mp3` files renamed to follow. Two things that were
 * not known when it was written say to do it here instead:
 *
 *  - the `id` is the value of the GA events (`play_audio_sample`), so renaming
 *    it makes every reading taken before the swap mean a different place, in
 *    the same series, with nothing in the data marking where it changed;
 *  - the three `sampleN-dir.mp3` were matched byte for byte to objects in
 *    Storage — `sample1-dir` en-US, `sample2-dir` pt-BR, `sample3-dir` it-IT —
 *    which is the lineage of the pair each `sampleN` is. Renaming the files
 *    scrambles the only established fact about them while their provenance is
 *    still an open question with the operator.
 *
 * The rendered order is what the card asked for and what a test asserts; the
 * numbering is a key, and a key that means one thing forever is worth more
 * than a key that reads in order.
 *
 * The story half (`-desc`) is what a card plays. The directional half
 * (`-dir`, about three seconds: the cue that names the place) is a second clip
 * that no surface of this site plays: the player used to chain the two and
 * start it on its own, which is the SC 1.3.1 / 4.1.2 finding the global player
 * removed, and the `directional` chip that survived the chaining went with
 * #194 — a label on a card names what that card plays.
 */
export const AUDIO_SAMPLE_FILES = [
  {
    id: "sample2",
    src: "/audio/sample2-desc.mp3",
    countryCode: "BR",
    transcript: null,
    audioLang: null,
  },
  {
    id: "sample3",
    src: "/audio/sample3-desc.mp3",
    countryCode: "IT",
    transcript: null,
    audioLang: null,
  },
  {
    id: "sample1",
    src: "/audio/sample1-desc.mp3",
    countryCode: "US",
    transcript: null,
    audioLang: null,
  },
] as const satisfies readonly AudioSampleFile[];
