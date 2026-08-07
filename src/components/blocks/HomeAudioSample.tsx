import { useTranslations } from "next-intl";
import { AudioSampleGrid, type AudioSample } from "./AudioSampleGrid";
import { AUDIO_SAMPLE_FILES } from "@/lib/audio-samples";

/**
 * "Hear a sample" on the home page.
 *
 * It owns the heading and the choice of samples, and nothing else: the player
 * is `AudioSampleCard`, shared with /drive and with every route stop (spec §1,
 * card #193). This block used to carry a fourth copy of the same player, with
 * no progress bar, no duration and a `truncate` that cut place names in the
 * middle of a word.
 *
 * **Three samples, and all three of them** (spec §1.3 and §6.5, card #194).
 * Three is the ceiling where the choice is still instant on a page whose job is
 * a decision (Hick's law), and it is also the whole catalogue: slicing it would
 * mean this block deciding which clip the home does not get, which is exactly
 * the decision `src/lib/audio-samples.ts` owns. The order is that file's.
 */
export function HomeAudioSample() {
  const t = useTranslations("Home.AudioSample");
  const ts = useTranslations("AudioSample");

  const samples: AudioSample[] = AUDIO_SAMPLE_FILES.map((file) => ({
    ...file,
    placeName: ts(`${file.id}Name`),
    city: ts(`${file.id}City`),
    tags: ["story"],
  }));

  return (
    <section className="bg-white py-20 lg:py-24 border-t border-gray-100">
      {/* The rail is `.page-shell` (DS-LAYOUT-002), and the narrower measure
          belongs to the prose inside it — not to the block. This block kept a
          `max-w-3xl` from when it was a single column: with the grid, two
          cards were splitting 704 px at 1440 px, and the metadata line wrapped
          in all four languages (card #211). */}
      <div className="page-shell text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-3">
            {t("title")}
          </h2>
          <p className="text-lg text-tuggi-slate mb-10">{t("subtitle")}</p>
        </div>

        <AudioSampleGrid samples={samples} />
      </div>
    </section>
  );
}
