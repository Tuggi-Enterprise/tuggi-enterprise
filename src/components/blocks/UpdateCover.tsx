import Image from "next/image";
import { COVER_VIEWBOX, buildCoverTrace } from "@/lib/updateCover";

export interface UpdateCoverProps {
  /** A path under `public/`, or `"generated"` (spec §6.2). */
  cover: string;
  /** Required when `cover` is a file; ignored when it is generated. */
  coverAlt: string | null;
  /** Seeds the generated field, so one article always draws the same one. */
  slug: string;
  /** `next/image` sizing hint — the card and the article are different widths. */
  sizes: string;
  priority?: boolean;
}

/**
 * The image at the top of a card and of an article — one component, because it
 * is one decision: 1200 × 630 either way (`DS-MARCA-009`), so the same file
 * serves the grid thumbnail, the article hero and the share card, and nobody
 * crops twice.
 *
 * The generated branch is drawn inline rather than fetched: it is decorative,
 * it has no text to translate, and an `<svg>` costs no request and no bytes at
 * any device pixel ratio. Hidden from assistive tech instead of described,
 * which is what `RouteCard` already does with the route shape — the alternative
 * would be an empty `alt` on an `<img>` saying the same nothing, over HTTP.
 */
export function UpdateCover({ cover, coverAlt, slug, sizes, priority }: UpdateCoverProps) {
  if (cover !== "generated") {
    return (
      <Image
        src={cover}
        alt={coverAlt ?? ""}
        width={COVER_VIEWBOX.width}
        height={COVER_VIEWBOX.height}
        sizes={sizes}
        priority={priority}
        className="w-full h-auto object-cover"
      />
    );
  }

  const trace = buildCoverTrace(slug);

  return (
    <svg
      viewBox={`0 0 ${COVER_VIEWBOX.width} ${COVER_VIEWBOX.height}`}
      className="w-full h-auto bg-tuggi-dark"
      aria-hidden="true"
      focusable="false"
    >
      {/* Widths are viewBox units: the box is 1200 wide and renders between
          ~390 px (a card in a 3-column grid) and 768 px (the figure column),
          so 6 units draw a 2–4 px hairline — a road, not a marker stroke. */}
      <path
        d={trace.d}
        fill="none"
        stroke="var(--color-tuggi-primary-text)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={trace.start[0]} cy={trace.start[1]} r={14} fill="var(--color-tuggi-primary-text)" />
      <circle
        cx={trace.end[0]}
        cy={trace.end[1]}
        r={13}
        fill="var(--color-tuggi-dark)"
        stroke="var(--color-tuggi-primary-text)"
        strokeWidth={6}
      />
    </svg>
  );
}
