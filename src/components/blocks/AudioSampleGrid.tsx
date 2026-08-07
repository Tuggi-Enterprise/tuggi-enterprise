import { AudioSampleCard, type AudioSample } from "./AudioSampleCard";
import type { Surface } from "./surface";

/**
 * The layout around the player — spec §1.3 and §1.6 of
 * docs/design/spec-repaginacao-site-2026-08.md.
 *
 * The page chooses the samples; this decides nothing about them. That is what
 * keeps `/audio/sampleN-*.mp3` from being written down twice, and what lets a
 * conversion page carry three while a partner page carries two.
 */

type AudioSampleGridProps = {
  /**
   * One to three. Above three is a use error and not a state: on a page whose
   * job is a decision, three is the ceiling where the choice is still instant
   * (Hick's law, *Laws of UX*).
   */
  samples: readonly AudioSample[];
  surface?: Surface;
  /** `"none"` for a page that renders many of these — see AudioSampleCard. */
  preload?: "none" | "metadata";
};

export function AudioSampleGrid({
  samples,
  surface = "light",
  preload = "metadata",
}: AudioSampleGridProps) {
  // Empty means the whole block does not render — no orphan heading, no ghost
  // card (spec §1.5). The caller owns the heading, so returning null here is
  // what makes that true.
  if (samples.length === 0) return null;

  // One sample does not become a full-width column: a card stretched to
  // 1280 px puts 900 px of nothing between the button and the tags, and the
  // target loses its relation to the label (spec §1.3).
  const columns =
    samples.length === 1
      ? "mx-auto max-w-xl grid-cols-1"
      : samples.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-4 text-left ${columns}`}>
      {samples.map((sample) => (
        <AudioSampleCard key={sample.id} sample={sample} surface={surface} preload={preload} />
      ))}
    </div>
  );
}

export type { AudioSample };
