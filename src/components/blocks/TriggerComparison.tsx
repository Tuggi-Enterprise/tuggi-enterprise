import { useTranslations } from "next-intl";

/**
 * How the trigger decides, drawn as a comparison — spec §4 of
 * docs/design/spec-repaginacao-site-2026-08.md (card #193, component 4.4).
 *
 * It replaces TechEngine, which staged a console: `lat, lng`, `heading`,
 * `speed`, `Audio.play()` and `200 OK`, seven English strings outside i18n
 * (DS-COPY-001) describing the technology instead of the behaviour
 * (DS-COPY-004 item 3). Two orphan simulators went with it in the same commit.
 *
 * Three properties are load-bearing and none of them is decoration:
 *
 *  1. **The comparison is the message.** Neither column says anything on its
 *     own; a proximity radius is not wrong, it is a different decision. So the
 *     two drawings share one coordinate space (see GEOMETRY) — same traveller,
 *     same five places, same reach. What changes between them is which places
 *     the trigger keeps.
 *  2. **The drawing is static SVG, server-rendered.** No `"use client"`, no
 *     `setInterval`, no loop: the block reads identically with JavaScript
 *     disabled, which is the state the previous simulator failed at 20 frames
 *     per second, forever, on every page load.
 *  3. **The text carries the whole argument, so the SVG is `aria-hidden`.**
 *     The label and the sentence next to each drawing say what the picture
 *     says; an `alt` here would be a third copy of the same sentence, written
 *     by whoever touched the file last (DS-A11Y-004).
 *
 * BR-MAPA-005 / DS-COPY-003: "direction of movement" and "line of sight"
 * describe how the trigger *chooses*, and lead nobody anywhere. Nothing in
 * this block's copy may promise a route, an ETA or a recalculation, and the
 * contrast is between two trigger modes — never between Tuggi and a navigation
 * app.
 */

/* -------------------------------------------------------------------------- */
/* Geometry — one coordinate space, shared by both drawings                     */
/* -------------------------------------------------------------------------- */

const VIEW_BOX = "0 0 200 140";

/** Where the traveller stands in both drawings, and how far the trigger reaches. */
const TRAVELLER = { x: 70, y: 70 };
const REACH = 52;

/**
 * The five places, identical in both columns.
 *
 * `inCone` is not a style flag: it is true for the one place whose bearing
 * from the traveller falls inside the wedge — 11.3° against the 20° half-angle
 * CONE_EDGE is built from. Moving a coordinate without redoing that arithmetic
 * is how a drawing starts contradicting its own caption.
 */
const PLACES = [
  { x: 40, y: 45, inCone: false },
  { x: 35, y: 95, inCone: false },
  { x: 95, y: 40, inCone: false },
  { x: 110, y: 78, inCone: true },
  { x: 75, y: 112, inCone: false },
] as const;

const HIGHLIGHT = PLACES.find((place) => place.inCone)!;

/** The wedge, ±20° around the direction of movement, closed by the reach arc. */
const CONE_EDGE = { top: { x: 118.86, y: 52.21 }, bottom: { x: 118.86, y: 87.79 } };
const CONE_PATH =
  `M${TRAVELLER.x} ${TRAVELLER.y} ` +
  `L${CONE_EDGE.top.x} ${CONE_EDGE.top.y} ` +
  `A${REACH} ${REACH} 0 0 1 ${CONE_EDGE.bottom.x} ${CONE_EDGE.bottom.y} Z`;

/** The line of sight: from the traveller, through the kept place, to the reach. */
const SIGHT_END = { x: 120.99, y: 80.2 };

/**
 * The traveller, pointing the way he is moving. A dot would do here and it is
 * the wrong mark: direction is the entire difference between the two columns,
 * and a dot has none.
 */
const TRAVELLER_PATH = "M60 60 L82 70 L60 80 L66 70 Z";

/* -------------------------------------------------------------------------- */
/* The two drawings                                                            */
/* -------------------------------------------------------------------------- */

const SVG_CLASS = "w-full h-auto";

/**
 * The ink of the shared coordinate space — the reach and the five places —
 * drawn identically in both columns, because they *are* the same objects.
 * They were not: the reach was `stroke-tuggi-slate` in A and `stroke-slate-200`
 * in B (5.98:1 against 1.23:1 on white), and the places were `fill-tuggi-slate`
 * in A against `fill-slate-300` in B (5.46:1 against 1.49:1). The premise the
 * caption states — same traveller, same five places, same reach — was legible
 * in one column only, which is card #212.
 *
 * The neutral ink is `--color-tuggi-slate` at 80%, which composites to 3.82:1
 * on the section's white: above the 3:1 SC 1.4.11 asks of a graphical object
 * that carries meaning, and far enough below the cone's 4.85:1 that B reads as
 * the stronger drawing — which is the relative ruler spec §4.2 sets. The full
 * token is 5.98:1 and wins against the cone; the next step down in the neutral
 * scale, `slate-400`, is 2.63:1 and fails 1.4.11, so the softened token is
 * what fits between the two bounds.
 */
const SHARED_STROKE = "stroke-tuggi-slate/80";
const SHARED_FILL = "fill-tuggi-slate/80";

/**
 * `data-part` names each shape. The drawings are `aria-hidden` and have no
 * accessible name by design, so this is the only handle the contrast check has
 * on them — and locating a shape by the colour under test is how a check goes
 * green against an empty locator.
 */

function RadiusDrawing() {
  return (
    <svg
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid meet"
      className={SVG_CLASS}
      aria-hidden="true"
      focusable="false"
    >
      {/* Neutral throughout, and deliberately so: if the industry column looks
          as good as ours, the comparison communicated nothing (spec §4.6). The
          disc this circle used to be filled with (`fill-slate-100`) is what
          made the neutral column the heaviest object on the page — an outline
          says the same thing and says it more quietly. */}
      <circle
        data-part="reach"
        cx={TRAVELLER.x}
        cy={TRAVELLER.y}
        r={REACH}
        className={`fill-none ${SHARED_STROKE}`}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      {PLACES.map((place) => (
        <circle
          key={`${place.x}-${place.y}`}
          data-part="place"
          cx={place.x}
          cy={place.y}
          r={4.5}
          className={SHARED_FILL}
        />
      ))}
      <path data-part="traveller" d={TRAVELLER_PATH} className={SHARED_FILL} />
    </svg>
  );
}

function ConeDrawing() {
  return (
    <svg
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid meet"
      className={SVG_CLASS}
      aria-hidden="true"
      focusable="false"
    >
      {/* The same reach as column A, drawn the same way: without it the wedge
          has no scale to be compared against, and drawn fainter than A's it
          says the two reaches differ, which is the opposite of the caption. */}
      <circle
        data-part="reach"
        cx={TRAVELLER.x}
        cy={TRAVELLER.y}
        r={REACH}
        className={`fill-none ${SHARED_STROKE}`}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      {/* The stroke is `--color-tuggi-primary-text`, not `--color-tuggi-primary`
          — spec §4.2, corrected 2026-08-07. Brand cyan on white is 2.70:1: it
          fails SC 1.4.11 and, worse here, loses to the neutral column, so the
          drawing argues against its own caption. #007aa5 is 4.85:1, and it is
          the same token, for the same reason, that the player's seek bar uses
          as `accent-color`. Brand cyan stays as the low-opacity *fill* of the
          wedge, which is an area and not the object that carries the meaning. */}
      <path
        data-part="cone"
        d={CONE_PATH}
        className="fill-tuggi-primary/15 stroke-tuggi-primary-text"
        strokeWidth={1.5}
      />
      <line
        data-part="sight"
        x1={TRAVELLER.x}
        y1={TRAVELLER.y}
        x2={SIGHT_END.x}
        y2={SIGHT_END.y}
        className="stroke-tuggi-primary-text"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      {PLACES.filter((place) => !place.inCone).map((place) => (
        <circle
          key={`${place.x}-${place.y}`}
          data-part="place"
          cx={place.x}
          cy={place.y}
          r={4.5}
          className={SHARED_FILL}
        />
      ))}
      {/* What separates the kept place from the other four is form — a ring
          and a darker disc — not a contrast so low the four disappear
          (DS-A11Y-003). Five places have to be visible for one of them to
          read as chosen. */}
      <circle
        data-part="highlight"
        cx={HIGHLIGHT.x}
        cy={HIGHLIGHT.y}
        r={11}
        className="fill-none stroke-tuggi-dark"
        strokeWidth={1.5}
      />
      <circle cx={HIGHLIGHT.x} cy={HIGHLIGHT.y} r={7} className="fill-tuggi-dark" />
      <path data-part="traveller" d={TRAVELLER_PATH} className="fill-tuggi-dark" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

export function TriggerComparison() {
  const t = useTranslations("Technology.Comparison");

  return (
    <section className="py-24 bg-white border-b border-gray-100">
      <div className="page-shell">
        <div className="max-w-3xl mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-tuggi-slate leading-relaxed">{t("subtitle")}</p>
        </div>

        {/* items-stretch (the grid default) is what keeps the two columns the
            same height when one label wraps to two lines in Italian: a
            comparison whose halves do not line up stops reading as one. Height
            comes from the grid, never from a min-height (DS-A11Y-005). */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
          {/* Side by side, the divider is its own line hung in the gap, and it
              is absolutely positioned so it is not a grid item and takes width
              from neither column. It used to be a left border plus `md:pl-12`
              on column B, and that padding came out of B's coordinate space:
              the same viewBox rendered 8-15% narrower there, so A's radius drew
              larger than B's reach — the picture said the two reaches differ,
              which is the one thing the block exists to deny — and the two
              <h3> landed 34 px out of line (card #212). Stacked, the rule is
              still a border on B: at 360 px there is no gap to hang it in. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-slate-200 md:block"
          />

          <article className="flex flex-col gap-6">
            <RadiusDrawing />
            <div>
              <h3 className="text-xl font-bold text-tuggi-slate mb-2">{t("radiusLabel")}</h3>
              <p className="text-base text-tuggi-slate leading-relaxed">{t("radiusBody")}</p>
            </div>
          </article>

          <article className="flex flex-col gap-6 border-t border-slate-200 pt-10 md:border-t-0 md:pt-0">
            <ConeDrawing />
            <div>
              <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("coneLabel")}</h3>
              <p className="text-base text-tuggi-slate leading-relaxed">{t("coneBody")}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
