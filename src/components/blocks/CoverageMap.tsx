"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { StateCoverage } from "@/lib/coverage";

// ── Country display name overrides ────────────────────────────────────────────
export const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  "United States of America": "United States",
  "United Kingdom": "United Kingdom",
};

export function getCountryDisplayName(country: string): string {
  return COUNTRY_DISPLAY_NAMES[country] ?? country;
}

// ── Normalise: lowercase + strip combining diacritics + trim ─────────────────
const norm = (s: string) =>
  s ? s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim() : "";

// ── Province / district → DB region mappings (TopoJSON name → snapshot state) ─
// Spain: provinces → autonomous communities
const REGION_MAPPINGS: Record<string, string> = {
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

  // Italy — provinces → regions
  "bologna":"Emilia-Romagna","modena":"Emilia-Romagna","parma":"Emilia-Romagna",
  "reggio nell'emilia":"Emilia-Romagna","ravenna":"Emilia-Romagna","rimini":"Emilia-Romagna",
  "ferrara":"Emilia-Romagna","forli-cesena":"Emilia-Romagna","piacenza":"Emilia-Romagna",
  "genova":"Liguria","la spezia":"Liguria","savona":"Liguria","imperia":"Liguria",
  "trento":"Trentino-Alto Adige/Südtirol","bozen":"Trentino-Alto Adige/Südtirol",
  "milano":"Lombardia","bergamo":"Lombardia","brescia":"Lombardia","como":"Lombardia",
  "lecco":"Lombardia","lodi":"Lombardia","mantova":"Lombardia","monza e brianza":"Lombardia",
  "pavia":"Lombardia","sondrio":"Lombardia","varese":"Lombardia",
  "venezia":"Veneto","verona":"Veneto","padova":"Veneto","vicenza":"Veneto",
  "treviso":"Veneto","rovigo":"Veneto","belluno":"Veneto",
  "torino":"Piemonte","alessandria":"Piemonte","asti":"Piemonte","biella":"Piemonte",
  "cuneo":"Piemonte","novara":"Piemonte","verbano-cusio-ossola":"Piemonte","vercelli":"Piemonte",
  "trieste":"Friuli-Venezia Giulia","udine":"Friuli-Venezia Giulia",
  "pordenone":"Friuli-Venezia Giulia","gorizia":"Friuli-Venezia Giulia",
  "firenze":"Toscana","pisa":"Toscana","siena":"Toscana","arezzo":"Toscana",
  "grosseto":"Toscana","livorno":"Toscana","lucca":"Toscana","massa-carrara":"Toscana",
  "pistoia":"Toscana","prato":"Toscana",

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
};

export function CoverageMap({ states }: { states: StateCoverage[] }) {
  const t = useTranslations("Coverage");
  const [hoveredState, setHoveredState] = useState<StateCoverage | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeStates = useMemo(() => states.filter(s => s.activeCount > 0), [states]);

  const countryList = useMemo(() => {
    const map = new Map<string, number>();
    activeStates.forEach(s => map.set(s.country, (map.get(s.country) ?? 0) + s.activeCount));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [activeStates]);

  // ── Per-country aggregated stats (for automatic country summary card) ────────
  const countryStats = useMemo(() => {
    const map = new Map<string, { totalPOIs: number; regionCount: number }>();
    activeStates.forEach(s => {
      const prev = map.get(s.country) ?? { totalPOIs: 0, regionCount: 0 };
      map.set(s.country, {
        totalPOIs:   prev.totalPOIs   + s.activeCount,
        regionCount: prev.regionCount + 1,
      });
    });
    return map;
  }, [activeStates]);

  // ── State lookup ────────────────────────────────────────────────────────────
  const stateLookup = useMemo(() => {
    const lookup = new Map<string, StateCoverage>();
    const all: { key: string; countryKey: string; data: StateCoverage }[] = [];

    states.forEach(state => {
      const cn = norm(state.country);
      const sn = norm(state.state);
      lookup.set(`${sn}-${cn}`, state);
      // Also index by state name alone (for country-agnostic fallback)
      if (!lookup.has(sn)) lookup.set(sn, state);
      all.push({ key: sn, countryKey: cn, data: state });
    });

    return { lookup, all };
  }, [states]);

  // ── Find state data from TopoJSON geo properties ────────────────────────────
  const findStateData = useCallback((geoState: string, geoCountry: string): StateCoverage | null => {
    if (!geoState || !geoCountry) return null;

    let nState   = norm(geoState);
    const nCountry = norm(geoCountry);

    // 1. Apply region mapping (province → region/community)
    const mapped = REGION_MAPPINGS[nState];
    const lookupKey = mapped ? `${norm(mapped)}-${nCountry}` : `${nState}-${nCountry}`;

    const direct = stateLookup.lookup.get(lookupKey);
    if (direct) return direct;

    // If we applied a mapping but direct lookup failed, fall through to the original nState
    const directOrig = stateLookup.lookup.get(`${nState}-${nCountry}`);
    if (directOrig) return directOrig;

    // 2. Fuzzy: same country, partial name match
    // Guard: only allow substring matching when the shorter string is >= 5 chars
    // AND at least 65% the length of the longer — prevents "Pará"(4) matching "Paraná"(6)
    const fuzzy = stateLookup.all.find(s => {
      if (s.countryKey !== nCountry) return false;
      const shorter = Math.min(nState.length, s.key.length);
      const longer  = Math.max(nState.length, s.key.length);
      const similarEnough = shorter >= 5 && shorter / longer >= 0.65;
      return (
        (similarEnough && (s.key.includes(nState) || nState.includes(s.key))) ||
        s.key.replace(/\b(region|provincia|state|communitat|comunidad)\b.*?de\s*/g, "").trim() ===
        nState.replace(/\b(region|provincia|state|communitat|comunidad)\b.*?de\s*/g, "").trim()
      );
    });
    if (fuzzy) return fuzzy.data;

    return null;
  }, [stateLookup]);

  // ── Tooltip cursor tracking ─────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <section className="py-20 bg-tuggi-dark relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(#5b6472 1px, transparent 1px)", backgroundSize: "30px 30px" }}
      />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-3">
            {t("Map.sectionTitle")}
          </h2>
          <p className="text-tuggi-slate text-base mb-6 max-w-lg mx-auto">
            {t("Map.sectionSubtitle")}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-tuggi-primary" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {t("Map.active")}
            </span>
          </div>
        </div>

        {/* Country Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setSelectedCountry(null)}
            className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${
              selectedCountry === null
                ? "bg-tuggi-primary text-white shadow-lg shadow-tuggi-primary/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 cursor-pointer"
            }`}
          >
            {t("Map.filterAll")}
          </button>
          {countryList.map(country => (
            <button
              key={country}
              onClick={() => setSelectedCountry(prev => prev === country ? null : country)}
              className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${
                selectedCountry === country
                  ? "bg-tuggi-primary text-white shadow-lg shadow-tuggi-primary/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 cursor-pointer"
              }`}
            >
              {getCountryDisplayName(country)}
            </button>
          ))}
        </div>

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          onMouseMove={handleMouseMove}
          className="relative aspect-[2/1] w-full bg-[#11161d] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl"
        >
          {mounted ? (
            <ComposableMap
              projection="geoNaturalEarth1"
              projectionConfig={{ scale: 155, center: [0, 20] }}
              style={{ width: "100%", height: "100%" }}
            >
              {/* SVG filter for smoother polygon edges */}
              <defs>
                <filter id="state-smooth" x="-2%" y="-2%" width="104%" height="104%"
                  colorInterpolationFilters="sRGB">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="blur" />
                  <feComposite in="blur" in2="SourceGraphic" operator="atop" />
                </filter>
              </defs>

              <ZoomableGroup zoom={1} minZoom={1} maxZoom={8}>
                {/* Layer 1 — World country fills */}
                <Geographies geography="https://unpkg.com/world-atlas@2.0.2/countries-110m.json">
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={`country-${geo.rsmKey}`}
                        geography={geo}
                        fill="#1A2030"
                        stroke="#252D3D"
                        strokeWidth={0.4}
                        style={{
                          default: { outline: "none" },
                          hover:   { outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Layer 2 — Active states overlay (with smooth filter) */}
                <Geographies geography="/states-world.json">
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const geoStateName   = geo.properties.name;
                      const geoCountryName = geo.properties.admin;
                      const stateData      = findStateData(geoStateName, geoCountryName);

                      const isActive   = stateData && stateData.activeCount > 0;
                      const isDimmed   = isActive && selectedCountry !== null && selectedCountry !== stateData.country;
                      const isHoverable = isActive && !isDimmed;

                      const fillColor = isActive
                        ? (isDimmed ? "#1E2838" : "#00a8e8")
                        : "transparent";

                      return (
                        <Geography
                          key={`state-${geo.rsmKey}`}
                          geography={geo}
                          fill={fillColor}
                          filter={isActive && !isDimmed ? "url(#state-smooth)" : undefined}
                          stroke="none"
                          strokeWidth={0}
                          onMouseEnter={() => {
                            if (isHoverable && stateData) setHoveredState(stateData);
                          }}
                          onMouseMove={() => {
                            // Fallback: ensures tooltip shows even if onMouseEnter misses
                            if (isHoverable && stateData && hoveredState !== stateData) {
                              setHoveredState(stateData);
                            }
                          }}
                          onMouseLeave={() => setHoveredState(null)}
                          style={{
                            default: {
                              outline: "none",
                              cursor: isHoverable ? "pointer" : "default",
                              transition: "fill 200ms",
                            },
                            hover: {
                              outline: "none",
                              fill: isHoverable ? "#33b9ee" : fillColor,
                              cursor: isHoverable ? "pointer" : "default",
                            },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-tuggi-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Tooltip — follows cursor */}
          <AnimatePresence>
            {hoveredState && (() => {
              const containerWidth = mapContainerRef.current?.offsetWidth ?? 800;
              const flipX = tooltipPos.x > containerWidth * 0.72;
              return (
                <motion.div
                  key={`${hoveredState.state}-${hoveredState.country}`}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute pointer-events-none bg-tuggi-dark/95 border border-white/10 backdrop-blur-md p-5 rounded-2xl shadow-2xl z-20 min-w-[200px]"
                  style={{
                    left:  flipX ? "auto" : tooltipPos.x + 16,
                    right: flipX ? containerWidth - tooltipPos.x + 16 : "auto",
                    top:   Math.max(8, tooltipPos.y - 85),
                    transform: "none",
                  }}
                >
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">
                    {getCountryDisplayName(hoveredState.country)}
                  </div>
                  <div className="text-lg font-black text-white mb-3 leading-tight">
                    {hoveredState.state}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {t("Map.tooltipAttractions")}
                    </span>
                    <span className="text-2xl font-black text-tuggi-primary">
                      {hoveredState.activeCount.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Country summary card — appears automatically when a pill is selected */}
          <AnimatePresence>
            {selectedCountry && (() => {
              const stats = countryStats.get(selectedCountry);
              if (!stats) return null;
              const displayName = getCountryDisplayName(selectedCountry);
              const initials = displayName
                .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
              return (
                <motion.div
                  key={`country-card-${selectedCountry}`}
                  initial={{ opacity: 0, x: -16, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0,   scale: 1    }}
                  exit={{    opacity: 0, x: -16, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute pointer-events-none top-4 left-4 bg-tuggi-dark/95 border border-tuggi-primary/20 backdrop-blur-md rounded-2xl shadow-2xl z-30 overflow-hidden"
                  style={{ minWidth: 200 }}
                >
                  {/* Accent bar */}
                  <div className="h-0.5 bg-gradient-to-r from-tuggi-primary to-tuggi-primary/0" />

                  <div className="p-5">
                    {/* Country header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-tuggi-primary/15 flex items-center justify-center shrink-0 border border-tuggi-primary/20">
                        <span className="text-[11px] font-black text-tuggi-primary tracking-tight">
                          {initials}
                        </span>
                      </div>
                      <span className="text-base font-black text-white leading-tight">
                        {displayName}
                      </span>
                    </div>

                    {/* Total POIs */}
                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                        {t("Map.tooltipAttractions")}
                      </span>
                      <span className="text-3xl font-black text-tuggi-primary leading-none">
                        {stats.totalPOIs.toLocaleString()}
                      </span>
                    </div>

                    {/* Region count */}
                    <div className="text-xs font-semibold text-gray-500">
                      {stats.regionCount}{" "}
                      {t("Map.countryRegions")}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
