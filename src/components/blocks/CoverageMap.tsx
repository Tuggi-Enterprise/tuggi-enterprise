"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { StateCoverage } from "@/lib/coverage";



export function CoverageMap({ states }: { states: StateCoverage[] }) {
  const t = useTranslations("Coverage");
  const [hoveredState, setHoveredState] = useState<StateCoverage | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-process states for O(1) lookup and fuzzy matching
  const stateLookup = useMemo(() => {
    const lookup = new Map<string, StateCoverage>();
    const allStates: { key: string; countryKey: string; data: StateCoverage }[] = [];
    
    // Helper to normalize strings: lowercase and remove accents
    const normalize = (str: string) => 
      str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

    states.forEach(state => {
      const countryNormalized = normalize(state.country);
      const stateNormalized = normalize(state.state);
      
      lookup.set(`${stateNormalized}-${countryNormalized}`, state);
      lookup.set(stateNormalized, state);
      
      allStates.push({ key: stateNormalized, countryKey: countryNormalized, data: state });
    });
    
    return { lookup, allStates };
  }, [states]);

  const normalize = (str: string) => 
    str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

  // Europe Fallback Mappings (TopoJSON Admin 1 -> DB Region Names)
  const regionMappings: Record<string, string> = {
    // Portugal
    "faro": "regiao alentejo & algarve",
    "beja": "regiao alentejo & algarve",
    "evora": "regiao alentejo & algarve",
    "portalegre": "regiao alentejo & algarve",
    "lisboa": "regiao lisboa & vale do tejo",
    "setubal": "regiao lisboa & vale do tejo",
    "santarem": "regiao lisboa & vale do tejo",
    "leiria": "regiao centro",
    "coimbra": "regiao centro",
    "aveiro": "regiao centro",
    "viseu": "regiao centro",
    "guarda": "regiao centro",
    "castelo branco": "regiao centro",
    "porto": "regiao norte",
    "braga": "regiao norte",
    "viana do castelo": "regiao norte",
    "vila real": "regiao norte",
    "braganca": "regiao norte",
    "madeira": "regiao madeira & acores",
    "azores": "regiao madeira & acores",
    
    // Spain (Provinces -> Autonomous Communities)
    "sevilla": "andalucia", "malaga": "andalucia", "cadiz": "andalucia", 
    "huelva": "andalucia", "cordoba": "andalucia", "jaen": "andalucia", 
    "granada": "andalucia", "almeria": "andalucia",
    "barcelona": "catalunya", "tarragona": "catalunya", "lleida": "catalunya", "girona": "catalunya",
    "madrid": "comunidad de madrid",
    "valencia": "comunitat valenciana", "alicante": "comunitat valenciana", "castellon": "comunitat valenciana",
    "zaragoza": "aragon", "huesca": "aragon", "teruel": "aragon",
    "la coruna": "galicia", "lugo": "galicia", "orense": "galicia", "pontevedra": "galicia",
    "badajoz": "extremadura", "caceres": "extremadura",
    "palma": "illes balears", "illes balears": "illes balears",
    "valladolid": "castilla y leon", "burgos": "castilla y leon", "leon": "castilla y leon", 
    "salamanca": "castilla y leon", "zamora": "castilla y leon", "palencia": "castilla y leon", 
    "avila": "castilla y leon", "segovia": "castilla y leon", "soria": "castilla y leon",
    "baleares": "illes balears", "las palmas": "canarias", "santa cruz de tenerife": "canarias",
    
    // Italy (Provinces -> Regions)
    "bologna": "emilia-romagna", "modena": "emilia-romagna", "parma": "emilia-romagna", 
    "reggio nell'emilia": "emilia-romagna", "ravenna": "emilia-romagna", "rimini": "emilia-romagna", 
    "ferrara": "emilia-romagna", "forli-cesena": "emilia-romagna", "piacenza": "emilia-romagna",
    "genova": "liguria", "la spezia": "liguria", "savona": "liguria", "imperia": "liguria",
    "trento": "trentino-alto adige/sudtirol", "bozen": "trentino-alto adige/sudtirol",
    "l'aquila": "abruzzo", "teramo": "abruzzo", "pescara": "abruzzo", "chieti": "abruzzo",
    "milano": "lombardia", "bergamo": "lombardia", "brescia": "lombardia", "como": "lombardia", 
    "lecco": "lombardia", "lodi": "lombardia", "mantova": "lombardia", "monza e brianza": "lombardia", 
    "pavia": "lombardia", "sondrio": "lombardia", "varese": "lombardia",
    "venezia": "veneto", "verona": "veneto", "padova": "veneto", "vicenza": "veneto", 
    "treviso": "veneto", "rovigo": "veneto", "belluno": "veneto",
    "torino": "piemonte", "alessandria": "piemonte", "asti": "piemonte", "biella": "piemonte", 
    "cuneo": "piemonte", "novara": "piemonte", "verbano-cusio-ossola": "piemonte", "vercelli": "piemonte",
    "trieste": "friuli-venezia giulia", "udine": "friuli-venezia giulia", "pordenone": "friuli-venezia giulia", "gorizia": "friuli-venezia giulia",
    "firenze": "toscana", "pisa": "toscana", "siena": "toscana", "arezzo": "toscana", "grosseto": "toscana", 
    "livorno": "toscana", "lucca": "toscana", "massa-carrara": "toscana", "pistoia": "toscana", "prato": "toscana",
    "palermo": "sicilia", "catania": "sicilia", "messina": "sicilia", "siracusa": "sicilia", "trapani": "sicilia", 
    "ragusa": "sicilia", "agrigento": "sicilia", "caltanissetta": "sicilia", "enna": "sicilia",
    "cagliari": "sardegna", "sassari": "sardegna", "nuoro": "sardegna", "oristano": "sardegna",
    "taranto": "ta",
    
    // France (Departments -> Regions)
    "ariege": "occitanie", "aude": "occitanie", "aveyron": "occitanie", "gard": "occitanie", 
    "haute-garonne": "occitanie", "gers": "occitanie", "herault": "occitanie", "lot": "occitanie", 
    "lozere": "occitanie", "hautes-pyrenees": "occitanie", "pyrenees-orientales": "occitanie", "tarn": "occitanie", "tarn-et-garonne": "occitanie",
    "alpes-de-haute-provence": "provence-alpes-cote d'azur", "hautes-alpes": "provence-alpes-cote d'azur", 
    "alpes-maritimes": "provence-alpes-cote d'azur", "bouches-du-rhone": "provence-alpes-cote d'azur", 
    "var": "provence-alpes-cote d'azur", "vaucluse": "provence-alpes-cote d'azur",
    "charente": "nouvelle-aquitaine", "charente-maritime": "nouvelle-aquitaine", "correze": "nouvelle-aquitaine", 
    "creuse": "nouvelle-aquitaine", "dordogne": "nouvelle-aquitaine", "gironde": "nouvelle-aquitaine", 
    "landes": "nouvelle-aquitaine", "lot-et-garonne": "nouvelle-aquitaine", "pyrenees-atlantiques": "nouvelle-aquitaine", 
    "deux-sevres": "nouvelle-aquitaine", "vienne": "nouvelle-aquitaine", "haute-vienne": "nouvelle-aquitaine",
    "ain": "auvergne-rhone-alpes", "allier": "auvergne-rhone-alpes", "ardeche": "auvergne-rhone-alpes", 
    "cantal": "auvergne-rhone-alpes", "drome": "auvergne-rhone-alpes", "isere": "auvergne-rhone-alpes", 
    "loire": "auvergne-rhone-alpes", "haute-loire": "auvergne-rhone-alpes", "puy-de-dome": "auvergne-rhone-alpes", 
    "rhone": "auvergne-rhone-alpes", "savoie": "auvergne-rhone-alpes", "haute-savoie": "auvergne-rhone-alpes",
    "guyane francaise": "guyane", "guyane": "guyane"
  };

  // Helper to find state data including partial matches
  const findStateData = (geoState: string, geoCountry: string) => {
    if (!geoState || !geoCountry) return null;
    let nState = normalize(geoState);
    const nCountry = normalize(geoCountry);
    
    // Check Region Mapping first (if we mapped "faro" to "regiao alentejo & algarve")
    if (regionMappings[nState]) {
      nState = regionMappings[nState];
    }
    
    // Direct match
    let match = stateLookup.lookup.get(`${nState}-${nCountry}`);
    if (match) return match;
    
    // Fuzzy match
    const fuzzy = stateLookup.allStates.find(s => 
      s.countryKey === nCountry && 
      (s.key.includes(nState) || nState.includes(s.key) || 
       s.key.replace(/region (de |del )?|provincia (de |del )?|state of /g, "").trim() === nState.replace(/region (de |del )?|provincia (de |del )?|state of /g, "").trim())
    );
    
    if (fuzzy) return fuzzy.data;
    
    // Check if the DB has the exact acronyms like TA, EMR for Italy
    if (nCountry === "italy") {
       const directAcronym = stateLookup.allStates.find(s => s.countryKey === "italy" && s.key === nState);
       if (directAcronym) return directAcronym.data;
    }

    return null;
  };

  return (
    <section className="py-20 bg-tuggi-dark relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: "radial-gradient(#5b6472 1px, transparent 1px)", backgroundSize: "30px 30px" }} 
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Network Global Tuggi
          </h2>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm bg-[#00a8e8]" />
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t("Map.active")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm bg-[#ff6f00]" />
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t("Map.comingSoon")}</span>
            </div>
          </div>
        </div>

        <div className="relative aspect-[2/1] w-full bg-[#11161d] rounded-[40px] border border-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">
          {mounted ? (
            <ComposableMap 
            projection="geoMercator"
            projectionConfig={{ scale: 120, center: [0, 30] }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup zoom={1} minZoom={1} maxZoom={8}>
              {/* 1. Full World Background Layer (Countries) */}
              <Geographies geography="https://unpkg.com/world-atlas@2.0.2/countries-110m.json">
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={`country-${geo.rsmKey}`}
                      geography={geo}
                      fill="#1E232A"
                      stroke="#2C323A"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* 2. States Layer (Overlaid on top) */}
              <Geographies geography="/states-world.json">
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoStateName = geo.properties.name;
                    const geoCountryName = geo.properties.admin;
                    
                    const stateData = findStateData(geoStateName, geoCountryName);
                    
                    let fillColor = "transparent"; // Transparent by default so underlying country layer shows
                    let isHoverable = false;

                    if (stateData) {
                      isHoverable = true;
                      if (stateData.activeCount >= stateData.comingSoonCount && stateData.activeCount > 0) {
                        fillColor = "#00a8e8"; // Blue if majority active
                      } else if (stateData.comingSoonCount > stateData.activeCount) {
                        fillColor = "#ff6f00"; // Orange if majority homolog
                      } else {
                        fillColor = "#1E232A"; // Gray if no data
                      }
                    }

                    return (
                      <Geography
                        key={`state-${geo.rsmKey}`}
                        geography={geo}
                        fill={fillColor}
                        stroke={isHoverable ? "#2C323A" : "transparent"} // Only draw state borders if it has data or if we want them all
                        strokeWidth={0.5}
                        onMouseEnter={() => {
                          if (isHoverable && stateData) {
                            setHoveredState(stateData);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredState(null);
                        }}
                        style={{
                          default: { outline: "none", cursor: isHoverable ? "pointer" : "default", transition: "all 250ms" },
                          hover: { 
                            outline: "none", 
                            fill: isHoverable ? (stateData?.activeCount && stateData.activeCount >= stateData.comingSoonCount ? "#33b9ee" : "#ff8c33") : "transparent", 
                            cursor: isHoverable ? "pointer" : "default" 
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

          {/* Tooltip Overlay */}
          <AnimatePresence>
            {hoveredState && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute pointer-events-none bg-tuggi-dark/95 border border-white/10 backdrop-blur-md p-5 rounded-2xl shadow-2xl z-20 min-w-[220px]"
                style={{
                  left: "50%",
                  top: "20px",
                  transform: "translateX(-50%)"
                }}
              >
                <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">
                  {hoveredState.country}
                </div>
                <div className="text-xl font-black text-white mb-4">
                  {hoveredState.state}
                </div>
                <div className="flex gap-6">
                  {hoveredState.activeCount > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t("Map.active")}</span>
                      <span className="text-2xl font-black text-tuggi-primary">{hoveredState.activeCount.toLocaleString()}</span>
                    </div>
                  )}
                  {hoveredState.comingSoonCount > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t("Map.comingSoon")}</span>
                      <span className="text-2xl font-black text-tuggi-secondary">{hoveredState.comingSoonCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
