"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Map as LeafletMap, Marker, Point } from "leaflet";
import "leaflet/dist/leaflet.css";
import { toLatLngs } from "@/lib/tourFormat";

export interface RouteMapStop {
  name: string;
  lat: number | null;
  lng: number | null;
  /** Has a description and/or audio — same rule the itinerary uses. */
  hasContent: boolean;
}

interface RouteMapProps {
  /** GeoJSON LineString coordinates: [lng, lat][]. */
  line: number[][] | null;
  stops: RouteMapStop[];
  /** 1-based position the reader is currently on, highlighted on the map. */
  activeStop?: number | null;
  /** Fired when a pin is tapped, so the page can scroll to that stop. */
  onSelectStop?: (position: number) => void;
  className?: string;
}

/** Brand tokens (see globals.css) — kept literal because Leaflet styles inline. */
const COLOR_PRIMARY = "#00a8e8";

/** Marker diameter in px — also the collision box reserved for every pin. */
const MARKER_SIZE = 26;
/** Horizontal gap between the pin and its label. */
const LABEL_OFFSET_X = 16;
/** Breathing room between two boxes before they count as colliding. */
const COLLISION_PADDING = 4;
/** Longest label before it gets an ellipsis (full name is in the itinerary). */
const LABEL_MAX_CHARS = 28;
/**
 * Below this container width, permanent labels are dropped entirely: on a phone
 * almost every one of them collides anyway, and a map of half-shown names reads
 * as broken. Tapping a pin still reveals its name (and scrolls to the stop).
 *
 * Calibrated against a phone (a 390px screen leaves the map ~340px), NOT against
 * a desktop column — the sticky map column is itself only ~450px, and at 520
 * this rule silently stripped every label on desktop.
 */
const COMPACT_WIDTH = 400;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stop position this box belongs to, so a label can ignore its own pin. */
  owner?: number;
}

interface LabelledStop {
  position: number;
  hasContent: boolean;
  latlng: [number, number];
  marker: Marker;
  point: Point | null;
}

function overlaps(a: Box, b: Box, pad = COLLISION_PADDING): boolean {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

/** Keep labels to one short line — the full name is in the itinerary. */
function truncate(s: string): string {
  const clean = (s || "").trim();
  return clean.length > LABEL_MAX_CHARS
    ? `${clean.slice(0, LABEL_MAX_CHARS - 1).trimEnd()}…`
    : clean;
}

/**
 * Leaflet map: the route line + numbered stop markers, each carrying a
 * permanent name label.
 *
 * Labels lay out with a hand-rolled collision pass (no plugin): stops WITH
 * content claim space first, then the rest in itinerary order. A label that
 * would overlap an already-placed label, another pin, or the container edge is
 * hidden — and comes back as you zoom in.
 *
 * The map is a two-way control: `activeStop` highlights a pin (and pans to it
 * if it scrolled out of view), and tapping a pin reports back via
 * `onSelectStop`. All data comes from props (the static snapshot) — there is NO
 * network call to our backend. Tiles are public CARTO/OSM.
 *
 * The numbered itinerary is the accessible equivalent of this map, so the
 * labels are aria-hidden rather than duplicated to screen readers.
 */
export function RouteMap({
  line,
  stops,
  activeStop = null,
  onSelectStop,
  className,
}: RouteMapProps) {
  // The accessible name of a role="application" region is the only thing a
  // screen reader has to go on here. It was an English literal served inside
  // pt, es and it documents (SC 3.1.2).
  const t = useTranslations("A11y");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const stopsRef = useRef<LabelledStop[]>([]);
  const relayoutRef = useRef<(() => void) | null>(null);
  // Kept in a ref so the marker handlers never close over a stale callback.
  const onSelectRef = useRef(onSelectStop);
  useEffect(() => {
    onSelectRef.current = onSelectStop;
  }, [onSelectStop]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let detach: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      // CARTO Voyager basemap — free, NO API key required (attribution only),
      // and far cleaner cartography than raw OSM tiles. `detectRetina` serves
      // crisp tiles on high-DPI screens.
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
          detectRetina: true,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      const bounds: [number, number][] = [];

      // Route line: white casing underneath, brand line on top. The casing is
      // what keeps the route readable over dark or busy stretches of basemap.
      if (line && line.length > 1) {
        const latlngs = toLatLngs(line);
        L.polyline(latlngs, { color: "#ffffff", weight: 9, opacity: 0.9 }).addTo(map);
        L.polyline(latlngs, { color: COLOR_PRIMARY, weight: 4, opacity: 1 }).addTo(map);
        bounds.push(...latlngs);
      }

      const labelled: LabelledStop[] = [];
      let n = 0;
      stops.forEach((stop) => {
        if (stop.lat == null || stop.lng == null) return;
        n += 1;
        const position = n;
        const icon = L.divIcon({
          className: "tuggi-route-marker",
          html: `<span class="tuggi-pin${stop.hasContent ? "" : " tuggi-pin--muted"}">${position}</span>`,
          iconSize: [MARKER_SIZE, MARKER_SIZE],
          iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
        });
        const marker = L.marker([stop.lat, stop.lng], { icon, title: stop.name }).addTo(map);

        marker.bindTooltip(truncate(stop.name), {
          permanent: true,
          direction: "right",
          offset: [LABEL_OFFSET_X, 0],
          className: "tuggi-stop-label",
          opacity: 1,
        });
        // The numbered itinerary is the accessible version of this.
        marker.getTooltip()?.getElement()?.setAttribute("aria-hidden", "true");

        marker.on("click", () => onSelectRef.current?.(position));
        // A hidden label must still be reachable: hovering the pin forces it on.
        marker.on("mouseover", () => forceLabel(marker, true));
        marker.on("mouseout", () => forceLabel(marker, false));

        labelled.push({
          position,
          hasContent: stop.hasContent,
          latlng: [stop.lat, stop.lng],
          marker,
          point: null,
        });
        bounds.push([stop.lat, stop.lng]);
      });

      stopsRef.current = labelled;

      // Stops that carry content claim label space first; ties by itinerary order.
      const byPriority = [...labelled].sort(
        (a, b) => Number(b.hasContent) - Number(a.hasContent) || a.position - b.position
      );

      /**
       * Show every label that fits, hide the rest. Pins are never hidden, so
       * their boxes are reserved up front and labels lay out around them.
       */
      const layoutLabels = () => {
        const size = map.getSize();
        const compact = size.x < COMPACT_WIDTH;
        const placed: Box[] = [];

        for (const stop of labelled) {
          const p = map.latLngToContainerPoint(stop.latlng);
          stop.point = p;
          placed.push({
            x: p.x - MARKER_SIZE / 2,
            y: p.y - MARKER_SIZE / 2,
            w: MARKER_SIZE,
            h: MARKER_SIZE,
            owner: stop.position,
          });
        }

        for (const stop of byPriority) {
          const el = stop.marker.getTooltip()?.getElement();
          const p = stop.point;
          if (!el || !p) continue;

          if (compact) {
            el.classList.add("is-hidden");
            continue;
          }

          // `.is-hidden` uses `visibility`, so the element keeps its measured
          // size even while hidden — no show/measure/hide flicker.
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          const box: Box = { x: p.x + LABEL_OFFSET_X, y: p.y - h / 2, w, h };

          const offscreen =
            box.x + box.w < 0 || box.x > size.x || box.y + box.h < 0 || box.y > size.y;
          // A label sits 3px from its own pin — closer than the collision
          // padding — so its own pin is the one box it must not be tested against.
          const collides = placed.some(
            (b) => b.owner !== stop.position && overlaps(b, box)
          );

          if (offscreen || collides) {
            el.classList.add("is-hidden");
          } else {
            el.classList.remove("is-hidden");
            placed.push(box);
          }
        }
      };

      const scheduleLayout = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(layoutLabels);
      };
      relayoutRef.current = scheduleLayout;

      map.on("zoomend", scheduleLayout);
      map.on("moveend", scheduleLayout);
      map.on("resize", scheduleLayout);
      detach = () => {
        map.off("zoomend", scheduleLayout);
        map.off("moveend", scheduleLayout);
        map.off("resize", scheduleLayout);
      };

      if (bounds.length) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        map.setView([0, 0], 2);
      }
      scheduleLayout();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      detach?.();
      relayoutRef.current = null;
      stopsRef.current = [];
      const map = mapRef.current;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [line, stops]);

  // Highlight the stop the reader is on, and bring it back into view if the
  // map has drifted away from it.
  useEffect(() => {
    const map = mapRef.current;
    for (const stop of stopsRef.current) {
      const isActive = stop.position === activeStop;
      stop.marker.getElement()?.querySelector(".tuggi-pin")?.classList.toggle("is-active", isActive);
      forceLabel(stop.marker, isActive);
      if (!isActive || !map) continue;
      // `pad(-0.2)` treats the outer fifth of the map as "off screen", so an
      // active pin never ends up hugging an edge.
      if (!map.getBounds().pad(-0.2).contains(stop.latlng)) {
        map.panTo(stop.latlng, { animate: !prefersReducedMotion() });
      }
    }
    relayoutRef.current?.();
  }, [activeStop]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", minHeight: 320 }}
      role="application"
      aria-label={t("routeMap")}
    />
  );
}

function forceLabel(marker: Marker, on: boolean): void {
  marker.getTooltip()?.getElement()?.classList.toggle("is-forced", on);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
