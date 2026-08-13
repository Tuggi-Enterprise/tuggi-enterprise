"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import { formatClipDuration, type PartnerVideo as PartnerVideoData } from "@/lib/partner-videos";

/**
 * The narrated drive inside the hero of `/partners` — §3 of
 * `docs/design/spec-lp-parcerias-conversao-2026-08.md` (card #306).
 *
 * There was no player of any kind on this site: the only audio component is
 * `AudioSampleCard`, which is an `<audio>` element with a seek bar, and nothing
 * ever embedded a third party. So this is a new component rather than a reuse,
 * and its three decisions all come from that novelty.
 *
 * **A facade, never an `iframe` at load.** The button paints a poster; the
 * `iframe` is created by the click, pointed at `youtube-nocookie.com`. That is
 * not only weight: this page carries a consent banner, and mounting the player
 * before the visitor accepts drops a third-party cookie nobody authorized.
 *
 * **The poster is `alt=""` on purpose.** The caption below the player already
 * describes the scene in the language of the page; an describing `alt` would
 * make a screen reader announce the same thing twice (SC 1.1.1). The accessible
 * name of the control is the play label plus that caption.
 *
 * **The narration language is a radio group of native radios.** Arrow-key
 * navigation, "1 of 4" announced, and a working state with no JavaScript come
 * from the element rather than from us. Before the first play, switching swaps
 * poster and id and loads nothing; after it, the player restarts — the clips
 * have different lengths and "resume where you were" would land in the middle
 * of another sentence (§3.4).
 *
 * **The label of each pill arrives already resolved**, from
 * `narrationLanguageLabel` at the server call site. See that function for why
 * it is not an index into `Languages.langs`.
 *
 * With no JavaScript there is a poster, a caption and a link to YouTube — never
 * a dead button and never a selector that cannot select (§3.8, criterion 13).
 * The link is a `<noscript>` child; the two controls that need a runtime are
 * withdrawn by a `<noscript>` stylesheet, which is the only way to remove
 * server-rendered markup from a page whose JavaScript never arrives. Rendering
 * them after hydration instead would be a `setState` inside an effect, which
 * this repo's lint rejects, and would cost a layout shift on every visit.
 */

/** Marks the two controls that do nothing without a runtime — see the header. */
const JS_ONLY = "partner-video-js-only";

export type NarratedVideo = PartnerVideoData & {
  /** The name of `audioLocale` in the language of the page. */
  languageLabel: string;
};

export function PartnerVideo({
  videos,
  initialId,
}: {
  videos: readonly NarratedVideo[];
  /** The clip that opens — the page's own language if there is one (§3.4). */
  initialId: string;
}) {
  const t = useTranslations("Partners.video");
  const groupId = useId();
  const [selectedId, setSelectedId] = useState(initialId);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);

  const selected = videos.find((video) => video.id === selectedId) ?? videos[0];
  if (!selected) return null;

  const caption = t("caption");

  function select(id: string) {
    setSelectedId(id);
    // A different narration is a different recording: the player goes back to
    // the facade rather than seeking inside the new clip (§3.4).
    setPlaying(false);
  }

  function play() {
    setPlaying(true);
    if (played) return;
    setPlayed(true);
    // Hypothesis 2 of spec §7: is the video a conversion piece or is it
    // entertainment? Once per session, so a visitor switching languages does
    // not inflate the numerator of the comparison against `partner_form_start`.
    sendGAEvent({
      event: "partner_video_play",
      id: selected.id,
      audio_locale: selected.audioLocale,
    });
  }

  return (
    <figure className="m-0 w-full max-w-xl" data-block="partner-video">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-tuggi-dark">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${selected.youtubeId}?autoplay=1&rel=0`}
            title={caption}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <Image
              src={selected.poster}
              alt=""
              width={selected.posterWidth}
              height={selected.posterHeight}
              className="absolute inset-0 h-full w-full object-cover"
              priority
            />
            <button
              type="button"
              onClick={play}
              data-js-only={JS_ONLY}
              // The whole poster is the target — DS-A11Y-002 asks for 44 px and
              // this is the largest control on the page.
              className="absolute inset-0 flex items-end justify-start p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark"
            >
              <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-tuggi-secondary px-5 py-2 font-semibold text-tuggi-dark shadow-sm">
                <Play className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t("playLabel")}
                <span aria-hidden="true" className="opacity-80">
                  {formatClipDuration(selected.durationSeconds)}
                </span>
              </span>
              {/* The name of the control, and the reason the poster is alt="":
                  the visible label says "play", the caption says of what. */}
              <span className="sr-only">{caption}</span>
            </button>
          </>
        )}
      </div>

      {videos.length > 1 ? (
        <fieldset
          className="mt-4 border-0 p-0"
          role="radiogroup"
          aria-labelledby={`${groupId}-legend`}
          data-js-only={JS_ONLY}
        >
          <legend id={`${groupId}-legend`} className="text-sm font-semibold text-tuggi-slate">
            {t("languageLegend")}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {videos.map((video) => (
              <label
                key={video.id}
                className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tuggi-primary-text has-[:focus-visible]:ring-offset-2 ${
                  video.id === selected.id
                    ? "border-tuggi-primary-text bg-tuggi-primary-text text-white"
                    : "border-gray-300 text-tuggi-dark hover:border-tuggi-primary-text"
                }`}
              >
                <input
                  type="radio"
                  name={`${groupId}-narration`}
                  value={video.id}
                  checked={video.id === selected.id}
                  onChange={() => select(video.id)}
                  className="sr-only"
                />
                {video.languageLabel}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <figcaption className="mt-4 text-sm text-tuggi-slate leading-relaxed">{caption}</figcaption>

      <noscript>
        <style
          dangerouslySetInnerHTML={{ __html: `[data-js-only="${JS_ONLY}"]{display:none!important}` }}
        />
        <a
          className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-tuggi-primary-text underline underline-offset-4"
          href={`https://www.youtube.com/watch?v=${selected.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("openOnYoutube")}
        </a>
      </noscript>
    </figure>
  );
}
