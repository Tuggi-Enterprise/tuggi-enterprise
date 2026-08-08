"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

import type { StateCoverage } from "@/lib/coverage";
import { getCountryDisplayName } from "@/lib/countryNames";
import {
  DENSITY_STEPS,
  DENSITY_STROKE,
  MAP_FRAME,
  MAP_LAND_FILL,
  MAP_LAND_STROKE,
  MAP_OCEAN_FILL,
  activeCountries,
  createStateFinder,
  densityCuts,
  densityStep,
  norm,
  snapshotCountryOf,
} from "@/lib/coverage-density";

interface Props {
  states: StateCoverage[];
  /**
   * Snapshot country → the name written in the page's language, resolved by
   * the server (`countryLabels`). A prop and not a `useLocale()` call here
   * because this component renders on both sides of hydration, and
   * `Intl.DisplayNames` is the browser's ICU on one side and Node's on the
   * other. Anything missing degrades to the English label (#215).
   */
  countryLabels: Record<string, string>;
  /**
   * The pills that filter the map. Off where the served list below already
   * prints the same names — see `detail` in `CoverageDensityMap` (#217).
   */
  showCountryFilter: boolean;
}

interface FocusedRegion {
  region: string;
  country: string;
  step: number;
}

/** A parsed TopoJSON document, as `react-simple-maps` accepts it. */
type Topology = Record<string, unknown>;
type Geo = { countries: Topology; states: Topology };

/**
 * The drawing half of `CoverageDensityMap` — and only the drawing half.
 *
 * Everything a reader needs is in the section around this component, rendered
 * by the server: the legend, and the full list of countries and regions
 * (DS-COMPONENTE-006). This file is what a browser with JavaScript adds on top,
 * which is why the `<svg>` is `aria-hidden` and nothing inside it is focusable.
 *
 * **Nothing inside the frame may enter the tab order.** `react-simple-maps`
 * hardcodes `tabIndex="0"` on every `<path>` it renders (`Geography`,
 * dist/index.js) — it is not in our JSX, which is why no grep here ever showed
 * it. On /coverage that used to put 4,773 paths in the tab order: the first
 * landed on Tab #48 and 140 consecutive Tabs later focus was still inside the
 * map, unnamed, with `outline: none` in all three states. `restProps` are
 * spread after the library's own attributes, so `tabIndex={-1}` below wins.
 *
 * The TopoJSON is fetched here rather than by `<Geographies geography="url">`
 * for two reasons: both files are served from our own origin (no CDN in the
 * render path of the page's main content), and a failed fetch has to be a state
 * we can draw — spec §3.5, the frame disappears instead of leaving an empty
 * rectangle, because there is nothing the reader could do about it and the
 * information is all in the text below.
 */
export function CoverageDensityCanvas({
  states,
  countryLabels,
  showCountryFilter,
}: Props) {
  const t = useTranslations("Coverage.Density");
  const [geo, setGeo] = useState<Geo | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [focused, setFocused] = useState<FocusedRegion | null>(null);
  // Measured in the pointer handler, not read off the ref while rendering: the
  // tooltip flips side near the right edge, and that decision needs the frame
  // width at the moment the pointer moved.
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, width: 0 });
  const [finePointer, setFinePointer] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = (url: string) =>
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        return res.json();
      });

    Promise.all([load("/countries-world.json"), load("/states-world.json")])
      .then(([countries, statesGeo]) => {
        if (alive) setGeo({ countries, states: statesGeo });
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  // A tooltip pinned to the cursor on a device with no cursor is the classic
  // ghost tooltip that never closes (spec §3.6). Where there is no fine
  // pointer, tapping a region opens the panel below the frame instead.
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setFinePointer(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const countries = useMemo(() => activeCountries(states), [states]);
  const covered = useMemo(() => new Set(countries.map((c) => norm(c))), [countries]);
  const cuts = useMemo(() => densityCuts(states), [states]);
  const findState = useMemo(() => createStateFinder(states), [states]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
    });
  }, []);

  const stepLabel = (step: number) => t(`legend.${DENSITY_STEPS[step].id}`);
  /** Display only. Degrades to the English name, never to a broken cell. */
  const countryLabel = (country: string) =>
    countryLabels[country] ?? getCountryDisplayName(country);
  const flipTooltip = tooltipPos.x > tooltipPos.width * 0.72;

  return (
    <>
      {/* Country filter.
          `aria-pressed` because "which country is selected" is carried by fill
          alone on a map that assistive technology cannot see (SC 1.4.1 /
          4.1.2): these are the controls that stay operable now that the map
          itself is out of the tab order.

          Absent where the served list below already prints the same names
          (#217): 40 touch targets and, at 360 px, a horizontal scroller whose
          continuation is a hidden affordance — a control for operating the map,
          in front of a reader who came to read it. Nothing goes with it: the
          map, the legend, the grouped list and the link out are all rendered
          around this component by the server. */}
      {showCountryFilter && (
      <div className="flex flex-nowrap overflow-x-auto pb-3 -mx-6 px-6 gap-2 mb-6 sm:flex-wrap sm:justify-center sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:mb-8">
        <button
          onClick={() => setSelectedCountry(null)}
          aria-pressed={selectedCountry === null}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${
            selectedCountry === null
              ? "bg-tuggi-primary text-tuggi-dark shadow-lg shadow-tuggi-primary/30"
              : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 cursor-pointer"
          }`}
        >
          {t("filterAll")}
        </button>
        {countries.map((country) => (
          <button
            key={country}
            onClick={() => setSelectedCountry((prev) => (prev === country ? null : country))}
            aria-pressed={selectedCountry === country}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${
              selectedCountry === country
                ? "bg-tuggi-primary text-tuggi-dark shadow-lg shadow-tuggi-primary/30"
                : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 cursor-pointer"
            }`}
          >
            {countryLabel(country)}
          </button>
        ))}
      </div>
      )}

      {!failed && (
        <div
          ref={frameRef}
          data-part="map-frame"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => finePointer && setFocused(null)}
          className="relative w-full max-w-3xl mx-auto rounded-[40px] border border-white/5 overflow-hidden shadow-2xl"
          // The frame's aspect *is* the viewBox's, so the fixed box fills it
          // instead of being letterboxed: the Americas plus Western Europe is a
          // near-square shape (1.057:1), and a 2:1 frame left it covering 60% of
          // the width. Declared from the same constant the projection uses, so
          // there is one place to change if the box ever changes — and the
          // reserved ratio is what keeps the block's CLS at zero.
          style={{
            aspectRatio: `${MAP_FRAME.width} / ${MAP_FRAME.height}`,
            backgroundColor: MAP_OCEAN_FILL,
          }}
        >
          {geo ? (
            <ComposableMap
              projection="geoNaturalEarth1"
              projectionConfig={{ scale: MAP_FRAME.scale, center: MAP_FRAME.center }}
              width={MAP_FRAME.width}
              height={MAP_FRAME.height}
              style={{ width: "100%", height: "100%" }}
              aria-hidden="true"
            >
              {/* Layer 1 — the countries where TUGGI is, and only those.
                  The fixed box runs from the US west coast to Slovenia, which
                  puts West Africa between South America and Europe; drawing
                  every country would put land in the frame that spec §3.9 item
                  3 says is not in it. Drawing the covered ones is also the
                  honest shape of the answer the visitor came for. */}
              <Geographies geography={geo.countries}>
                {({ geographies }) =>
                  geographies
                    .filter((country) => covered.has(norm(snapshotCountryOf(country.properties.name))))
                    .map((country) => (
                      <Geography
                        key={`country-${country.rsmKey}`}
                        geography={country}
                        tabIndex={-1}
                        data-country={snapshotCountryOf(country.properties.name)}
                        style={{
                          default: {
                            fill: MAP_LAND_FILL,
                            stroke: MAP_LAND_STROKE,
                            strokeWidth: 0.4,
                            outline: "none",
                          },
                          hover: {
                            fill: MAP_LAND_FILL,
                            stroke: MAP_LAND_STROKE,
                            strokeWidth: 0.4,
                            outline: "none",
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                }
              </Geographies>

              {/* Layer 2 — density. Four steps, no marker, no pin, nothing
                  countable, and no number anywhere on the drawing. */}
              <Geographies geography={geo.states}>
                {({ geographies }) =>
                  geographies.map((region) => {
                    const data = findState(region.properties.name, region.properties.admin);
                    if (!data || data.activeCount <= 0) {
                      return (
                        <Geography
                          key={`region-${region.rsmKey}`}
                          geography={region}
                          tabIndex={-1}
                          style={{
                            default: { fill: "transparent", stroke: "none", outline: "none" },
                            hover: { fill: "transparent", stroke: "none", outline: "none" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    }

                    const dimmed = selectedCountry !== null && selectedCountry !== data.country;
                    const step = densityStep(data.activeCount, cuts);
                    const fill = dimmed ? MAP_LAND_FILL : DENSITY_STEPS[step].fill;
                    const show = () =>
                      setFocused({ region: data.state, country: data.country, step });

                    return (
                      <Geography
                        key={`region-${region.rsmKey}`}
                        geography={region}
                        tabIndex={-1}
                        data-step={dimmed ? undefined : step}
                        onMouseEnter={() => finePointer && !dimmed && show()}
                        onClick={() => !finePointer && !dimmed && show()}
                        style={{
                          default: {
                            fill,
                            stroke: dimmed ? MAP_LAND_STROKE : DENSITY_STROKE,
                            strokeWidth: 0.35,
                            outline: "none",
                            cursor: dimmed ? "default" : "pointer",
                          },
                          hover: {
                            fill,
                            stroke: dimmed ? MAP_LAND_STROKE : DENSITY_STROKE,
                            strokeWidth: dimmed ? 0.35 : 0.8,
                            outline: "none",
                            cursor: dimmed ? "default" : "pointer",
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-tuggi-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {finePointer && focused && (
            <div
              className="absolute pointer-events-none bg-tuggi-dark/95 border border-white/10 backdrop-blur-md p-5 rounded-2xl shadow-2xl z-20 min-w-[200px]"
              style={{
                left: flipTooltip ? "auto" : tooltipPos.x + 16,
                right: flipTooltip ? tooltipPos.width - tooltipPos.x + 16 : "auto",
                top: Math.max(8, tooltipPos.y - 85),
              }}
            >
              <div className="text-xs font-bold text-gray-300 uppercase tracking-tight mb-1">
                {countryLabel(focused.country)}
              </div>
              <div className="text-lg font-black text-white mb-2 leading-tight">
                {focused.region}
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3 rounded-[3px] shrink-0"
                  style={{ backgroundColor: DENSITY_STEPS[focused.step].fill }}
                />
                <span className="text-xs font-semibold text-gray-300">
                  {stepLabel(focused.step)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Touch: the same reading, in the flow of the page instead of pinned to
          a pointer that does not exist. */}
      {!finePointer && focused && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-[4px] shrink-0"
            style={{ backgroundColor: DENSITY_STEPS[focused.step].fill }}
          />
          <span className="text-sm text-gray-300">
            <span className="font-black text-white">{focused.region}</span>
            {" · "}
            {countryLabel(focused.country)}
            {" · "}
            {stepLabel(focused.step)}
          </span>
        </div>
      )}
    </>
  );
}
