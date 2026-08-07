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
          as good as ours, the comparison communicated nothing (spec §4.6). */}
      <circle
        cx={TRAVELLER.x}
        cy={TRAVELLER.y}
        r={REACH}
        className="fill-slate-100 stroke-tuggi-slate"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      {PLACES.map((place) => (
        <circle
          key={`${place.x}-${place.y}`}
          cx={place.x}
          cy={place.y}
          r={4.5}
          className="fill-tuggi-slate"
        />
      ))}
      <path d={TRAVELLER_PATH} className="fill-tuggi-slate" />
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
      {/* The same reach as column A, kept faint: without it the wedge has no
          scale to be compared against. */}
      <circle
        cx={TRAVELLER.x}
        cy={TRAVELLER.y}
        r={REACH}
        className="fill-none stroke-slate-200"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <path d={CONE_PATH} className="fill-tuggi-primary/15 stroke-tuggi-primary" strokeWidth={1.5} />
      <line
        x1={TRAVELLER.x}
        y1={TRAVELLER.y}
        x2={SIGHT_END.x}
        y2={SIGHT_END.y}
        className="stroke-tuggi-primary"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      {PLACES.filter((place) => !place.inCone).map((place) => (
        <circle
          key={`${place.x}-${place.y}`}
          cx={place.x}
          cy={place.y}
          r={4.5}
          className="fill-slate-300"
        />
      ))}
      <circle
        cx={HIGHLIGHT.x}
        cy={HIGHLIGHT.y}
        r={11}
        className="fill-none stroke-tuggi-dark"
        strokeWidth={1.5}
      />
      <circle cx={HIGHLIGHT.x} cy={HIGHLIGHT.y} r={7} className="fill-tuggi-dark" />
      <path d={TRAVELLER_PATH} className="fill-tuggi-dark" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
          <article className="flex flex-col gap-6">
            <RadiusDrawing />
            <div>
              <h3 className="text-xl font-bold text-tuggi-slate mb-2">{t("radiusLabel")}</h3>
              <p className="text-base text-tuggi-slate leading-relaxed">{t("radiusBody")}</p>
            </div>
          </article>

          {/* The separator is a border on the second column, not an element of
              its own: stacked it is the horizontal rule the spec asks for
              (§4.4 — without it the two columns read as a feature list rather
              than a contrast), and side by side it is the divider between
              them. One declaration, two layouts. */}
          <article className="flex flex-col gap-6 border-t border-slate-200 pt-10 md:border-t-0 md:border-l md:pt-0 md:pl-12">
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
