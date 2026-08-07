import { useTranslations } from "next-intl";
import { AudioSampleGrid, type AudioSample } from "./AudioSampleGrid";
import { AUDIO_SAMPLE_FILES } from "@/lib/audio-samples";

/**
 * The sample section of /drive, on the dark surface.
 *
 * It used to own a player of its own — the third of three (spec §1.1) — and
 * that player chained two clips: when the directional cue ended it started the
 * story on its own and moved a coloured chip, with no `aria-live`, no
 * `aria-current` and no text. A screen-reader user had no way to know what was
 * playing or that anything had changed (accessibility audit §6.2, SC 1.3.1 and
 * 4.1.2, finding 16). The chaining is gone with the player: one card plays one
 * clip, started by the user, and the two chips survive as what they always
 * described — the two halves the product delivers at that point.
 */
export function DriveSamples() {
  const t = useTranslations("Drive.Samples");
  const ts = useTranslations("AudioSample");

  const samples: AudioSample[] = AUDIO_SAMPLE_FILES.map((file) => ({
    ...file,
    placeName: ts(`${file.id}Name`),
    city: ts(`${file.id}City`),
    tags: ["directional", "story"],
  }));

  return (
    <section className="py-24 bg-tuggi-dark text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
