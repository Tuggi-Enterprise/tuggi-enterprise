"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Navigation, Pause, Play, Volume2 } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import type { AudioSamplePart } from "@/lib/audio-samples";
import type { Surface } from "./surface";

/**
 * The site's audio player. There is one, and this is it — spec §1 of
 * docs/design/spec-repaginacao-site-2026-08.md (card #193, component 4.1).
 *
 * There used to be three (`HomeAudioSample`, `DriveSamples`, `RouteStopAudio`),
 * each with a different subset of the same decisions and none aware of the
 * others (CLAUDE.md §6, DRY). The base is `RouteStopAudio`'s player, which was
 * the only one that already had a real seek bar and a colour pair that passes
 * — the accessibility audit of 2026-08 says so in §6.2, and this file inherits
 * both.
 *
 * **A sample is a sequence of clips, and the card plays the sequence** (#213).
 * At a point of interest the product delivers two halves: the directional cue
 * that names the place (~1 s) and the story that follows it (~30 s). `/drive`
 * showed both and played both — one press, the cue, then the story on its own
 * — until the unification kept a single `src` per sample and the cue stopped
 * being played by anything. Restoring it is what this file's sequence is for.
 *
 * What the audit obliges (§6.3), and where each obligation lives here:
 *
 *  - **A textual alternative per clip** (SC 1.2.1) — the transcript disclosure
 *    below. See the note on `transcript` for what happens while the site has
 *    none.
 *  - **The button's colour pair comes from RouteStopAudio, never white on
 *    cyan** (SC 1.4.11) — `bg-tuggi-primary text-tuggi-dark` measures 6.92:1,
 *    which is also what DS-COR-004 requires of any filled brand surface. The
 *    background does not change on hover: the only cyan dark enough to keep a
 *    dark glyph legible is `--color-tuggi-primary-text` at 3.89:1, and
 *    DS-COR-004 says the hover token is born the day the hover exists, not
 *    before. Hover is scale.
 *  - **Playback state announced by something other than colour** (SC 1.3.1,
 *    4.1.2, DS-A11Y-003) — the button's `aria-label` names the action, the
 *    icon changes shape, and the chip of the half that is playing carries
 *    `aria-current` while a `role="status"` region names it in text. That is
 *    the finding the old chaining earned (audit finding 16): it moved a
 *    coloured chip and nothing else, so a screen-reader user had no way to
 *    know that the clip had changed under him.
 *  - **Never autoplay** (SC 1.4.2) — nothing starts without a press. The
 *    second clip of a sequence is the one exception the audit allows, because
 *    it is the continuation of a playback the visitor asked for; it is
 *    announced, and it can only follow a press of his.
 */

/* -------------------------------------------------------------------------- */

/** One recording of a sample. See `@/lib/audio-samples` for the catalogue. */
export type AudioClip = {
  /** Under /public, or the absolute URL of a route stop's recording. */
  src: string;
  /** Which half this clip is — the chip and the status region name it. */
  part: AudioSamplePart;
  /**
   * The language of the clip, as a BCP 47 tag, or `null` when it is not
   * established. Same rule as `transcript`: the site serves one file per
   * sample to all four locales and, apart from the three directional cues
   * (matched to Storage on #213), nothing in the repository records which
   * language was recorded — so no call site claims one.
   */
  audioLang: string | null;
};

export type AudioSample = {
  /** Stable key, and the value of the GA events. Never translated. */
  id: string;
  /** i18n. Wraps to two lines before it truncates — see the note below. */
  placeName: string;
  /**
   * Where the place is. Optional, and for a different reason than the two
   * nullable fields below: those are facts about the clip that nobody has
   * established, while this is context the surrounding page may already be
   * giving — a stop inside a route page is under a heading that names the
   * country. i18n; the country name is resolved from `countryCode`, never
   * written into this string.
   */
  city?: string;
  /** ISO 3166-1 alpha-2, resolved by Intl.DisplayNames in the page's locale. */
  countryCode?: string;
  /**
   * What the card plays, **in order, ending with the story**.
   *
   * The last clip is the one the card is about: it is what the idle element
   * carries, so the length on the face of the card is the length of the
   * narration and not of the one-second cue in front of it, and it is what a
   * crawler and a visitor with no JavaScript find in the served HTML.
   */
  clips: readonly [AudioClip, ...AudioClip[]];
  /**
   * The transcript of this clip, or `null` when it has not been produced.
   *
   * `null` is not `undefined`: every call site has to state which it is, the
   * same shape §0 of the spec fixed for a product figure with no confirmed
   * value. The site has no transcripts today — finding 6 of the accessibility
   * audit is missing *content*, not missing markup — so every sample states
   * `null` and the disclosure does not render at all. An empty region behind a
   * "read the transcript" button would be worse than its absence: it answers
   * SC 1.2.1 with nothing while looking like it answered.
   */
  transcript: string | null;
  /**
   * Descriptors of the sample, in the order they are shown. A page builds them
   * from the clips it passes — a chip that names a half the card does not play
   * is a label that lies (CLAUDE.md §6).
   */
  tags?: readonly AudioSamplePart[];
};

/**
 * The pair `DriveSamples` used to draw, kept literally (spec §1.2): the icons
 * are Lucide (DS-COMPONENTE-004) and the labels come from i18n, so a tag can
 * never be a word typed into the component. The same two labels name the half
 * that is playing, which is what the old player did with its `directionalLabel`
 * and `storyLabel` — one string per half, in the chip and in the live region.
 */
const TAG = {
  directional: { icon: Navigation, label: "tagDirectional" },
  story: { icon: Volume2, label: "tagStory" },
} as const satisfies Record<AudioSamplePart, { icon: unknown; label: string }>;

/**
 * One clip plays at a time across the whole page. A route page carries up to a
 * dozen of these, and two of them talking over each other is the worst thing
 * any page of this site can do to a visitor.
 */
let playingAudio: HTMLAudioElement | null = null;

/** Seconds → "1:07". "--:--" while the duration is still unknown. */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

type AudioSampleCardProps = {
  sample: AudioSample;
  surface?: Surface;
  /**
   * `"metadata"` so the idle card can show the clip's length, which the
   * anatomy asks for and only the file knows. `RouteStopAudio` passes
   * `"none"`: a route page renders one of these per stop, and a dozen metadata
   * requests on a phone abroad buys a duration nobody asked for.
   */
  preload?: "none" | "metadata";
};

/**
 * Colours per surface. On dark, the body text is white or slate-300 — measured
 * on `--color-tuggi-dark`, `--color-tuggi-slate` is 3.13:1 and fails SC 1.4.3,
 * which is the trap this table exists to keep closed (spec §1.7).
 *
 * `tagPlaying` is the button's pair, and for the same reason: it is the one
 * filled brand surface this repository has measured (6.92:1), and DS-COR-004
 * requires exactly it of any other.
 */
const SURFACE = {
  light: {
    card: "bg-white border-gray-200",
    name: "text-tuggi-dark",
    meta: "text-tuggi-slate",
    body: "text-tuggi-slate",
    tag: "bg-tuggi-bg text-tuggi-slate border-gray-200",
    tagPlaying: "bg-tuggi-primary text-tuggi-dark border-tuggi-primary",
    ring: "focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2",
  },
  dark: {
    card: "bg-tuggi-dark border-slate-800",
    name: "text-white",
    meta: "text-slate-300",
    body: "text-slate-300",
    tag: "bg-slate-800 text-slate-300 border-slate-700",
    tagPlaying: "bg-tuggi-primary text-tuggi-dark border-tuggi-primary",
    ring: "focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark",
  },
} as const satisfies Record<Surface, Record<string, string>>;

export function AudioSampleCard({
  sample,
  surface = "light",
  preload = "metadata",
}: AudioSampleCardProps) {
  const t = useTranslations("AudioSample");
  const locale = useLocale();
  const skin = SURFACE[surface];

  const clips = sample.clips;
  const last = clips.length - 1;
  /** The clip the card is about, and the one the served markup carries. */
  const story = clips[last];

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [openTranscript, setOpenTranscript] = useState(false);
  const startedRef = useRef(false);

  /**
   * Which clip is in the element, twice: the state renders the chip and the
   * metadata line, the ref is what the media listeners read — they are
   * registered once and would otherwise close over the first render's value.
   * Everything that moves one moves the other, in `load`.
   */
  const [loaded, setLoaded] = useState(last);
  const loadedRef = useRef(last);

  const transcriptId = useId();

  /**
   * Puts one clip of the sequence into the one element the site has.
   *
   * The element's source is never a React prop past the first render — the JSX
   * carries the story and nothing changes it, so React never writes the
   * attribute again and never fights this function for it. Writing `src` from
   * both sides is how a swap turns into a reload that restarts the clip the
   * visitor is listening to.
   *
   * `load()` is MDN's instruction for a source changed by script: it "will
   * reset the element and rescan the available sources, thereby causing the
   * changes to take effect".
   */
  const goToClip = useCallback((el: HTMLAudioElement, index: number, src: string) => {
    loadedRef.current = index;
    setLoaded(index);
    // The previous clip's position and length are not this one's, and a card
    // that keeps showing them for the instant before `loadedmetadata` is a
    // card showing a number about a file it is no longer playing.
    setTime(0);
    setDuration(NaN);
    el.src = src;
    el.load();
  }, []);

  /**
   * The listeners are registered once per element, so the sequence has to be
   * identified by its content, and it is all the effect needs of it: `clips`
   * is rebuilt by the page on every render and its identity says nothing.
   */
  const sequence = clips.map((clip) => clip.src).join("\n");

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const sources = sequence.split("\n");

    const onPlay = () => {
      if (playingAudio && playingAudio !== el) playingAudio.pause();
      playingAudio = el;
      setPlaying(true);
      setLoading(false);
      // Once per card per session: the question the event answers is how many
      // visitors start a clip, not how many times one visitor scrubs it — nor
      // how many halves the sequence has.
      if (!startedRef.current) {
        startedRef.current = true;
        sendGAEvent({ event: "play_audio_sample", value: sample.id });
      }
    };
    const onPause = () => {
      setPlaying(false);
      setLoading(false);
    };
    const onEnded = () => {
      const next = loadedRef.current + 1;
      if (next < sources.length) {
        goToClip(el, next, sources[next]);
        /**
         * The continuation, and the one call of this file that is not made
         * from inside a gesture.
         *
         * MDN's autoplay guide allows script-initiated playback when "the user
         * has interacted with the site (by clicking, tapping, pressing keys,
         * etc.)", which is true here by a second or two. WebKit states the
         * requirement per call — the script "must have directly resulted from
         * a handler for a `touchend`, `click`, `doubleclick`, or `keydown`
         * event" — and documents no rule that a played element stays unlocked,
         * so on iOS this can be refused with `NotAllowedError`.
         *
         * Which is why the story is what gets loaded *before* the attempt, and
         * why the failure path is the one MDN prescribes (`showPlayButton`):
         * the card falls back to its own play button over the story. A refusal
         * costs the visitor one press and never the narration — the cue is the
         * part that can be lost, never the part that carries the product.
         */
        el.play().catch(() => {
          setPlaying(false);
          setLoading(false);
        });
        return;
      }
      setPlaying(false);
      setTime(0);
      sendGAEvent({ event: "audio_sample_complete", value: sample.id });
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onError = () => {
      setFailed(true);
      setPlaying(false);
      setLoading(false);
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("error", onError);

    // `preload="metadata"` can finish before this effect runs, and the event
    // only fires once: without this the card keeps saying "--:--" for a file
    // whose duration the element already knows. HAVE_METADATA is 1.
    if (el.readyState >= 1) onMeta();

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("error", onError);
      if (playingAudio === el) playingAudio = null;
    };
  }, [sample.id, sequence, goToClip]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    // Starting the sample over: the sequence goes back to its first clip, and
    // it is put in *here*, inside the press. This is the only source change
    // any policy is documented to allow, and it is why the cue is the clip
    // that starts from a gesture and the story the one that follows it.
    const atStart = el.ended || el.currentTime === 0;
    if (atStart && loadedRef.current !== 0) goToClip(el, 0, clips[0].src);
    setLoading(true);
    // A rejected play() (offline, a bad range request) falls back to the
    // paused state instead of leaving the card claiming it is playing.
    el.play().catch(() => {
      setPlaying(false);
      setLoading(false);
      setFailed(true);
    });
  };

  const knownDuration = isFinite(duration) && duration > 0;
  const active = clips[loaded] ?? story;
  /** A single clip is a sample with no halves: there is no state to follow. */
  const chained = clips.length > 1;
  /**
   * Whether the sequence is under way — playing, or paused somewhere inside
   * it. `aria-current` answers *which half is playing*, so a card at rest has
   * no answer to give: at rest the element sits on the story with no position,
   * which is also where it is put back the moment the sequence ends.
   */
  const running = chained && (playing || time > 0 || loaded !== last);

  /**
   * The metadata line, joined with "·". Built from the parts that exist: a
   * field with no established value drops out of the line entirely, and never
   * renders as an em dash, a zero or an empty gap (spec §0). The country and
   * the language are named by Intl.DisplayNames — the country in the page's
   * locale, the language in its own, which is how the visitor recognizes a
   * language he does not read.
   *
   * Both the length and the language are the *loaded* clip's, never the
   * sample's: the sample has neither. Idle, that is the story — the narration
   * is what the card offers and its length is what the visitor is deciding
   * about, while the cue in front of it is a second long and, unlike the
   * story, has an established language to name while it plays.
   */
  const countryName = sample.countryCode
    ? (new Intl.DisplayNames([locale], { type: "region" }).of(sample.countryCode) ??
      sample.countryCode)
    : null;
  const languageName = active.audioLang
    ? (new Intl.DisplayNames([active.audioLang], { type: "language" }).of(active.audioLang) ??
      active.audioLang)
    : null;

  const metadata = [
    [sample.city, countryName].filter(Boolean).join(", ") || null,
    knownDuration ? formatTime(duration) : null,
    languageName,
  ].filter((part): part is string => Boolean(part));

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start ${skin.card}`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pause", { name: sample.placeName }) : t("play", { name: sample.placeName })}
        aria-busy={loading || undefined}
        // 56×56 (DS-A11Y-002 asks 44). The dark glyph on brand cyan is 6.92:1
        // and it is the only thing that says what the control does — the
        // background stays put on hover for the reason in the header note.
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-tuggi-primary text-tuggi-dark transition-transform duration-150 hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 focus:outline-none focus-visible:ring-2 ${skin.ring}`}
      >
        {loading ? (
          // A progress indicator keeps moving under reduced motion: it is
          // status, and freezing it breaks DS-COMPONENTE-002.
          <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />
        ) : playing ? (
          <Pause className="h-6 w-6 fill-current" aria-hidden="true" />
        ) : (
          <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* The name owns the full inner width of the card, and the tags sit
            under the metadata line at every width (card #211).

            They used to sit beside the name from `sm:` up, and that is a
            *viewport* breakpoint on an element whose width comes from its grid
            column: on /drive at 1440 px the card is 393 px, the `shrink-0` tag
            list takes 189 px — 206 in Italian — and the name is left with
            76 px; at 1024 px it is left with none, and all three names
            truncate.

            A container query would key the split to the card rather than to
            the window, and it still would not earn its place, because the
            threshold is not a length: the tag list is translated content, so
            the split only clears the 55% this card's criterion asks of the
            name at 424 px of card with one tag, and at 692 px with two in
            Italian. The widest card this site can build is 598 px (two on the
            rail at 1440 px), and the three-column /drive grid never passes
            393 px — so the two-tag branch could never be true, and the
            one-tag branch would buy a single line of height in exchange for a
            breakpoint that has to guess at a string's width (CLAUDE.md §6,
            KISS). Measured 2026-08-07, production build, Chrome for Testing. */}
        <div>
          {/* Two lines before it truncates, and never a cut without an
              ellipsis (DS-A11Y-005): the old card used `truncate`, and
              "Complesso Monumentale della Pilotta" disappeared mid-word. */}
          <p className={`line-clamp-2 font-bold ${skin.name}`}>{sample.placeName}</p>
          <p className={`text-sm ${skin.meta}`}>{metadata.join(" · ")}</p>
        </div>

        {sample.tags && sample.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {sample.tags.map((tag) => {
              const Icon = TAG[tag].icon;
              // Which half is playing, in the accessibility tree and in the
              // fill (DS-A11Y-003 asks for a second channel; the region below
              // is the third, and it is the one that speaks).
              const current = running && tag === active.part;
              return (
                <li
                  key={tag}
                  aria-current={current || undefined}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${current ? skin.tagPlaying : skin.tag}`}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {t(TAG[tag].label)}
                </li>
              );
            })}
          </ul>
        )}

        {/* The half that is playing, in text, for whoever is not looking at
            the chips. Only a sequence has one: on a card with a single clip
            nothing changes under the visitor, and a region that announces the
            same word every time a clip starts is noise (SC 4.1.3). */}
        {chained && (
          <span role="status" className="sr-only">
            {playing ? t(TAG[active.part].label) : ""}
          </span>
        )}

        {failed ? (
          // What to do, never the HTTP code (DS-COPY-002). The card stays: the
          // transcript, when there is one, is the way out of this state.
          <p className={`text-sm ${skin.body}`}>{t("error")}</p>
        ) : (
          <input
            type="range"
            min={0}
            max={knownDuration ? duration : 0}
            step={0.1}
            value={time}
            disabled={!knownDuration}
            onChange={(event) => {
              const el = audioRef.current;
              if (!el) return;
              el.currentTime = Number(event.target.value);
              setTime(el.currentTime);
            }}
            aria-label={t("seek", { name: sample.placeName })}
            aria-valuetext={formatTime(time)}
            // accent-tuggi-primary-text, not -primary: the thumb and the filled
            // track are the only visual carrier of this control's value, and
            // brand cyan on the track measures 2.70:1 against the 3:1 of
            // SC 1.4.11. #007aa5 is 4.85:1.
            className="h-6 w-full cursor-pointer accent-tuggi-primary-text disabled:cursor-default"
          />
        )}

        {sample.transcript !== null && (
          <div>
            <button
              type="button"
              onClick={() => {
                if (!openTranscript) sendGAEvent({ event: "open_transcript", value: sample.id });
                setOpenTranscript((open) => !open);
              }}
              aria-expanded={openTranscript}
              aria-controls={transcriptId}
              className={`text-sm font-semibold underline underline-offset-2 focus:outline-none focus-visible:ring-2 ${skin.body} ${skin.ring}`}
            >
              {openTranscript ? t("transcriptHide") : t("transcriptShow")}
            </button>
            {/* Server-rendered, hidden rather than absent: an alternative that
                arrives only after hydration is not an alternative, and this is
                also what puts the text in front of a crawler (spec §1.4). */}
            <p id={transcriptId} hidden={!openTranscript} className={`mt-2 text-sm ${skin.body}`}>
              {sample.transcript}
            </p>
          </div>
        )}
      </div>

      {/* The story, and it stays the story: the source React renders is the
          clip the card is about, so the served HTML carries the narration and
          the swaps of the sequence happen where the note on `load` explains. */}
      <audio ref={audioRef} preload={preload} src={story.src} />
    </article>
  );
}
