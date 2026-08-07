"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Navigation, Pause, Play, Volume2 } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
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
 *    4.1.2) — the button's `aria-label` names the action and the icon changes
 *    shape. The finding behind that requirement was `DriveSamples` starting a
 *    second clip on its own when the first ended, with nothing announced;
 *    chaining is gone, so nothing changes state without the user.
 *  - **Never autoplay** (SC 1.4.2) — no `autoPlay`, and no play on hover or on
 *    entering the viewport.
 */

/* -------------------------------------------------------------------------- */

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
  /** Under /public. */
  src: string;
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
   * The language of the clip, as a BCP 47 tag, or `null` when it is not
   * established. Same rule as `transcript`: the site serves one file per
   * sample to all four locales and nothing in the repository records which
   * language was recorded, so no call site claims one.
   */
  audioLang: string | null;
  /** Descriptors of the sample, in the order they are shown. */
  tags?: readonly AudioSampleTag[];
};

export type AudioSampleTag = "directional" | "story";

/**
 * The pair `DriveSamples` used to draw, kept literally (spec §1.2): the icons
 * are Lucide (DS-COMPONENTE-004) and the labels come from i18n, so a tag can
 * never be a word typed into the component.
 *
 * `directional` is worth a note, because it reads like a defect and is not this
 * file's to settle. The chip sits on a card whose button says *"Tocar a
 * história de X"* and whose `<audio>` is `sampleN-desc.mp3`, while the clip the
 * word names, `sampleN-dir.mp3`, is requested by no page of this site — the
 * chaining that used to play it left with the global player (#193). Spec §1.2
 * and §1.3 keep the pair anyway, and both halves of any fix have an owner
 * elsewhere: the copy is the `design`'s, and what those files are is #213, open
 * with the operator. Reported on #194; not decided by it.
 */
const TAG = {
  directional: { icon: Navigation, label: "tagDirectional" },
  story: { icon: Volume2, label: "tagStory" },
} as const;

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
 */
const SURFACE = {
  light: {
    card: "bg-white border-gray-200",
    name: "text-tuggi-dark",
    meta: "text-tuggi-slate",
    body: "text-tuggi-slate",
    tag: "bg-tuggi-bg text-tuggi-slate border-gray-200",
    ring: "focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2",
  },
  dark: {
    card: "bg-tuggi-dark border-slate-800",
    name: "text-white",
    meta: "text-slate-300",
    body: "text-slate-300",
    tag: "bg-slate-800 text-slate-300 border-slate-700",
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [openTranscript, setOpenTranscript] = useState(false);
  const startedRef = useRef(false);

  const transcriptId = useId();

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => {
      if (playingAudio && playingAudio !== el) playingAudio.pause();
      playingAudio = el;
      setPlaying(true);
      setLoading(false);
      // Once per card per session: the question the event answers is how many
      // visitors start a clip, not how many times one visitor scrubs it.
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
  }, [sample.id]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      setLoading(true);
      // A rejected play() (offline, a bad range request) falls back to the
      // paused state instead of leaving the card claiming it is playing.
      el.play().catch(() => {
        setPlaying(false);
        setLoading(false);
        setFailed(true);
      });
    } else {
      el.pause();
    }
  };

  const knownDuration = isFinite(duration) && duration > 0;

  /**
   * The metadata line, joined with "·". Built from the parts that exist: a
   * field with no established value drops out of the line entirely, and never
   * renders as an em dash, a zero or an empty gap (spec §0). The country and
   * the language are named by Intl.DisplayNames — the country in the page's
   * locale, the language in its own, which is how the visitor recognizes a
   * language he does not read.
   */
  const countryName = sample.countryCode
    ? (new Intl.DisplayNames([locale], { type: "region" }).of(sample.countryCode) ??
      sample.countryCode)
    : null;
  const languageName = sample.audioLang
    ? (new Intl.DisplayNames([sample.audioLang], { type: "language" }).of(sample.audioLang) ??
      sample.audioLang)
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
              return (
                <li
                  key={tag}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${skin.tag}`}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {t(TAG[tag].label)}
                </li>
              );
            })}
          </ul>
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

      <audio ref={audioRef} preload={preload} src={sample.src} />
    </article>
  );
}
