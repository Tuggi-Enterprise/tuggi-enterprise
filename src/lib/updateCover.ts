/**
 * updateCover.ts — the generated field an article uses when it has no photo.
 *
 * Spec §6.2 / `DS-MARCA-009`. It is the route/line/trajectory metaphor the
 * brand manual registers, drawn the way the site already draws it: the hairline
 * stroke, the filled start dot and the hollow end ring of `RouteCard`'s `<svg>`.
 * `routeTrace.ts` is the same drawing from a real geometry; this one has no
 * geometry, so the shape is derived from the slug — stable for a given URL, and
 * different between URLs without anybody choosing anything.
 *
 * **The seed is the slug, and the slug is per locale**, so one article draws
 * four different fields: `/pt/novidades/audio-guia-que-comeca-sozinho` and
 * `/en/updates/audio-guide-that-starts-on-its-own` are the same piece with two
 * pictures. Measured on screen 2026-08-30, not deduced. Seeding on the article
 * **id** instead would give one piece one field in the four languages; which of
 * the two is wanted is a `design` decision about the share card, not a defect
 * to be quietly flipped — this note exists so the next reader knows the choice
 * is open rather than made.
 *
 * **It carries no text and no logo.** That is what makes it publishable without
 * a designer: no safe area to respect, nothing to translate into four
 * languages, and no image-of-text to fail SC 1.4.5 with. The `h1` and the
 * summary already say the title twice in the same fold; a third would be the
 * repetition the /tours listing already has.
 */

/** The share-card ratio, so one crop serves the card, the hero and Open Graph. */
export const COVER_VIEWBOX = { width: 1200, height: 630 } as const;

export interface CoverTrace {
  /** SVG path data in the coordinate space of `COVER_VIEWBOX`. */
  d: string;
  start: [number, number];
  end: [number, number];
}

/** FNV-1a. A hash, not a random: the same slug has to draw the same field on
 *  every machine and in every build. */
function seedOf(slug: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash || 1;
}

const POINTS = 7;
const PADDING = 90;

export function buildCoverTrace(slug: string): CoverTrace {
  let state = seedOf(slug);
  const next = () => {
    // xorshift32 — cheap, deterministic, and enough spread for seven points.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };

  const usableWidth = COVER_VIEWBOX.width - PADDING * 2;
  const usableHeight = COVER_VIEWBOX.height - PADDING * 2;

  const points: [number, number][] = Array.from({ length: POINTS }, (_, index) => {
    const x = PADDING + (usableWidth * index) / (POINTS - 1);
    const y = PADDING + next() * usableHeight;
    return [Math.round(x), Math.round(y)];
  });

  // A Catmull-Rom-ish smoothing: the midpoint of each pair is the join, and the
  // point itself is the control. A polyline of straight segments reads as a
  // chart; a curve reads as a road.
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const [cx, cy] = points[index];
    const [nx, ny] = points[index + 1];
    d += ` Q ${cx} ${cy} ${Math.round((cx + nx) / 2)} ${Math.round((cy + ny) / 2)}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last[0]} ${last[1]}`;

  return { d, start: points[0], end: last };
}
