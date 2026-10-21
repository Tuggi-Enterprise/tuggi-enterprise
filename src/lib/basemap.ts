/**
 * The basemap under `RouteMap`: which tile server, and the credit it requires.
 *
 * CARTO Voyager is the look the tour pages were designed on. Since 2026-09-25
 * CARTO no longer serves raster tiles without a key: every keyless request gets
 * the same placeholder tile reading "API KEY REQUIRED" (card #989,
 * https://docs.carto.com/faqs/carto-basemaps). The key is free for commercial
 * use within the monthly allowance of the basemap terms
 * (https://carto.com/legal/basemap-terms/), is restricted by host in the CARTO
 * dashboard, and is therefore safe in the browser bundle.
 *
 * It is read at BUILD time: `NEXT_PUBLIC_*` is inlined by `next build`, so a new
 * value needs a new deploy (Vercel project variables, and Settings > Build >
 * Variables on the Cloudflare Worker).
 *
 * ABSENT IS A LEGAL STATE. Without a key the map falls back to the standard
 * OpenStreetMap tiles, which need none, instead of drawing a grid of
 * placeholders. That covers local builds, the e2e suite, and production until
 * the key exists. The OSM tile policy tolerates this as a stopgap and warns it
 * can be withdrawn, so the key is the intended state in production
 * (https://operations.osmfoundation.org/policies/tiles/).
 */

import type { TileLayerOptions } from "leaflet";

const CARTO_BASEMAPS_KEY = (process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY ?? "").trim();

const OSM_CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export interface Basemap {
  url: string;
  /**
   * Passed straight to `L.tileLayer`. `attribution` is mandatory here because
   * both providers require the credit visible on the map.
   */
  options: TileLayerOptions & { attribution: string };
}

/** Tile source for a given key; takes the key as a parameter so both branches can be checked. */
export function basemapFor(key: string): Basemap {
  if (key) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
      options: {
        subdomains: "abcd",
        maxZoom: 20,
        // One zoom level deeper on high-DPI screens: crisp, at four times the tiles.
        detectRetina: true,
        attribution: `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
      },
    };
  }
  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    // A stopgap on a volunteer-run server: no extra tiles for sharpness.
    options: { maxZoom: 19, attribution: OSM_CREDIT },
  };
}

/** The basemap this build ships with. */
export const BASEMAP: Basemap = basemapFor(CARTO_BASEMAPS_KEY);
