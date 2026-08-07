import { useTranslations } from "next-intl";
import { AudioSampleGrid, type AudioSample } from "./AudioSampleGrid";
import { AUDIO_SAMPLE_FILES } from "@/lib/audio-samples";

/**
 * The sample section of /drive, on the dark surface.
 *
 * This is the block where the product's pair is shown and heard: the
 * directional cue that names the place, then the story. It used to own a
 * player of its own — the third of three (spec §1.1) — which chained the two
 * clips and moved a coloured chip while doing it, with no `aria-current` and
 * no text, so a screen-reader user had no way to know that anything had
 * changed (accessibility audit §6.2, SC 1.3.1 and 4.1.2, finding 16).
 *
 * Unifying the players took the chaining with it, and for a while these cards
 * showed a "Direcional" chip over a card that played only `sampleN-desc.mp3` —
 * reported on #194, and the reason #213 found the three cue files referenced
 * by no line of `src/`. The chaining is back in the shared player, and the
 * finding stays answered: the chip of the half that is playing carries
 * `aria-current` and a `role="status"` region names it (DS-A11Y-003).
 */
export function DriveSamples() {
  const t = useTranslations("Drive.Samples");
  const ts = useTranslations("AudioSample");

  const samples: AudioSample[] = AUDIO_SAMPLE_FILES.map((file) => ({
    ...file,
    placeName: ts(`${file.id}Name`),
    city: ts(`${file.id}City`),
    // The chips are the halves this card plays, read off the clips themselves:
    // a chip that names a half nobody plays is a label that lies (#213).
    tags: file.clips.map((clip) => clip.part),
  }));

  return (
    <section className="py-24 bg-tuggi-dark text-white border-b border-slate-800">
      {/* `.page-shell`, not a second copy of its values: `max-w-7xl mx-auto
          px-4 sm:px-6 lg:px-8` is the rail written out by hand, to the pixel
          (DS-LAYOUT-002, CLAUDE.md §6). Same geometry, one owner. */}
      <div className="page-shell">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <span className="text-tuggi-primary font-bold text-sm tracking-widest uppercase mb-4 block">
            {t("tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">{t("title")}</h2>
          <p className="text-lg text-slate-400 leading-relaxed">{t("subtitle")}</p>
        </div>

        <AudioSampleGrid samples={samples} surface="dark" />

        {/* A social-proof line with a five-figure play count lived here, next
            to a TODO asking whether it was accurate. It is not: BR-COMUNICACAO-003
            item 3 — drive.poi_visits held 1,653 raw plays, 201 of them from 7
            external users. Item 4 says no rounding fixes a figure with no source,
            and item 5 says nothing takes its place until question 72 closes. */}
      </div>
    </section>
  );
}
