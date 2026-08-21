/**
 * update-coverage.mjs  (v2 — point-in-polygon)
 *
 * Fetches every active attraction's coordinates from
 * core.attraction_coordinate, runs a point-in-polygon test against the
 * Natural Earth 10m TopoJSON (public/states-world.json), and writes a
 * static snapshot to src/data/coverage-snapshot.json.
 *
 * Why PIP instead of text-based city/state lookups:
 *   • 100% of active POIs have coordinates in attraction_coordinate
 *   • Text-based mapping requires huge manual lookup tables per country
 *     (5 000+ unique UK city names alone) and still misses the long tail
 *   • Geographic lookup is country-agnostic, never needs updating, and
 *     is always correct for POIs that have lat/lng
 *
 * Rules:
 *   - Source:    core.attractions JOIN core.attraction_coordinate WHERE is_active=true
 *   - Threshold: only regions with >= STATE_MIN_COUNT POIs appear on map
 *
 * Usage:
 *   npm run update-coverage
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env / .env.local
 */

import { createClient }   from "@supabase/supabase-js";
import { feature as topoFeature } from "topojson-client";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Config ────────────────────────────────────────────────────────────────────
const STATE_MIN_COUNT    = 50;
const PAGE_SIZE_CURSOR   = 2000;

// ── Env ───────────────────────────────────────────────────────────────────────
function loadEnvFile(p) {
  try {
    readFileSync(p, "utf-8").split("\n").forEach(l => {
      const t = l.trim(); if (!t || t.startsWith("#")) return;
      const i = t.indexOf("="); if (i < 0) return;
      const k = t.slice(0, i).trim(), v = t.slice(i+1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    });
  } catch {}
}
loadEnvFile(join(ROOT, ".env.local"));
loadEnvFile(join(ROOT, ".env"));

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Accept-Encoding is set explicitly: supabase-js runs on undici, which does NOT
// negotiate compression by itself, so every page arrived uncompressed. The server
// does support it (measured: 289 KB -> 90 KB per 2 000-row page, 3.2x less to move)
// and undici decodes it transparently.
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "core" },
  global: { headers: { "Accept-Encoding": "gzip" } }
});

// ── Load TopoJSON + build spatial index ──────────────────────────────────────
console.log("🌍  Tuggi Coverage Snapshot");
console.log("────────────────────────────");
process.stdout.write("   Loading TopoJSON...");

const topoRaw  = JSON.parse(readFileSync(join(ROOT, "public/states-world.json"), "utf-8"));
const geoFeats = topoFeature(topoRaw, topoRaw.objects.ne_10m_admin_1_states_provinces).features;

// Pre-compute bounding boxes [minLng, minLat, maxLng, maxLat]
function geomBbox(geom) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const visit = coords => {
    for (const c of coords) {
      if (Array.isArray(c[0])) { visit(c); continue; }
      if (c[0] < minLng) minLng = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[0] > maxLng) maxLng = c[0];
      if (c[1] > maxLat) maxLat = c[1];
    }
  };
  visit(geom.coordinates);
  return [minLng, minLat, maxLng, maxLat];
}

// Filter out null-geometry features (disputed territories, etc.)
const validFeats  = geoFeats.filter(f => f.geometry?.coordinates?.length);
const bboxes      = validFeats.map(f => geomBbox(f.geometry));

// Grid index: 1° cells → list of feature indices whose bbox overlaps that cell
const GRID = 1;
const gridIndex = new Map();
bboxes.forEach(([x0, y0, x1, y1], i) => {
  for (let lat = Math.floor(y0/GRID)*GRID; lat <= Math.ceil(y1/GRID)*GRID; lat += GRID) {
    for (let lng = Math.floor(x0/GRID)*GRID; lng <= Math.ceil(x1/GRID)*GRID; lng += GRID) {
      const k = `${lat}|${lng}`;
      if (!gridIndex.has(k)) gridIndex.set(k, []);
      gridIndex.get(k).push(i);
    }
  }
});

console.log(` ${geoFeats.length} features, ${gridIndex.size} grid cells`);

// ── Point-in-polygon (ray casting, handles Polygon + MultiPolygon) ─────────
function pointInRing(lat, lng, ring) {
  // ring is [[lng, lat], ...] — GeoJSON coordinate order
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInGeom(lat, lng, geom) {
  if (geom.type === "Polygon") {
    const [outer, ...holes] = geom.coordinates;
    if (!pointInRing(lat, lng, outer)) return false;
    return !holes.some(h => pointInRing(lat, lng, h));
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.some(([outer, ...holes]) => {
      if (!pointInRing(lat, lng, outer)) return false;
      return !holes.some(h => pointInRing(lat, lng, h));
    });
  }
  return false;
}

function findRegion(lat, lng) {
  const cellLat = Math.floor(lat / GRID) * GRID;
  const cellLng = Math.floor(lng / GRID) * GRID;
  const candidates = gridIndex.get(`${cellLat}|${cellLng}`) || [];
  for (const i of candidates) {
    const [x0, y0, x1, y1] = bboxes[i];
    // Quick bbox rejection before expensive polygon test
    if (lng < x0 || lng > x1 || lat < y0 || lat > y1) continue;
    if (pointInGeom(lat, lng, validFeats[i].geometry)) {
      return validFeats[i].properties; // { name, admin }
    }
  }
  return null;
}

// ── DB-state fallback for areas with incomplete TopoJSON coverage ─────────────
// The Natural Earth 10m TopoJSON has known gaps: the "Baleares" polygon only
// covers Mallorca (Ibiza, Formentera, Menorca polygons are absent). When PIP
// returns null, we check the DB's country+state fields to salvage these POIs.
// Keys are lower-cased DB state values; values are { region, admin } matching
// the TopoJSON properties format.
const DB_STATE_FALLBACK = {
  // Spain — Balearic Islands: community name → TopoJSON province
  "illes balears":    { name: "Baleares", admin: "Spain" },
  "balearic islands": { name: "Baleares", admin: "Spain" },
  "islas baleares":   { name: "Baleares", admin: "Spain" },
  "baleares":         { name: "Baleares", admin: "Spain" },
  // Canary Islands — two provinces; without per-island coordinates we assign
  // to Santa Cruz de Tenerife as the larger/western group
  "canarias":         { name: "Santa Cruz de Tenerife", admin: "Spain" },
  "islas canarias":   { name: "Santa Cruz de Tenerife", admin: "Spain" },
  "canary islands":   { name: "Santa Cruz de Tenerife", admin: "Spain" },
};

// ── Fetch all active attractions with their coordinates ───────────────────────────
// Uses embedded FK select: attraction_coordinate is 1:1 with attractions via
// attraction_coordinate.attraction_id FK → attractions.id
// Also fetches state for DB-fallback when PIP returns null.
//
// PERF: PostgREST caps every response at db-max-rows (2 000 here) regardless of
// the limit asked for, so ~2.6M active rows means ~1 300 requests no matter what.
// Issuing them one after another WAS the entire runtime (~50 min at ~0.5 req/s);
// the point-in-polygon pass costs well under a minute of CPU. The id space is
// split into 256 UUID-prefix ranges drained by a shared worker pool, so requests
// overlap instead of queueing. Measured end to end on the full 2.6M rows: ~52 min
// sequential -> ~25 min, a sustained ~1 640 rows/s. Note that a warm microbenchmark
// suggested far more (~10 req/s); it was re-hitting the same cached first pages.
// Deep cold pagination is server-bound, so ~2x is what the client side can buy.
//
// Concurrency is deliberately modest: this runs against the production database
// that also serves the app and the CMS. Raising it past 12 mostly raised
// per-request latency — that headroom is not ours to take.
//
// Getting past ~25 min means stopping the 2.6M-row transfer altogether, which
// needs the region assignment aggregated DB-side (PostGIS is already installed;
// core.mv_poi_geo_counts is the existing precedent). That is a schema change.
//
// 256 ranges instead of one per worker because the prefix histogram is not flat
// (prefix "2" carries ~2x the average). Many small ranges pulled from a queue
// keep a heavy one from becoming the tail; one range per worker would not.
const FETCH_CONCURRENCY = 12;

const ID_RANGES = (() => {
  const hex    = "0123456789abcdef";
  const asUuid = prefix => `${prefix}000000-0000-0000-0000-000000000000`;
  const prefixes = [];
  for (const a of hex) for (const b of hex) prefixes.push(a + b);
  return prefixes.map((prefix, i) => ({
    from: asUuid(prefix),
    to:   i + 1 < prefixes.length ? asUuid(prefixes[i + 1]) : null, // last range is open-ended
  }));
})();

let fetchedTotal = 0;

// Walks one id range to exhaustion, paging on the id cursor within it.
async function fetchRange({ from, to }) {
  const out = [];
  let cursor = from, firstPage = true;

  while (true) {
    let data, error, retries = 0;
    while (retries < 5) {
      let q = sb
        .from("attractions")
        .select("id, state, attraction_coordinate!inner(latitude, longitude)")
        .eq("is_active", true)
        .order("id")
        .limit(PAGE_SIZE_CURSOR);
      q = firstPage ? q.gte("id", cursor) : q.gt("id", cursor);
      if (to) q = q.lt("id", to);

      ({ data, error } = await q);
      if (!error) break;
      if (!error.message?.includes("timeout")) throw new Error("Fetch error: " + (error.message || JSON.stringify(error)));
      retries++;
      await new Promise(r => setTimeout(r, 2000 * retries));
    }
    if (error) throw new Error("Fetch error after retries: " + error.message);
    if (!data || data.length === 0) break;

    for (const r of data) {
      const coord = Array.isArray(r.attraction_coordinate)
        ? r.attraction_coordinate[0]
        : r.attraction_coordinate;
      if (coord?.latitude != null && coord?.longitude != null) {
        out.push({ id: r.id, lat: coord.latitude, lng: coord.longitude, dbState: r.state });
      }
    }

    fetchedTotal += data.length;
    if (data.length < PAGE_SIZE_CURSOR) break; // short page = range exhausted
    cursor    = data[data.length - 1].id;
    firstPage = false;
  }

  return out;
}

async function fetchAllWithCoords() {
  const { count: planned } = await sb
    .from("attractions")
    .select("*", { count: "planned", head: true })
    .eq("is_active", true);

  console.log(`   Estimated: ~${(planned || 0).toLocaleString()} rows`);

  const queue = [...ID_RANGES];
  const rows  = [];
  let doneRanges = 0;

  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, async () => {
    while (queue.length) {
      const range = queue.shift();
      const got   = await fetchRange(range);
      for (const r of got) rows.push(r); // not push(...got): spreading blows the stack on big ranges
      doneRanges++;
      process.stdout.write(`\r   Fetching... ${doneRanges}/${ID_RANGES.length} ranges, ${rows.length.toLocaleString()} rows   `);
    }
  }));

  // Rows come back in range-completion order, not id order. Nothing downstream
  // depends on the order: the PIP pass only counts into a Map.
  process.stdout.write(`\r   Fetched ${fetchedTotal.toLocaleString()} rows, coords resolved: ${rows.length.toLocaleString()}        \n`);
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allRows = await fetchAllWithCoords();

process.stdout.write("   Running point-in-polygon...");
const stateMap = new Map();
let fallbackCount = 0;

for (const { lat, lng, dbState } of allRows) {
  let props = findRegion(lat, lng);

  // DB-state fallback for TopoJSON coverage gaps (Ibiza, Formentera, Menorca…)
  if (!props && dbState) {
    props = DB_STATE_FALLBACK[dbState.toLowerCase().trim()] || null;
    if (props) fallbackCount++;
  }

  if (!props?.name || !props?.admin) continue;
  const key = `${props.name}||${props.admin}`;
  stateMap.set(key, (stateMap.get(key) || 0) + 1);
}

console.log(` done (${fallbackCount.toLocaleString()} via DB-state fallback)`);

// ── Apply threshold ───────────────────────────────────────────────────────────
const states = [];
stateMap.forEach((count, key) => {
  if (count < STATE_MIN_COUNT) return;
  const sep   = key.indexOf("||");
  const state   = key.slice(0, sep);
  const country = key.slice(sep + 2);
  states.push({ state, country, activeCount: count, comingSoonCount: 0 });
});
states.sort((a, b) => b.activeCount - a.activeCount);

// ── Totals ────────────────────────────────────────────────────────────────────
const totalActiveRaw       = allRows.length;
const totalActive          = states.reduce((s, r) => s + r.activeCount, 0);
const totalActiveCountries = new Set(states.map(s => s.country)).size;
const totalActiveRegions   = states.length;
const byCountry            = {};
states.forEach(s => { byCountry[s.country] = (byCountry[s.country] || 0) + s.activeCount; });

// ── Write snapshot ────────────────────────────────────────────────────────────
const snapshot = {
  states,
  totalActiveRaw,
  totalActive,
  totalComingSoon:      0,
  totalCountries:       totalActiveCountries,
  totalActiveCountries,
  totalActiveRegions,
  generatedAt: new Date().toISOString(),
};

const outPath = join(ROOT, "src/data/coverage-snapshot.json");
writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");

console.log("");
console.log("✅  Snapshot saved → src/data/coverage-snapshot.json");
console.log("");
console.log(`   Source             : core.attractions ⋈ attraction_coordinate WHERE is_active=true`);
console.log(`   Method             : point-in-polygon (Natural Earth 10m TopoJSON)`);
console.log(`   State threshold    : >= ${STATE_MIN_COUNT} items`);
console.log(`   Raw total (active) : ${totalActiveRaw.toLocaleString()}  ← hero stat`);
console.log(`   After threshold    : ${totalActive.toLocaleString()} (in ${totalActiveRegions} regions)  ← map only`);
console.log(`   Countries          : ${totalActiveCountries}`);
console.log("");
console.log("   By country:");
Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) =>
  console.log(`     ${String(n).padStart(8).replace(/\B(?=(\d{3})+(?!\d))/g,",")}  ${c}`));
console.log("");
console.log("   States breakdown:");
const byC = {};
states.forEach(s => { if (!byC[s.country]) byC[s.country] = 0; byC[s.country]++; });
Object.entries(byC).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) =>
  console.log(`     ${String(n).padStart(4)} regions  ${c}`));
console.log("");
console.log("👉  Commit src/data/coverage-snapshot.json and push to deploy.");
