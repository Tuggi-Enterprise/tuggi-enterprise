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
 * Two samples, in the order published today. The third one and the reordering
 * are §6.5 of the spec, which is the home card (#194) — a block that only
 * swapped its player has no business changing what the home says.
 */
export function HomeAudioSample() {
  const t = useTranslations("Home.AudioSample");
  const ts = useTranslations("AudioSample");

  const samples: AudioSample[] = AUDIO_SAMPLE_FILES.slice(0, 2).map((file) => ({
    ...file,
    placeName: ts(`${file.id}Name`),
    city: ts(`${file.id}City`),
    tags: ["story"],
  }));

  return (
    <section className="bg-white py-20 lg:py-24 border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-3">
          {t("title")}
        </h2>
        <p className="text-lg text-tuggi-slate mb-10">{t("subtitle")}</p>

        <AudioSampleGrid samples={samples} />
      </div>
    </section>
  );
}
