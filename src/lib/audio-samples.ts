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
 * The three clips, in the order they are published today.
 *
 * The story half (`-desc`) is what a card plays. The directional half
 * (`-dir`, about three seconds: the cue that names the place) is what the
 * `directional` tag on /drive describes — the previous player chained the two
 * and started the second on its own, which is the SC 1.3.1 / 4.1.2 finding the
 * global player exists to remove.
 */
export const AUDIO_SAMPLE_FILES = [
  {
    id: "sample1",
    src: "/audio/sample1-desc.mp3",
    countryCode: "US",
    transcript: null,
    audioLang: null,
  },
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
] as const satisfies readonly AudioSampleFile[];
