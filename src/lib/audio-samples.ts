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

/** The two halves the product delivers at a point of interest. */
export type AudioSamplePart = "directional" | "story";

/** One recording. A sample is a sequence of these, played in order. */
export type AudioClipFile = {
  /** Under /public. */
  src: string;
  /** Which half this clip is. It is what the card's chip names. */
  part: AudioSamplePart;
  /**
   * BCP 47 tag of the recording, or `null` when it is not established.
   *
   * Established for the three `-dir` and for nothing else: the `data` matched
   * them byte for byte (MD5) to objects of the `travel-app-audios` bucket on
   * card #213, which is the only lineage any file under /public/audio has. The
   * `-desc` are `null` and stay `null` — one file per sample is served to all
   * four locales, they carry no tags, and nothing in the repository records
   * what was recorded. Naming one would be publishing a guess.
   */
  audioLang: string | null;
};

export type AudioSampleFile = {
  /** Stable key. It is also the i18n key prefix and the GA event value. */
  id: string;
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
   * The clips of this sample, **in the order they play**, ending with the
   * story. A page that wants only part of the pair filters this list; it never
   * writes a path of its own.
   */
  clips: readonly [AudioClipFile, ...AudioClipFile[]];
};

/**
 * The three samples, in the order they are published — spec §6.5, card #194.
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
 * **Each sample is a pair, and the pair is played** (#213). The directional
 * half is the ~1 s cue that names the place; the story is the ~30 s narration
 * that follows it. The player chains them — the cue, then the story, on one
 * press — which is what the site did until the three players were unified
 * (e5a8c16) and the model lost everything but a single `src`. The three `-dir`
 * then stopped being referenced by any line of `src/`, which is how #213 found
 * them orphaned: nothing was broken, a behaviour had simply gone quiet.
 */
export const AUDIO_SAMPLE_FILES = [
  {
    id: "sample2",
    countryCode: "BR",
    transcript: null,
    clips: [
      { src: "/audio/sample2-dir.mp3", part: "directional", audioLang: "pt-BR" },
      { src: "/audio/sample2-desc.mp3", part: "story", audioLang: null },
    ],
  },
  {
    id: "sample3",
    countryCode: "IT",
    transcript: null,
    clips: [
      { src: "/audio/sample3-dir.mp3", part: "directional", audioLang: "it-IT" },
      { src: "/audio/sample3-desc.mp3", part: "story", audioLang: null },
    ],
  },
  {
    id: "sample1",
    countryCode: "US",
    transcript: null,
    clips: [
      { src: "/audio/sample1-dir.mp3", part: "directional", audioLang: "en-US" },
      { src: "/audio/sample1-desc.mp3", part: "story", audioLang: null },
    ],
  },
] as const satisfies readonly AudioSampleFile[];

/**
 * The narration of a sample — the last clip of the sequence, by the rule
 * `clips` states. A page that shows the story without the cue in front of it
 * asks here instead of indexing the array on its own.
 */
export function storyOf(file: AudioSampleFile): AudioClipFile {
  return file.clips[file.clips.length - 1];
}
