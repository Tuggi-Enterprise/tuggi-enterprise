/**
 * coverage-density.ts — everything the coverage map decides before it draws.
 *
 * Kept out of the component on purpose: the frame, the density steps, the
 * TopoJSON-to-snapshot matching and the grouping of the textual alternative are
 * all testable without a browser, and the expensive half of this file
 * (`REGION_MAPPINGS`, ~130 lines of province-to-region matching built by hand)
 * is the part nobody should ever have to rebuild.
 *
 * **What this module may and may not publish.** It reads
 * `src/data/coverage-snapshot.json`, which is frozen at 2026-07-13 and counts by
 * a threshold criterion of its own (`STATE_MIN_COUNT = 50` in
 * `scripts/update-coverage.mjs`). BR-COMUNICACAO-002 draws the line: the
 * snapshot may feed **data navigation** — which countries and regions exist, and
 * how dense each one is relative to the others — and may not feed a **number
 * presented as a claim**. So nothing here returns a count for display. The
 * density step is an ordinal (0–3), and the textual alternative lists names.
 * Published coverage figures come from `lib/product-facts.ts`, which reads the
 * rule and not this file.
 */

import type { StateCoverage } from "./coverage";
import { getCountryDisplayName, localizedCountryLabel } from "./countryNames";

// ── Normalise: lowercase + strip combining diacritics + trim ─────────────────
export const norm = (s: string) =>
  s ? s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim() : "";

// ── Province / district → DB region mappings (TopoJSON name → snapshot state) ─
// Spain: provinces → autonomous communities
export const REGION_MAPPINGS: Record<string, string> = {
  // Spain — Andalucía
  "sevilla":"Andalucía","malaga":"Andalucía","cadiz":"Andalucía","huelva":"Andalucía",
  "cordoba":"Andalucía","jaen":"Andalucía","granada":"Andalucía","almeria":"Andalucía",
  // Spain — Catalunya
  "barcelona":"Catalunya","tarragona":"Catalunya","lleida":"Catalunya","gerona":"Catalunya","girona":"Catalunya",
  // Spain — Comunidad de Madrid
  "madrid":"Comunidad de Madrid",
  // Spain — Comunitat Valenciana
  "valencia":"Comunitat Valenciana","alicante":"Comunitat Valenciana","castellon":"Comunitat Valenciana",
  // Spain — Aragón
  "zaragoza":"Aragón","huesca":"Aragón","teruel":"Aragón",
  // Spain — Galicia
  "la coruna":"Galicia","lugo":"Galicia","orense":"Galicia","pontevedra":"Galicia",
  // Spain — Extremadura
  "badajoz":"Extremadura","caceres":"Extremadura",
  // Spain — Illes Balears
  "palma":"Illes Balears","illes balears":"Illes Balears","baleares":"Illes Balears",
  // Spain — Castilla y León
  "valladolid":"Castilla y León","burgos":"Castilla y León","leon":"Castilla y León",
  "salamanca":"Castilla y León","zamora":"Castilla y León","palencia":"Castilla y León",
  "avila":"Castilla y León","segovia":"Castilla y León","soria":"Castilla y León",
  // Spain — Canarias
  "las palmas":"Canarias","santa cruz de tenerife":"Canarias",
  // Spain — Euskadi
  "gipuzkoa":"Euskadi","guipuzcoa":"Euskadi","bizkaia":"Euskadi","vizcaya":"Euskadi",
  "alava":"Euskadi","araba":"Euskadi",
  // Spain — Navarra
  "navarra":"Navarra",
  // Spain — Asturias
  "asturias":"Asturias / Asturies",
  // Spain — Cantabria
  "cantabria":"Cantabria",
  // Spain — La Rioja
  "la rioja":"La Rioja",
  // Spain — Región de Murcia (fuzzy will catch "murcia" → "región de murcia")
  // Spain — Castilla-La Mancha
  "toledo":"Castilla-La Mancha","ciudad real":"Castilla-La Mancha","albacete":"Castilla-La Mancha",
  "cuenca":"Castilla-La Mancha","guadalajara":"Castilla-La Mancha",

  // Italy — provinces → English canonical region names (as used by Natural Earth TopoJSON)
  "bologna":"Emilia-Romagna","modena":"Emilia-Romagna","parma":"Emilia-Romagna",
  "reggio nell'emilia":"Emilia-Romagna","ravenna":"Emilia-Romagna","rimini":"Emilia-Romagna",
  "ferrara":"Emilia-Romagna","forli-cesena":"Emilia-Romagna","piacenza":"Emilia-Romagna",
  "genova":"Liguria","la spezia":"Liguria","savona":"Liguria","imperia":"Liguria",
  "trento":"Trentino-Alto Adige/Südtirol","bozen":"Trentino-Alto Adige/Südtirol",
  "bolzano":"Trentino-Alto Adige/Südtirol",
  "milano":"Lombardy","bergamo":"Lombardy","brescia":"Lombardy","como":"Lombardy",
  "lecco":"Lombardy","lodi":"Lombardy","mantova":"Lombardy","monza e brianza":"Lombardy",
  "pavia":"Lombardy","sondrio":"Lombardy","varese":"Lombardy",
  "venezia":"Veneto","verona":"Veneto","padova":"Veneto","vicenza":"Veneto",
  "treviso":"Veneto","rovigo":"Veneto","belluno":"Veneto",
  "torino":"Piedmont","alessandria":"Piedmont","asti":"Piedmont","biella":"Piedmont",
  "cuneo":"Piedmont","novara":"Piedmont","verbano-cusio-ossola":"Piedmont","vercelli":"Piedmont",
  "trieste":"Friuli Venezia Giulia","udine":"Friuli Venezia Giulia",
  "pordenone":"Friuli Venezia Giulia","gorizia":"Friuli Venezia Giulia",
  "firenze":"Tuscany","pisa":"Tuscany","siena":"Tuscany","arezzo":"Tuscany",
  "grosseto":"Tuscany","livorno":"Tuscany","lucca":"Tuscany","massa-carrara":"Tuscany",
  "pistoia":"Tuscany","prato":"Tuscany",
  "roma":"Lazio","viterbo":"Lazio","frosinone":"Lazio","latina":"Lazio","rieti":"Lazio",
  "napoli":"Campania","salerno":"Campania","caserta":"Campania","avellino":"Campania","benevento":"Campania",
  "palermo":"Sicily","catania":"Sicily","messina":"Sicily","siracusa":"Sicily",
  "agrigento":"Sicily","trapani":"Sicily","ragusa":"Sicily","caltanissetta":"Sicily","enna":"Sicily",
  "cagliari":"Sardinia","sassari":"Sardinia","nuoro":"Sardinia","oristano":"Sardinia",
  "sud sardegna":"Sardinia",
  "bari":"Apulia","lecce":"Apulia","taranto":"Apulia","foggia":"Apulia","brindisi":"Apulia","bat":"Apulia",
  "ancona":"The Marches","macerata":"The Marches","pesaro e urbino":"The Marches",
  "fermo":"The Marches","ascoli piceno":"The Marches",
  "aosta":"Aosta Valley",
  "potenza":"Basilicata","matera":"Basilicata",
  "catanzaro":"Calabria","cosenza":"Calabria","reggio di calabria":"Calabria",
  "vibo valentia":"Calabria","crotone":"Calabria",
  "l'aquila":"Abruzzo","chieti":"Abruzzo","pescara":"Abruzzo","teramo":"Abruzzo",
  "perugia":"Umbria","terni":"Umbria",
  "campobasso":"Molise","isernia":"Molise",

  // France — departments → modern regions (post-2016 boundaries in DB)
  "ariege":"Occitanie","aude":"Occitanie","aveyron":"Occitanie","gard":"Occitanie",
  "haute-garonne":"Occitanie","gers":"Occitanie","herault":"Occitanie","lot":"Occitanie",
  "lozere":"Occitanie","hautes-pyrenees":"Occitanie","pyrenees-orientales":"Occitanie",
  "tarn":"Occitanie","tarn-et-garonne":"Occitanie",
  "alpes-de-haute-provence":"Provence-Alpes-Côte d'Azur",
  "hautes-alpes":"Provence-Alpes-Côte d'Azur",
  "alpes-maritimes":"Provence-Alpes-Côte d'Azur",
  "bouches-du-rhone":"Provence-Alpes-Côte d'Azur",
  "var":"Provence-Alpes-Côte d'Azur","vaucluse":"Provence-Alpes-Côte d'Azur",
  // France — Île-de-France
  "paris":"Île-de-France","seine-et-marne":"Île-de-France","yvelines":"Île-de-France",
  "essonne":"Île-de-France","hauts-de-seine":"Île-de-France","seine-saint-denis":"Île-de-France",
  "val-de-marne":"Île-de-France","val-d'oise":"Île-de-France",
  // France — Auvergne-Rhône-Alpes
  "ain":"Auvergne-Rhône-Alpes","allier":"Auvergne-Rhône-Alpes","ardeche":"Auvergne-Rhône-Alpes",
  "cantal":"Auvergne-Rhône-Alpes","drome":"Auvergne-Rhône-Alpes","isere":"Auvergne-Rhône-Alpes",
  "loire":"Auvergne-Rhône-Alpes","haute-loire":"Auvergne-Rhône-Alpes",
  "puy-de-dome":"Auvergne-Rhône-Alpes","rhone":"Auvergne-Rhône-Alpes",
  "savoie":"Auvergne-Rhône-Alpes","haute-savoie":"Auvergne-Rhône-Alpes",
  // France — Nouvelle-Aquitaine
  "correze":"Nouvelle-Aquitaine","creuse":"Nouvelle-Aquitaine","dordogne":"Nouvelle-Aquitaine",
  "gironde":"Nouvelle-Aquitaine","landes":"Nouvelle-Aquitaine","lot-et-garonne":"Nouvelle-Aquitaine",
  "pyrenees-atlantiques":"Nouvelle-Aquitaine","deux-sevres":"Nouvelle-Aquitaine",
  "vienne":"Nouvelle-Aquitaine","haute-vienne":"Nouvelle-Aquitaine",
  "charente":"Nouvelle-Aquitaine","charente-maritime":"Nouvelle-Aquitaine",
  // France — Grand Est
  "bas-rhin":"Grand Est","haut-rhin":"Grand Est","moselle":"Grand Est","meurthe-et-moselle":"Grand Est",
  "meuse":"Grand Est","vosges":"Grand Est","ardennes":"Grand Est","aube":"Grand Est",
  "marne":"Grand Est","haute-marne":"Grand Est",
  // France — Hauts-de-France
  "nord":"Hauts-de-France","pas-de-calais":"Hauts-de-France","somme":"Hauts-de-France",
  "aisne":"Hauts-de-France","oise":"Hauts-de-France",
  // France — Normandie
  "calvados":"Normandie","eure":"Normandie","manche":"Normandie","orne":"Normandie",
  "seine-maritime":"Normandie",
  // France — Bretagne
  "cotes-d'armor":"Bretagne","finistere":"Bretagne","ille-et-vilaine":"Bretagne",
  "morbihan":"Bretagne",
  // France — Pays de la Loire
  "loire-atlantique":"Pays de la Loire","maine-et-loire":"Pays de la Loire",
  "mayenne":"Pays de la Loire","sarthe":"Pays de la Loire","vendee":"Pays de la Loire",
  // France — Centre-Val de Loire
  "cher":"Centre-Val de Loire","eure-et-loir":"Centre-Val de Loire",
  "indre":"Centre-Val de Loire","indre-et-loire":"Centre-Val de Loire",
  "loir-et-cher":"Centre-Val de Loire","loiret":"Centre-Val de Loire",
  // France — Bourgogne-Franche-Comté
  "cote-d'or":"Bourgogne-Franche-Comté","doubs":"Bourgogne-Franche-Comté",
  "jura":"Bourgogne-Franche-Comté","nievre":"Bourgogne-Franche-Comté",
  "haute-saone":"Bourgogne-Franche-Comté","saone-et-loire":"Bourgogne-Franche-Comté",
  "yonne":"Bourgogne-Franche-Comté","territoire de belfort":"Bourgogne-Franche-Comté",
  // France — Corse
  "haute-corse":"Corse","corse-du-sud":"Corse",
};

// ── The frame — fixed, Americas + Western Europe (spec §3.2) ─────────────────

/**
 * The map does not pan, does not zoom and does not show a planisphere.
 *
 * The box is the one the spec fixed from the active countries: longitude −125°
 * to +18° (US west coast to Slovenia), latitude −56° to +62° (Chile's tip to
 * northern Canada). `scale` and `center` are that box fitted to the viewBox
 * with d3-geo's `geoNaturalEarth1` — the projection `react-simple-maps` will
 * build from the same name — and the viewBox aspect is the box's own (2.1731 ×
 * 2.0560 projection units, 1.057:1) so the box fills it instead of being
 * letterboxed inside a 4:3 frame.
 *
 * Alaska and Hawaii have active coverage and fall outside this box. There is no
 * inset: they are named in the textual alternative instead
 * (`OUT_OF_FRAME_REGIONS`), and no copy here may claim the frame shows
 * everything.
 */
export const MAP_FRAME = {
  lonRange: [-125, 18] as [number, number],
  latRange: [-56, 62] as [number, number],
  width: 800,
  height: 757,
  center: [-53.52, 2.76] as [number, number],
  scale: 368,
};

/** Active regions the fixed frame cannot show — spec §3.2, named in the list. */
export const OUT_OF_FRAME_REGIONS: Record<string, string[]> = {
  "United States of America": ["Alaska", "Hawaii"],
};

// ── The density ramp — four steps, and no number on any of them ─────────────

/**
 * Four steps of one colour, over the unfilled land of the map.
 *
 * Every value is `color-mix` of an existing brand token: no hex is written
 * here, and re-tuning `--color-tuggi-primary` re-tunes the map (DS-COR-001).
 *
 * The contrast story, measured and asserted in
 * `tests/e2e/coverage-density.spec.ts` (SC 1.4.11, objects are 3:1, not 4.5:1):
 * steps 2–4 clear 3:1 against the unfilled land on their own fill (3.88, 5.58,
 * 7.96 as measured on 2026-08-07); step 1 does not (2.33), and it is the
 * boundary stroke that carries it — `DENSITY_STROKE` is 7.96 against the land
 * and 3.42 against step 1's fill, which is what §3.3 asks for in the case it
 * describes ("o degrau mais claro encosta no fundo e o desenho some").
 *
 * A single stroke colour that clears 3:1 against *all four* fills and the land
 * at once does not exist — the fills span L 0.11 to 0.50 and the land sits at
 * 0.02 — so the guarantee is written the only way it can hold: **each step is
 * distinguishable from unfilled land, by its own fill or by its boundary.**
 */
export const DENSITY_STEPS = [
  { id: "lowest", fill: "color-mix(in srgb, var(--color-tuggi-primary) 55%, var(--color-tuggi-dark))" },
  { id: "low", fill: "color-mix(in srgb, var(--color-tuggi-primary) 80%, var(--color-tuggi-dark))" },
  { id: "high", fill: "var(--color-tuggi-primary)" },
  { id: "highest", fill: "color-mix(in srgb, var(--color-tuggi-bg) 40%, var(--color-tuggi-primary))" },
] as const;

export type DensityStepId = (typeof DENSITY_STEPS)[number]["id"];

/**
 * Water. Only covered countries are drawn, so this is also what "not here"
 * looks like — a shade off the section behind it, so the frame has an edge.
 */
export const MAP_OCEAN_FILL =
  "color-mix(in srgb, var(--color-tuggi-slate) 8%, var(--color-tuggi-dark))";
/** Land inside the frame that has no coverage figure of its own. */
export const MAP_LAND_FILL =
  "color-mix(in srgb, var(--color-tuggi-slate) 25%, var(--color-tuggi-dark))";
export const MAP_LAND_STROKE =
  "color-mix(in srgb, var(--color-tuggi-slate) 45%, var(--color-tuggi-dark))";
/** Hairline around every filled region — the palest step, reused. */
export const DENSITY_STROKE = DENSITY_STEPS[3].fill;

/**
 * The three quartile cuts of the active-region distribution.
 *
 * Quartiles rather than round numbers written by hand: the cuts move with the
 * snapshot instead of describing the snapshot of the day someone typed them.
 */
export function densityCuts(states: StateCoverage[]): [number, number, number] {
  const values = states
    .filter((s) => s.activeCount > 0)
    .map((s) => s.activeCount)
    .sort((a, b) => a - b);
  if (!values.length) return [0, 0, 0];
  const at = (q: number) => values[Math.min(values.length - 1, Math.floor(values.length * q))];
  return [at(0.25), at(0.5), at(0.75)];
}

/** Which of the four steps a region falls in — an ordinal, never a count. */
export function densityStep(activeCount: number, cuts: [number, number, number]): number {
  if (activeCount < cuts[0]) return 0;
  if (activeCount < cuts[1]) return 1;
  if (activeCount < cuts[2]) return 2;
  return 3;
}

// ── TopoJSON ↔ snapshot matching ────────────────────────────────────────────

/**
 * Country names as Natural Earth writes them, where they differ from the
 * snapshot. Kept tiny on purpose: `tests/e2e/coverage-density.spec.ts` asserts
 * every active country of the snapshot ends up with a drawn shape, so a name
 * that stops matching fails loudly instead of dropping a country off the map.
 */
export const TOPO_COUNTRY_ALIASES: Record<string, string> = {
  "dominican rep.": "Dominican Republic",
};

/** The snapshot country a TopoJSON country shape belongs to. */
export function snapshotCountryOf(topoName: string): string {
  return TOPO_COUNTRY_ALIASES[norm(topoName)] ?? topoName;
}

/** Snapshot countries with coverage, densest first. */
export function activeCountries(states: StateCoverage[]): string[] {
  const total = new Map<string, number>();
  for (const s of states) {
    if (s.activeCount <= 0) continue;
    total.set(s.country, (total.get(s.country) ?? 0) + s.activeCount);
  }
  return [...total.entries()].sort((a, b) => b[1] - a[1]).map(([country]) => country);
}

/**
 * Snapshot country → the name written in the page's language, for every active
 * country. Display only, and built on the server: the drawing is a client
 * component, and resolving `Intl.DisplayNames` on both sides of hydration is
 * how the browser's ICU and Node's get to disagree in a locale nobody tested.
 */
export function countryLabels(
  states: StateCoverage[],
  locale: string
): Record<string, string> {
  return Object.fromEntries(
    activeCountries(states).map((country) => [country, localizedCountryLabel(country, locale)])
  );
}

/**
 * Region lookup for the TopoJSON layer: `(geoState, geoCountry) → snapshot row`.
 *
 * Built once per state array; the fuzzy branch is the original one from
 * `CoverageMap.tsx`, guard and all — the 65% length rule is what keeps "Pará"
 * from matching "Paraná".
 */
export function createStateFinder(states: StateCoverage[]) {
  const lookup = new Map<string, StateCoverage>();
  const all: { key: string; countryKey: string; data: StateCoverage }[] = [];

  for (const state of states) {
    const cn = norm(state.country);
    const sn = norm(state.state);
    lookup.set(`${sn}-${cn}`, state);
    if (!lookup.has(sn)) lookup.set(sn, state);
    all.push({ key: sn, countryKey: cn, data: state });
  }

  return (geoState: string, geoCountry: string): StateCoverage | null => {
    if (!geoState || !geoCountry) return null;

    const nState = norm(geoState);
    const nCountry = norm(snapshotCountryOf(geoCountry));

    // 1. Apply region mapping (province → region/community)
    const mapped = REGION_MAPPINGS[nState];
    const direct = lookup.get(mapped ? `${norm(mapped)}-${nCountry}` : `${nState}-${nCountry}`);
    if (direct) return direct;

    const directOrig = lookup.get(`${nState}-${nCountry}`);
    if (directOrig) return directOrig;

    // 2. Fuzzy: same country, partial name match. Only when the shorter string
    //    is >= 5 chars AND at least 65% the length of the longer one.
    const fuzzy = all.find((s) => {
      if (s.countryKey !== nCountry) return false;
      const shorter = Math.min(nState.length, s.key.length);
      const longer = Math.max(nState.length, s.key.length);
      const similarEnough = shorter >= 5 && shorter / longer >= 0.65;
      return (
        (similarEnough && (s.key.includes(nState) || nState.includes(s.key))) ||
        s.key.replace(/\b(region|provincia|state|communitat|comunidad)\b.*?de\s*/g, "").trim() ===
          nState.replace(/\b(region|provincia|state|communitat|comunidad)\b.*?de\s*/g, "").trim()
      );
    });
    return fuzzy ? fuzzy.data : null;
  };
}

// ── The textual alternative — names, grouped, in reading order ──────────────

export type CoverageGroupId = "americas" | "europe" | "other";

const EUROPE = new Set([
  "United Kingdom",
  "Ireland",
  "France",
  "Spain",
  "Portugal",
  "Italy",
  "Germany",
  "Austria",
  "Switzerland",
  "Belgium",
  "Luxembourg",
  "Slovenia",
]);

const AMERICAS = new Set([
  "United States of America",
  "Canada",
  "Mexico",
  "Guatemala",
  "Belize",
  "El Salvador",
  "Honduras",
  "Nicaragua",
  "Costa Rica",
  "Panama",
  "Cuba",
  "Haiti",
  "Dominican Republic",
  "Jamaica",
  "Colombia",
  "Venezuela",
  "Guyana",
  "Suriname",
  "Ecuador",
  "Peru",
  "Bolivia",
  "Brazil",
  "Paraguay",
  "Uruguay",
  "Chile",
  "Argentina",
]);

/** Which heading a country is listed under. */
export function groupOf(country: string): CoverageGroupId {
  if (AMERICAS.has(country)) return "americas";
  if (EUROPE.has(country)) return "europe";
  return "other";
}

export interface CoverageRegion {
  name: string;
  /** Route hub for this region, when one exists. */
  href: string | null;
}

export interface CoverageCountry {
  /** The snapshot's own label — the identity, never shown to a reader. */
  country: string;
  /** The same country written in the page's language. Display only (#215). */
  label: string;
  /** Every active region, densest first. Names only — see the module header. */
  regions: CoverageRegion[];
  /** Active regions the fixed frame cannot show. */
  outOfFrame: string[];
}

export interface CoverageGroup {
  id: CoverageGroupId;
  countries: CoverageCountry[];
}

const GROUP_ORDER: CoverageGroupId[] = ["americas", "europe", "other"];

/**
 * The map's information as text: every active region, grouped by continent,
 * country ordered by coverage and region ordered by density.
 *
 * Complete on purpose. This is what a reader without JavaScript, a crawler and
 * a screen reader get instead of 980 `aria-hidden` paths, and a list truncated
 * at four regions per country would be an alternative to a different map
 * (DS-COMPONENTE-006).
 *
 * `locale` is required rather than defaulted: what the reader sees is written
 * in the language of the page, and a default here would be a silent English
 * page waiting to happen. The **key** stays English — `tourHubs` is built by
 * `getStateHubPaths()` from `getCountryDisplayName()`, so a translated string
 * on that lookup would drop every route link with no error at all (#215).
 */
export function groupCoverage(
  states: StateCoverage[],
  locale: string,
  tourHubs: Record<string, string> = {}
): CoverageGroup[] {
  const byCountry = new Map<string, { total: number; regions: StateCoverage[] }>();

  for (const s of states) {
    if (s.activeCount <= 0) continue;
    const entry = byCountry.get(s.country) ?? { total: 0, regions: [] };
    entry.total += s.activeCount;
    entry.regions.push(s);
    byCountry.set(s.country, entry);
  }

  const countries: CoverageCountry[] = [...byCountry.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([country, entry]) => {
      // The key, in English. `getStateHubPaths()` writes the other half of this
      // string with the same function — the two have to stay the same fact.
      const hubKey = getCountryDisplayName(country);
      const outOfFrame = (OUT_OF_FRAME_REGIONS[country] ?? []).filter((region) =>
        entry.regions.some((r) => r.state === region)
      );
      return {
        country,
        label: localizedCountryLabel(country, locale),
        regions: entry.regions
          .sort((a, b) => b.activeCount - a.activeCount)
          .map((r) => ({ name: r.state, href: tourHubs[`${hubKey}|${r.state}`] ?? null })),
        outOfFrame,
      };
    });

  return GROUP_ORDER.map((id) => ({
    id,
    countries: countries.filter((c) => groupOf(c.country) === id),
  })).filter((group) => group.countries.length > 0);
}
