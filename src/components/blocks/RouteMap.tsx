"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { toLatLngs } from "@/lib/tourFormat";

export interface RouteMapStop {
  name: string;
  lat: number | null;
  lng: number | null;
  isGeneric: boolean;
}

interface RouteMapProps {
  /** GeoJSON LineString coordinates: [lng, lat][]. */
  line: number[][] | null;
  stops: RouteMapStop[];
  className?: string;
}

/**
 * Lightweight Leaflet map: draws the route line + numbered stop markers.
 * All data comes from props (the static snapshot) — there is NO network call
 * to our backend. Tiles are public OpenStreetMap. Loaded client-side only
 * (Leaflet needs `window`); the page also renders a no-JS static summary.
 */
export function RouteMap({ line, stops, className }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;

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

      // Route line
      if (line && line.length > 1) {
        const latlngs = toLatLngs(line);
        L.polyline(latlngs, {
          color: "#2563eb",
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
        bounds.push(...latlngs);
      }

      // Numbered stop markers
      let n = 0;
      stops.forEach((stop) => {
        if (stop.lat == null || stop.lng == null) return;
        n += 1;
        const label = String(n);
        const color = stop.isGeneric ? "#64748b" : "#2563eb";
        const icon = L.divIcon({
          className: "tuggi-route-marker",
          html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};color:#fff;font-weight:800;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff">${label}</span>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const marker = L.marker([stop.lat, stop.lng], { icon, title: stop.name }).addTo(map);
        marker.bindPopup(`<strong>${n}. ${escapeHtml(stop.name)}</strong>`);
        marker.on("click", () => {
          // Jump to the matching stop card in the itinerary.
          if (typeof window !== "undefined") {
            window.location.hash = `stop-${n}`;
          }
        });
        bounds.push([stop.lat, stop.lng]);
      });

      if (bounds.length) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        map.setView([0, 0], 2);
      }
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove?: () => void } | null;
      if (map && typeof map.remove === "function") {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [line, stops]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", minHeight: 360 }}
      role="application"
      aria-label="Interactive route map"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
