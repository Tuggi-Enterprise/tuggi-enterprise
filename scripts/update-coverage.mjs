/**
 * update-coverage.mjs
 *
 * Fetches live coverage data directly from core.attractions (is_active=true),
 * normalises state/region names to match the TopoJSON admin-1 boundaries,
 * applies relevance thresholds, and writes a static snapshot to
 * src/data/coverage-snapshot.json.
 *
 * Rules:
 *   - Source:  core.attractions WHERE is_active = true
 *   - State:   only shown on map if it has >= STATE_MIN_COUNT attractions
 *   - Sub-municipal names (e.g. Portuguese parishes) are grouped up to district
 *   - City names that belong to a known state are remapped to that state
 *   - Meta-regions (e.g. Brazil "Sudeste") are dropped (real states already counted)
 *
 * Usage:
 *   npm run update-coverage
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Config ────────────────────────────────────────────────────────────────────
const STATE_MIN_COUNT = 100;
const PAGE_SIZE       = 1000;

// ── Load .env.local ───────────────────────────────────────────────────────────
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
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "core" }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Normalise string: lowercase, remove accents, collapse whitespace */
const slug = s => (s || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/['']/g, "'")
  .trim();

// ── US state abbreviation expansion ──────────────────────────────────────────
const US_STATE_ABBREV = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",
  KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",
  MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
  NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",
  NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

// ── Country normalisation ─────────────────────────────────────────────────────
function normaliseCountry(raw) {
  const lc = slug(raw);
  if (["usa","us","united states","estados unidos","us "].includes(lc)) return "United States of America";
  if (lc === "ar")                                                  return "Argentina";
  if (lc === "brasil")                                             return "Brazil";
  if (lc === "uk" || lc === "reino unido")                        return "United Kingdom";
  if (["italia","italia","it"].includes(lc))                      return "Italy";
  if (["espana","espanha","spain"].includes(lc))                  return "Spain";
  if (["franca","france"].includes(lc))                           return "France";
  if (["irlanda","ireland"].includes(lc))                         return "Ireland";
  if (["mexico","méxico"].includes(lc))                           return "Mexico";
  if (["paraguay / paraguai","paraguay"].includes(lc))            return "Paraguay";
  if (["osterreich","austria"].includes(lc))                      return "Austria";
  if (lc.startsWith("schweiz") || lc === "switzerland")           return "Switzerland";
  if (["peru","perú"].includes(lc))                               return "Peru";
  if (["tailandia","thailand","ประเทศไทย"].includes(lc))          return "Thailand";
  if (["malaysia","malasia","malásia"].includes(lc))              return "Malaysia";
  if (["colombia","kolumbien"].includes(lc))                      return "Colombia";
  if (["alemanha","germany","deutschland"].includes(lc))          return "Germany";
  if (["japon","japan","japón","日本"].includes(lc))               return "Japan";
  if (["grecia","greece","grèce"].includes(lc))                   return "Greece";
  if (["turquia","turkey","türkiye"].includes(lc))                return "Turkey";
  if (["croacia","croatia","hrvatska"].includes(lc))              return "Croatia";
  if (["chequia","czech republic","czechia","tschechien"].includes(lc)) return "Czechia";
  if (["hungria","hungary","magyarország"].includes(lc))          return "Hungary";
  if (["polonia","poland","polska"].includes(lc))                 return "Poland";
  if (["rumania","romania","românia"].includes(lc))               return "Romania";
  if (["suecia","sweden","sverige"].includes(lc))                 return "Sweden";
  if (["noruega","norway","norge"].includes(lc))                  return "Norway";
  if (["dinamarca","denmark","danmark"].includes(lc))             return "Denmark";
  if (["finlandia","finland","suomi"].includes(lc))               return "Finland";
  if (["belgica","belgium","belgique","belgië"].includes(lc))     return "Belgium";
  if (["holanda","netherlands","nederland","países bajos"].includes(lc)) return "Netherlands";
  if (["uruguay"].includes(lc))                                   return "Uruguay";
  if (["venezuela"].includes(lc))                                 return "Venezuela";
  if (["ecuador"].includes(lc))                                   return "Ecuador";
  if (["bahamas","the bahamas","bahamas islands"].includes(lc))   return "The Bahamas";
  if (["india","índia"].includes(lc))                             return "India";
  if (["china","república popular da china"].includes(lc))        return "China";
  if (["australia","austrália"].includes(lc))                     return "Australia";
  if (["africa do sul","south africa","afrique du sud"].includes(lc)) return "South Africa";
  if (["marrocos","morocco","maroc"].includes(lc))                return "Morocco";
  if (["egipto","egypt","egypte","مصر"].includes(lc))             return "Egypt";
  return (raw || "").trim();
}

// ── Italy: DB region names → TopoJSON English canonical names ─────────────────
// Natural Earth 10m admin-1 uses English names for Italian regions.
const ITALY_NORMALIZE = {
  "lombardia":              "Lombardy",
  "piemonte":               "Piedmont",
  "toscana":                "Tuscany",
  "sicilia":                "Sicily",
  "sardegna":               "Sardinia",
  "puglia":                 "Apulia",
  "marche":                 "The Marches",
  "valle d'aosta":          "Aosta Valley",
  "vallee d'aoste":         "Aosta Valley",
  "trentino-alto adige":    "Trentino-Alto Adige/Südtirol",
  "alto adige":             "Trentino-Alto Adige/Südtirol",
  "trentino":               "Trentino-Alto Adige/Südtirol",
  "sudtirol":               "Trentino-Alto Adige/Südtirol",
  "friuli-venezia giulia":  "Friuli Venezia Giulia",
  "basilicate":             "Basilicata",
  // Already-English variants from international data sources
  "apulia":                 "Apulia",
  "the marches":            "The Marches",
  "aosta valley":           "Aosta Valley",
  "sardinia":               "Sardinia",
  "sicily":                 "Sicily",
  "piedmont":               "Piedmont",
  "tuscany":                "Tuscany",
  "lombardy":               "Lombardy",
  "friuli venezia giulia":  "Friuli Venezia Giulia",
};

// ── Chile: DB region names → exact TopoJSON canonical names ──────────────────
// TopoJSON (Natural Earth 10m) uses these exact names:
const CHILE_SLUG_TO_TOPO = {
  // "Región de..." full prefix forms
  "region de antofagasta":                                    "Antofagasta",
  "region de arica y parinacota":                             "Arica y Parinacota",
  "region de atacama":                                        "Atacama",
  "region de coquimbo":                                       "Coquimbo",
  "region de los lagos":                                      "Los Lagos",
  "region de los rios":                                       "Los Ríos",
  "region de magallanes y de la antartica chilena":           "Magallanes y Antártica Chilena",
  "region de tarapaca":                                       "Tarapacá",
  "region de valparaiso":                                     "Valparaíso",
  "region de nuble":                                          "Ñuble",
  "region de la araucania":                                   "La Araucanía",
  "region del biobio":                                        "Bío-Bío",
  "region del libertador general bernardo o'higgins":         "Libertador General Bernardo O'Higgins",
  "region del maule":                                         "Maule",
  "region metropolitana de santiago":                         "Región Metropolitana de Santiago",
  "region aysen del general carlos ibanez del campo":         "Aisén del General Carlos Ibáñez del Campo",
  // English-style variants (e.g. from OSM / international APIs)
  "santiago metropolitan":                                    "Región Metropolitana de Santiago",
  "metropolitan region":                                      "Región Metropolitana de Santiago",
  "metropolitana":                                            "Región Metropolitana de Santiago",
  "o'higgins region":                                         "Libertador General Bernardo O'Higgins",
  "o'higgins":                                                "Libertador General Bernardo O'Higgins",
  "libertador general bernardo o'higgins":                    "Libertador General Bernardo O'Higgins",
  "maule region":                                             "Maule",
  "los lagos region":                                         "Los Lagos",
  "araucania":                                                "La Araucanía",
  "la araucania":                                             "La Araucanía",
  "araucanía":                                                "La Araucanía",
  "coquimbo region":                                          "Coquimbo",
  "aysen":                                                    "Aisén del General Carlos Ibáñez del Campo",
  "aisen":                                                    "Aisén del General Carlos Ibáñez del Campo",
  "aisen del general carlos ibanez del campo":                "Aisén del General Carlos Ibáñez del Campo",
  "magallanes":                                               "Magallanes y Antártica Chilena",
  "magallanes y antartica chilena":                           "Magallanes y Antártica Chilena",
  "region of magallanes":                                     "Magallanes y Antártica Chilena",
  "region of magallanes and chilean antarctica":              "Magallanes y Antártica Chilena",
  "biobio":                                                   "Bío-Bío",
  "bio-bio":                                                  "Bío-Bío",
  "nuble":                                                    "Ñuble",
  "los rios":                                                 "Los Ríos",
  "tarapaca":                                                 "Tarapacá",
  "valparaiso":                                               "Valparaíso",
};

// Known Chilean cities → their parent TopoJSON region (for city-level entries)
const CHILE_CITY_TO_REGION = {
  "antofagasta":"Antofagasta","calama":"Antofagasta","tocopilla":"Antofagasta",
  "arica":"Arica y Parinacota","putre":"Arica y Parinacota",
  "copiapo":"Atacama","vallenar":"Atacama","chanaral":"Atacama",
  "la serena":"Coquimbo","coquimbo":"Coquimbo","ovalle":"Coquimbo",
  "valparaiso":"Valparaíso","vina del mar":"Valparaíso","quilpue":"Valparaíso",
  "san antonio":"Valparaíso","quillota":"Valparaíso","los andes":"Valparaíso",
  "san felipe":"Valparaíso","la ligua":"Valparaíso",
  "santiago":"Región Metropolitana de Santiago","puente alto":"Región Metropolitana de Santiago",
  "maipu":"Región Metropolitana de Santiago","las condes":"Región Metropolitana de Santiago",
  "providencia":"Región Metropolitana de Santiago","la florida":"Región Metropolitana de Santiago",
  "rancagua":"Libertador General Bernardo O'Higgins","san fernando":"Libertador General Bernardo O'Higgins",
  "talca":"Maule","curico":"Maule","linares":"Maule","constitucion":"Maule",
  "cauquenes":"Maule","parral":"Maule",
  "chillan":"Ñuble","san carlos":"Ñuble",
  "concepcion":"Bío-Bío","talcahuano":"Bío-Bío","los angeles":"Bío-Bío",
  "temuco":"La Araucanía","angol":"La Araucanía","villarrica":"La Araucanía",
  "valdivia":"Los Ríos","la union":"Los Ríos",
  "puerto montt":"Los Lagos","osorno":"Los Lagos","puerto varas":"Los Lagos",
  "coyhaique":"Aisén del General Carlos Ibáñez del Campo",
  "punta arenas":"Magallanes y Antártica Chilena","puerto natales":"Magallanes y Antártica Chilena",
  "iquique":"Tarapacá","alto hospicio":"Tarapacá",
  // Cities in O'Higgins
  "rancagua":"Libertador General Bernardo O'Higgins",
  "machali":"Libertador General Bernardo O'Higgins",
  "san fernando":"Libertador General Bernardo O'Higgins",
  "codegua":"Libertador General Bernardo O'Higgins",
  "coinco":"Libertador General Bernardo O'Higgins",
  "coltauco":"Libertador General Bernardo O'Higgins",
  "doñihue":"Libertador General Bernardo O'Higgins",
  "graneros":"Libertador General Bernardo O'Higgins",
  "las cabras":"Libertador General Bernardo O'Higgins",
  "litueche":"Libertador General Bernardo O'Higgins",
  "malloa":"Libertador General Bernardo O'Higgins",
  "marchigue":"Libertador General Bernardo O'Higgins",
  "mostazal":"Libertador General Bernardo O'Higgins",
  "navidad":"Libertador General Bernardo O'Higgins",
  "olivar":"Libertador General Bernardo O'Higgins",
  "paredones":"Libertador General Bernardo O'Higgins",
  "peumo":"Libertador General Bernardo O'Higgins",
  "pichidegua":"Libertador General Bernardo O'Higgins",
  "pichilemu":"Libertador General Bernardo O'Higgins","la estrella":"Libertador General Bernardo O'Higgins",
};

function normaliseChileState(state) {
  const s = slug(state);
  if (CHILE_SLUG_TO_TOPO[s]) return CHILE_SLUG_TO_TOPO[s];
  if (CHILE_CITY_TO_REGION[s]) return CHILE_CITY_TO_REGION[s];
  // Generic: strip "Región de/del/la/los " prefix and check again
  const stripped = slug(state.replace(/^Regi[oó]n (Metropolitana |del |de la |de los |de )?/i, "").trim());
  if (CHILE_SLUG_TO_TOPO[`region de ${stripped}`]) return CHILE_SLUG_TO_TOPO[`region de ${stripped}`];
  if (CHILE_SLUG_TO_TOPO[`region del ${stripped}`]) return CHILE_SLUG_TO_TOPO[`region del ${stripped}`];
  return state; // keep as-is (will likely be below threshold or unmatched)
}

// ── Portugal: known districts (TopoJSON names) ────────────────────────────────
// If a state name IS a district, keep it. Otherwise map municipality → district.
const PT_DISTRICTS = new Set([
  "Aveiro","Beja","Braga","Bragança","Castelo Branco","Coimbra","Évora","Faro",
  "Guarda","Leiria","Lisboa","Madeira","Portalegre","Porto","Santarém","Setúbal",
  "Viana do Castelo","Vila Real","Viseu","Azores",
]);

const PT_DISTRICT_SLUGS = new Map([...PT_DISTRICTS].map(d => [slug(d), d]));

// Municipality → district mapping (comprehensive for common Portuguese municipalities)
const PT_MUNICIPALITY_TO_DISTRICT = {
  // Aveiro district
  "agueda":"Aveiro","albergaria-a-velha":"Aveiro","anadia":"Aveiro","aveiro":"Aveiro",
  "espinho":"Aveiro","estarreja":"Aveiro","ilhavo":"Aveiro","mealhada":"Aveiro",
  "murtosa":"Aveiro","oliveira de azemeis":"Aveiro","oliveira do bairro":"Aveiro",
  "ovar":"Aveiro","sao joao da madeira":"Aveiro","sever do vouga":"Aveiro","vagos":"Aveiro",
  "vale de cambra":"Aveiro","gafanha da nazare":"Aveiro","esmoriz":"Aveiro",
  "pardilho":"Aveiro","torreira":"Aveiro",
  // Beja district
  "aljustrel":"Beja","almodovar":"Beja","alvito":"Beja","barrancos":"Beja","beja":"Beja",
  "castro verde":"Beja","cuba":"Beja","ferreira do alentejo":"Beja","mertola":"Beja",
  "moura":"Beja","mourao":"Beja","ourique":"Beja","serpa":"Beja","vidigueira":"Beja",
  "odemira":"Beja",
  // Braga district
  "amares":"Braga","barcelos":"Braga","braga":"Braga","cabeceiras de basto":"Braga",
  "celorico de basto":"Braga","esposende":"Braga","fafe":"Braga","guimaraes":"Braga",
  "povoa de lanhoso":"Braga","terras de bouro":"Braga","vieira do minho":"Braga",
  "vila nova de famalicao":"Braga","vila verde":"Braga","vizela":"Braga",
  // Bragança district
  "alfandega da fe":"Bragança","braganca":"Bragança","carrazeda de ansiaes":"Bragança",
  "freixo de espada a cinta":"Bragança","macedo de cavaleiros":"Bragança",
  "miranda do douro":"Bragança","mirandela":"Bragança","mogadouro":"Bragança",
  "torre de moncorvo":"Bragança","vimioso":"Bragança","vinhais":"Bragança",
  // Castelo Branco district
  "belmonte":"Castelo Branco","castelo branco":"Castelo Branco","covilha":"Castelo Branco",
  "fundao":"Castelo Branco","idanha-a-nova":"Castelo Branco","oleiros":"Castelo Branco",
  "penamacor":"Castelo Branco","proenca-a-nova":"Castelo Branco","serta":"Castelo Branco",
  "vila de rei":"Castelo Branco","vila velha de rodao":"Castelo Branco",
  // Coimbra district
  "arganil":"Coimbra","cantanhede":"Coimbra","coimbra":"Coimbra","condeixa-a-nova":"Coimbra",
  "figueira da foz":"Coimbra","gois":"Coimbra","lousa":"Coimbra","mealhada":"Coimbra",
  "mira":"Coimbra","miranda do corvo":"Coimbra","montemor-o-velho":"Coimbra",
  "oliveira do hospital":"Coimbra","pampilhosa da serra":"Coimbra","penacova":"Coimbra",
  "penela":"Coimbra","soure":"Coimbra","tabua":"Coimbra","vila nova de poiares":"Coimbra",
  "praia de mira":"Coimbra","buarcos":"Coimbra","figueiro dos vinhos":"Coimbra",
  // Évora district
  "alandroal":"Évora","arraiolos":"Évora","borba":"Évora","estremoz":"Évora","evora":"Évora",
  "montemor-o-novo":"Évora","mora":"Évora","portel":"Évora","redondo":"Évora",
  "reguengos de monsaraz":"Évora","vendas novas":"Évora","viana do alentejo":"Évora",
  "vila vicosa":"Évora","mourao":"Évora",
  // Faro district
  "albufeira":"Faro","alcoutim":"Faro","aljezur":"Faro","castro marim":"Faro","faro":"Faro",
  "lagoa":"Faro","lagos":"Faro","loule":"Faro","monchique":"Faro","olhao":"Faro",
  "portimao":"Faro","sao bras de alportel":"Faro","silves":"Faro","tavira":"Faro",
  "vila do bispo":"Faro","vila real de santo antonio":"Faro","armacao de pera":"Faro",
  "quarteira":"Faro","vilamoura":"Faro","carvoeiro":"Faro","praia da rocha":"Faro",
  "ferragudo":"Faro","salir":"Faro","almancil":"Faro","luz":"Faro","sagres":"Faro",
  // Guarda district
  "aguiar da beira":"Guarda","almeida":"Guarda","celorico da beira":"Guarda",
  "figueira de castelo rodrigo":"Guarda","fornos de algodres":"Guarda","gouveia":"Guarda",
  "guarda":"Guarda","manteigas":"Guarda","meda":"Guarda","pinhel":"Guarda",
  "sabugal":"Guarda","seia":"Guarda","trancoso":"Guarda","vila nova de foz coa":"Guarda",
  // Leiria district
  "alcobaca":"Leiria","ansiao":"Leiria","batalha":"Leiria","bombarral":"Leiria",
  "caldas da rainha":"Leiria","castanheira de pera":"Leiria","figueiro dos vinhos":"Leiria",
  "leiria":"Leiria","marinha grande":"Leiria","nazare":"Leiria","obidos":"Leiria",
  "pedrogao grande":"Leiria","peniche":"Leiria","pombal":"Leiria","porto de mos":"Leiria",
  "alcanena":"Leiria","ourém":"Leiria","ourem":"Leiria","aljubarrota":"Leiria",
  // Lisboa district
  "alenquer":"Lisboa","arruda dos vinhos":"Lisboa","azambuja":"Lisboa","cadaval":"Lisboa",
  "cascais":"Lisboa","lisboa":"Lisboa","loures":"Lisboa","lourinha":"Lisboa",
  "mafra":"Lisboa","odivelas":"Lisboa","oeiras":"Lisboa","sintra":"Lisboa",
  "sobral de monte agraco":"Lisboa","torres vedras":"Lisboa","vila franca de xira":"Lisboa",
  "amadora":"Lisboa","almargem do bispo":"Lisboa","ericeira":"Lisboa","sacavem":"Lisboa",
  "agualva-cacem":"Lisboa","cacem e sao marcos":"Lisboa","belas":"Lisboa",
  "queluz":"Lisboa","parede":"Lisboa","estoril":"Lisboa","monte estoril":"Lisboa",
  "sao joao do estoril":"Lisboa","sao pedro do estoril":"Lisboa","carnaxide":"Lisboa",
  "porto salvo":"Lisboa","linda-a-velha":"Lisboa","queijas":"Lisboa","alges":"Lisboa",
  "belem":"Lisboa","alcabideche":"Lisboa",
  // Madeira
  "funchal":"Madeira","camara de lobos":"Madeira","ribeira brava":"Madeira","ponta do sol":"Madeira",
  "calheta":"Madeira","porto moniz":"Madeira","santana":"Madeira","machico":"Madeira",
  "santa cruz":"Madeira","porto santo":"Madeira","canical":"Madeira","canico":"Madeira",
  "monte":"Madeira","curral das freiras":"Madeira",
  // Azores
  "ponta delgada":"Azores","angra do heroismo":"Azores","horta":"Azores",
  "ribeira grande":"Azores","vila do porto":"Azores","lagoa":"Azores",
  "vila franca do campo":"Azores","praia da vitoria":"Azores","nordeste":"Azores",
  "povoacao":"Azores","santa cruz da graciosa":"Azores","velas":"Azores",
  "calheta":"Azores","lajes do pico":"Azores","madalena":"Azores",
  "lajes das flores":"Azores","santa cruz das flores":"Azores","corvo":"Azores",
  // Portalegre district
  "alter do chao":"Portalegre","arronches":"Portalegre","avis":"Portalegre",
  "campo maior":"Portalegre","castelo de vide":"Portalegre","crato":"Portalegre",
  "elvas":"Portalegre","fronteira":"Portalegre","gaviao":"Portalegre",
  "marvao":"Portalegre","monforte":"Portalegre","nisa":"Portalegre",
  "ponte de sor":"Portalegre","portalegre":"Portalegre","sousel":"Portalegre",
  // Porto district
  "amarante":"Porto","baiao":"Porto","felgueiras":"Porto","gondomar":"Porto",
  "lousada":"Porto","maia":"Porto","marco de canaveses":"Porto","matosinhos":"Porto",
  "pacos de ferreira":"Porto","paredes":"Porto","penafiel":"Porto","porto":"Porto",
  "povoa de varzim":"Porto","santo tirso":"Porto","trofa":"Porto","valongo":"Porto",
  "vila do conde":"Porto","vila nova de gaia":"Porto","leça do balio":"Porto",
  "ermesinde":"Porto","oliveira do douro":"Porto","avintes":"Porto","pedroucos":"Porto",
  "senhora da hora":"Porto","cidade da maia":"Porto",
  // Santarém district
  "abrantes":"Santarém","alcanena":"Santarém","almeirim":"Santarém","alpiarça":"Santarém",
  "benavente":"Santarém","cartaxo":"Santarém","chamusca":"Santarém","constancia":"Santarém",
  "coruche":"Santarém","entroncamento":"Santarém","ferreira do zezere":"Santarém",
  "golega":"Santarém","macao":"Santarém","ourém":"Santarém","ourem":"Santarém",
  "salvaterra de magos":"Santarém","santarem":"Santarém","sardoal":"Santarém",
  "tomar":"Santarém","torres novas":"Santarém","vila nova da barquinha":"Santarém",
  "fatima":"Santarém","praia do ribatejo":"Santarém","tancos":"Santarém",
  // Setúbal district
  "alcochete":"Setúbal","alcacer do sal":"Setúbal","almada":"Setúbal","barreiro":"Setúbal",
  "grandola":"Setúbal","moita":"Setúbal","montijo":"Setúbal","palmela":"Setúbal",
  "santiago do cacem":"Setúbal","seixal":"Setúbal","sesimbra":"Setúbal",
  "setubal":"Setúbal","sines":"Setúbal","lavradio":"Setúbal","costa da caparica":"Setúbal",
  "baixa da banheira":"Setúbal","vale de milhacos":"Setúbal","pinhal novo":"Setúbal",
  "quinta do conde":"Setúbal","amora":"Setúbal","aldeia de paio pires":"Setúbal",
  "brejos de azeitao":"Setúbal","aguas de moura":"Setúbal",
  // Viana do Castelo district
  "arcos de valdevez":"Viana do Castelo","caminha":"Viana do Castelo","melgaco":"Viana do Castelo",
  "moncao":"Viana do Castelo","paredes de coura":"Viana do Castelo","ponte da barca":"Viana do Castelo",
  "ponte de lima":"Viana do Castelo","valenca":"Viana do Castelo","viana do castelo":"Viana do Castelo",
  "vila nova de cerveira":"Viana do Castelo","ancora":"Viana do Castelo",
  // Vila Real district
  "alijo":"Vila Real","boticas":"Vila Real","chaves":"Vila Real","mesao frio":"Vila Real",
  "mondim de basto":"Vila Real","montalegre":"Vila Real","murca":"Vila Real",
  "peso da regua":"Vila Real","ribeira de pena":"Vila Real","sabrosa":"Vila Real",
  "santa marta de penaguiao":"Vila Real","valpacos":"Vila Real","vila pouca de aguiar":"Vila Real",
  "vila real":"Vila Real","pedras salgadas":"Vila Real",
  // Viseu district
  "armamar":"Viseu","carregal do sal":"Viseu","castro daire":"Viseu","cinfaes":"Viseu",
  "lamego":"Viseu","mangualde":"Viseu","moimenta da beira":"Viseu","mortagua":"Viseu",
  "nelas":"Viseu","oliveira de frades":"Viseu","penalva do castelo":"Viseu",
  "penedono":"Viseu","resende":"Viseu","santa comba dao":"Viseu","sao joao da pesqueira":"Viseu",
  "sao pedro do sul":"Viseu","satao":"Viseu","sernancelhe":"Viseu","tabuaco":"Viseu",
  "tarouca":"Viseu","tondela":"Viseu","vila nova de paiva":"Viseu","viseu":"Viseu",
  "vouzela":"Viseu","canas de senhorim":"Viseu","aguiar da beira":"Guarda",
};

// Meta-region names to DROP (they represent multiple states already counted)
const META_REGIONS_DROP = new Set([
  "regiao norte","regiao sul","regiao sudeste","regiao nordeste","regiao centro-oeste",
  "regiao centro","regiao lisboa & vale do tejo","regiao alentejo & algarve",
  "regiao madeira & acores",
  "norte","sul","sudeste","nordeste","centro-oeste","leste","oeste",
  "regiao",
  // Brazil meta-regions
  "regiao sudeste","sudeste","norte","nordeste","sul","centro-oeste",
]);

// Brazilian cities → their state
const BRAZIL_CITY_TO_STATE = {
  // Espírito Santo
  "vitoria":"Espírito Santo","serra":"Espírito Santo","vila velha":"Espírito Santo",
  "cariacica":"Espírito Santo","guarapari":"Espírito Santo","linhares":"Espírito Santo",
  "cachoeiro de itapemirim":"Espírito Santo","colatina":"Espírito Santo",
  "aracruz":"Espírito Santo","anchieta":"Espírito Santo","alfredo chaves":"Espírito Santo",
  "alegre":"Espírito Santo","afonso claudio":"Espírito Santo","castelo":"Espírito Santo",
  "conceicao da barra":"Espírito Santo","conceicao do castelo":"Espírito Santo",
  "divino de sao lourenco":"Espírito Santo","domingos martins":"Espírito Santo",
  "dores do rio preto":"Espírito Santo","fundao":"Espírito Santo",
  "guacui":"Espírito Santo","ibiracu":"Espírito Santo","ibitirama":"Espírito Santo",
  "itaguacu":"Espírito Santo","itapemirim":"Espírito Santo","iuna":"Espírito Santo",
  "jeronimo monteiro":"Espírito Santo","joao neiva":"Espírito Santo",
  "laranja da terra":"Espírito Santo","marataizes":"Espírito Santo",
  "montanha":"Espírito Santo","muniz freire":"Espírito Santo",
  "pedro canario":"Espírito Santo","santa leopoldina":"Espírito Santo",
  "sooretama":"Espírito Santo","vargem alta":"Espírito Santo",
  "venda nova do imigrante":"Espírito Santo","vila valerio":"Espírito Santo",
  // Minas Gerais
  "belo horizonte":"Minas Gerais","contagem":"Minas Gerais","juiz de fora":"Minas Gerais",
  "uberlandia":"Minas Gerais","betim":"Minas Gerais","montes claros":"Minas Gerais",
  "ouro preto":"Minas Gerais","tiradentes":"Minas Gerais",
  // São Paulo
  "sao paulo":"São Paulo","campinas":"São Paulo","santos":"São Paulo",
  "guarulhos":"São Paulo","sao bernardo do campo":"São Paulo","sao jose dos campos":"São Paulo",
  // Rio de Janeiro
  "rio de janeiro":"Rio de Janeiro","niteroi":"Rio de Janeiro","petr opolis":"Rio de Janeiro",
  "petropolis":"Rio de Janeiro","angra dos reis":"Rio de Janeiro","paraty":"Rio de Janeiro",
  "buzios":"Rio de Janeiro",
};

// Known real Brazilian state names (TopoJSON exact names)
const BRAZIL_REAL_STATES = new Set([
  "Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal",
  "Espírito Santo","Goiás","Maranhão","Mato Grosso","Mato Grosso do Sul",
  "Minas Gerais","Paraná","Paraíba","Pará","Pernambuco","Piauí",
  "Rio Grande do Norte","Rio Grande do Sul","Rio de Janeiro","Rondônia",
  "Roraima","Santa Catarina","Sergipe","São Paulo","Tocantins",
]);
const BRAZIL_STATE_SLUGS = new Map([...BRAZIL_REAL_STATES].map(s => [slug(s), s]));

// ── State normalisation ───────────────────────────────────────────────────────
function normaliseState(rawState, country) {
  const state = (rawState || "").replace(/\n/g, "").trim();
  const s = slug(state);
  if (!s) return null;

  // Drop meta-regions (they don't map to TopoJSON features)
  if (META_REGIONS_DROP.has(s)) return null;

  // Drop obvious data errors (foreign city names filed under wrong country)
  const knownErrors = ["bareggio","chur","thurn","constance","gibraltar"];
  if (knownErrors.includes(s)) return null;

  // Drop entries where state = country (clearly bad data, e.g. state="Spain" under Spain)
  if (s === slug(country)) return null;

  if (country === "Italy") {
    return ITALY_NORMALIZE[s] ?? state;
  }

  if (country === "Chile") {
    return normaliseChileState(state);
  }

  if (country === "Portugal") {
    // Already a district name → keep
    if (PT_DISTRICT_SLUGS.has(s)) return PT_DISTRICT_SLUGS.get(s);
    // Municipality → district lookup
    if (PT_MUNICIPALITY_TO_DISTRICT[s]) return PT_MUNICIPALITY_TO_DISTRICT[s];
    // Partial match for compound names (e.g. "Viana do Castelo (Matriz)")
    for (const [mSlug, district] of Object.entries(PT_MUNICIPALITY_TO_DISTRICT)) {
      if (s.startsWith(mSlug)) return district;
    }
    // Unknown municipality → drop (won't show on map anyway)
    return null;
  }

  if (country === "Brazil") {
    // DF abbreviation / "Brasília" stored as state → Distrito Federal
    if (s === "df" || s === "brasilia" || s === "brasilia df" || s === "federal district") return "Distrito Federal";
    // Already a real state name → keep
    if (BRAZIL_STATE_SLUGS.has(s)) return BRAZIL_STATE_SLUGS.get(s);
    // City → state mapping
    if (BRAZIL_CITY_TO_STATE[s]) return BRAZIL_CITY_TO_STATE[s];
    // Drop cities we can't map (won't match TopoJSON)
    return null;
  }

  if (country === "United States of America") {
    // Expand abbreviations (e.g. "NY" → "New York")
    if (US_STATE_ABBREV[rawState.trim()]) return US_STATE_ABBREV[rawState.trim()];
    // Fix common typos and shorthands
    const US_FIXES = {
      "mississipi": "Mississippi",
      "missisipi":  "Mississippi",
      "dc":         "District of Columbia",
      "washington dc": "District of Columbia",
      "washington d.c.": "District of Columbia",
    };
    if (US_FIXES[s]) return US_FIXES[s];
  }

  if (country === "Canada") {
    if (s === "quebec") return "Québec";
    if (s === "newfoundland" || s === "newfoundland and labrador") return "Newfoundland and Labrador";
    if (s === "prince edward island" || s === "pei") return "Prince Edward Island";
    if (s === "nova scotia") return "Nova Scotia";
    if (s === "new brunswick") return "New Brunswick";
    if (s === "british columbia" || s === "bc") return "British Columbia";
    if (s === "northwest territories") return "Northwest Territories";
  }

  if (country === "Argentina") {
    // CABA: multiple DB spellings all map to "Ciudad de Buenos Aires" (TopoJSON canonical)
    if ([
      "ciudad autonoma de buenos aires",
      "caba",
      "buenos aires f.d.",
      "buenos aires fd",
      "ciudad de buenos aires",
    ].includes(s)) return "Ciudad de Buenos Aires";
    // Normalize accent variants
    if (s === "cordoba") return "Córdoba";
    if (s === "tucuman") return "Tucumán";
    if (s === "neuquen") return "Neuquén";
    if (s === "rio negro") return "Río Negro";
    if (s === "entre rios") return "Entre Ríos";
    if (s === "la rioja") return "La Rioja";
    if (s === "san juan") return "San Juan";
    if (s === "san luis") return "San Luis";
    if (s === "santa fe") return "Santa Fe";
    if (s === "santa cruz") return "Santa Cruz";
    if (s === "tierra del fuego") return "Tierra del Fuego";
    if (s === "la pampa") return "La Pampa";
    if (s === "buenos aires f.d" || s === "buenos aires f. d.") return "Ciudad de Buenos Aires";
  }

  if (country === "Bolivia") {
    if (s === "beni" || s === "el beni") return "El Beni";
  }

  if (country === "Venezuela") {
    // "Distrito Federal" is the old name — TopoJSON uses "Distrito Capital"
    if (s === "distrito federal" || s === "distrito capital") return "Distrito Capital";
    // Strip "Estado de/del" prefix if stored with full official name
    const bare = state.replace(/^Estado (del |de la |de los |de )?/i, "").trim();
    if (bare !== state) return bare;
  }

  if (country === "Colombia") {
    // Strip " Department"/" Departamento" suffix
    const bare = state.replace(/\s+(Department|Departamento)$/i, "").trim();
    return bare;
  }

  if (country === "France") {
    // Old pre-2016 region names → current regions (post-2016 merger names used in TopoJSON REGION_MAPPINGS)
    const FRANCE_OLD_TO_NEW = {
      "rhone-alpes":               "Auvergne-Rhône-Alpes",
      "auvergne":                  "Auvergne-Rhône-Alpes",
      "midi-pyrenees":             "Occitanie",
      "languedoc-roussillon":      "Occitanie",
      "nord-pas-de-calais":        "Hauts-de-France",
      "picardie":                  "Hauts-de-France",
      "haute-normandie":           "Normandie",
      "basse-normandie":           "Normandie",
      "champagne-ardenne":         "Grand Est",
      "alsace":                    "Grand Est",
      "lorraine":                  "Grand Est",
      "poitou-charentes":          "Nouvelle-Aquitaine",
      "limousin":                  "Nouvelle-Aquitaine",
      "aquitaine":                 "Nouvelle-Aquitaine",
      "bourgogne":                 "Bourgogne-Franche-Comté",
      "franche-comte":             "Bourgogne-Franche-Comté",
      "franche-comté":             "Bourgogne-Franche-Comté",
      "ile-de-france":             "Île-de-France",
      "centre":                    "Centre-Val de Loire",
      "centre-val de loire":       "Centre-Val de Loire",
    };
    if (FRANCE_OLD_TO_NEW[s]) return FRANCE_OLD_TO_NEW[s];
    // "Guyane" / "French Guiana" → drop (it's a separate territory, not in European France TopoJSON)
    if (s === "guyane" || s === "french guiana" || s === "guyane francaise") return null;
  }

  if (country === "Switzerland") {
    const CH_NORMALIZE = {
      "grisons":           "Graubünden",  // French name → German (TopoJSON uses German)
      "grigioni":          "Graubünden",  // Italian name
      "graubuenden":       "Graubünden",
      "ticino":            "Ticino",
      "valais":            "Valais",
      "geneve":            "Genève",
      "vaud":              "Vaud",
      "bern":              "Bern",
      "zurich":            "Zürich",
      "basel":             "Basel-Stadt",
    };
    if (CH_NORMALIZE[s]) return CH_NORMALIZE[s];
  }

  if (country === "Vatican") {
    // TopoJSON uses "Vatican" (not "Vatican City")
    if (s === "vatican city" || s === "cidade do vaticano") return "Vatican";
  }

  if (country === "Peru") {
    // "Lima Province" must be checked BEFORE stripping suffix (stripping turns it into "Lima")
    if (s === "lima province") return "Lima Province";
    if (s === "callao") return "Callao";
    const bare = state.replace(/\s+(Department|Departamento|Región|Region|Province|Provincia)$/i, "").trim();
    const bs   = slug(bare);
    const PERU_TOPO = {
      "lima":             "Lima",
      "lima region":      "Lima",
      "cusco":            "Cusco",
      "cuzco":            "Cusco",
      "ancash":           "Áncash",
      "apurimac":         "Apurímac",
      "junin":            "Junín",
      "cajamarca":        "Cajamarca",
      "san martin":       "San Martín",
      "huanuco":          "Huánuco",
      "moquegua":         "Moquegua",
      "tacna":            "Tacna",
      "madre de dios":    "Madre de Dios",
      "loreto":           "Loreto",
      "amazonas":         "Amazonas",
      "tumbes":           "Tumbes",
      "piura":            "Piura",
      "ucayali":          "Ucayali",
      "puno":             "Puno",
      "arequipa":         "Arequipa",
      "ica":              "Ica",
      "la libertad":      "La Libertad",
      "lambayeque":       "Lambayeque",
      "ayacucho":         "Ayacucho",
      "huancavelica":     "Huancavelica",
      "pasco":            "Pasco",
    };
    return PERU_TOPO[bs] ?? bare;
  }

  if (country === "Ecuador") {
    const bare = state
      .replace(/\s+Province$/i, "")
      .replace(/\s*-\s*/g, " ")
      .trim();
    const bs = slug(bare);
    const ECUADOR_TOPO = {
      "chimborazo":               "Chimborazo",
      "tungurahua":               "Tungurahua",
      "morona santiago":          "Morona Santiago",
      "pastaza":                  "Pastaza",
      "orellana":                 "Orellana",
      "zamora chinchipe":         "Zamora Chinchipe",
      "santo domingo de los tsachilas": "Santo Domingo de los Tsáchilas",
    };
    return ECUADOR_TOPO[bs] ?? bare;
  }

  if (country === "Paraguay") {
    const bare = state.replace(/\s+Department$/i, "").trim();
    const bs   = slug(bare);
    const PARAGUAY_TOPO = {
      "central":          "Central",
      "boqueron":         "Boquerón",
      "presidente hayes": "Presidente Hayes",
      "asuncion":         "Asunción",
      "alto parana":      "Alto Paraná",
      "itapua":           "Itapúa",
      "neembucu":         "Ñeembucú",
      "misiones":         "Misiones",
      "alto paraguay":    "Alto Paraguay",
      "concepcion":       "Concepción",
      "amambay":          "Amambay",
      "canindeyu":        "Canindeyú",
      "san pedro":        "San Pedro",
      "caaguazu":         "Caaguazú",
      "cordillera":       "Cordillera",
      "caazapa":          "Caazapá",
      "paraguari":        "Paraguarí",
      "guaira":           "Guairá",
    };
    return PARAGUAY_TOPO[bs] ?? bare;
  }

  if (country === "Suriname") {
    const bare = state.replace(/\s+District$/i, "").trim();
    return bare;
  }

  if (country === "Uruguay") {
    // DB stores department names with " Department" suffix (e.g. "Montevideo Department").
    // TopoJSON (Natural Earth) uses bare names without suffix.
    const bare = state.replace(/\s+Department$/i, "").trim();
    const bs   = slug(bare);
    // Map to TopoJSON canonical names (with correct accents)
    const URUGUAY_TOPO = {
      "montevideo":        "Montevideo",
      "canelones":         "Canelones",
      "maldonado":         "Maldonado",
      "lavalleja":         "Lavalleja",
      "colonia":           "Colonia",
      "cerro largo":       "Cerro Largo",
      "rocha":             "Rocha",
      "paysandu":          "Paysandú",
      "salto":             "Salto",
      "tacuarembo":        "Tacuarembó",
      "treinta y tres":    "Treinta y Tres",
      "artigas":           "Artigas",
      "rivera":            "Rivera",
      "rio negro":         "Río Negro",
      "durazno":           "Durazno",
      "flores":            "Flores",
      "florida":           "Florida",
      "san jose":          "San José",
      "soriano":           "Soriano",
    };
    return URUGUAY_TOPO[bs] ?? bare;
  }

  if (country === "Spain") {
    // Map shortened/variant region names to TopoJSON canonical forms
    const SPAIN_NORMALIZE = {
      "madrid":                 "Comunidad de Madrid",
      "comunidad de madrid":    "Comunidad de Madrid",
      "comunitat valenciana":   "Comunitat Valenciana",
      "valencia":               "Comunitat Valenciana",
      "c. valenciana":          "Comunitat Valenciana",
      "illes balears":          "Illes Balears",
      "islas baleares":         "Illes Balears",
      "baleares":               "Illes Balears",
      "cataluna":               "Catalunya",
      "cataluña":               "Catalunya",
      "pais vasco":             "Euskadi",
      "país vasco":             "Euskadi",
      "euskadi":                "Euskadi",
      "aragon":                 "Aragón",
      "asturias":               "Asturias / Asturies",
      "principado de asturias": "Asturias / Asturies",
      "canarias":               "Canarias",
      "islas canarias":         "Canarias",
      "region de murcia":       "Región de Murcia",
      "murcia":                 "Región de Murcia",
      "la rioja":               "La Rioja",
      "rioja":                  "La Rioja",
      "castilla-la mancha":     "Castilla-La Mancha",
      "castilla la mancha":     "Castilla-La Mancha",
      "castilla y leon":        "Castilla y León",
      "castilla leon":          "Castilla y León",
      "extremadura":            "Extremadura",
      "cantabria":              "Cantabria",
      "navarra":                "Navarra",
      "comunidad foral de navarra": "Navarra",
      "galicia":                "Galicia",
      "andalucia":              "Andalucía",
    };
    if (SPAIN_NORMALIZE[s]) return SPAIN_NORMALIZE[s];
  }

  // ── Central America ───────────────────────────────────────────────────────────
  if (country === "Nicaragua") {
    // Caribbean autonomous regions have distinct English-named variants in the DB
    if (s === "north caribbean coast" || s === "atlantico norte" || s === "region autonoma del atlantico norte" || s === "raan") return "Atlántico Norte";
    if (s === "south caribbean coast" || s === "atlantico sur"  || s === "region autonoma del atlantico sur"  || s === "raas") return "Atlántico Sur";
    if (s === "rio san juan" || s === "río san juan") return "Rio San Juan";
    const bare = state.replace(/\s+Department$/i, "").trim();
    const NICA_TOPO = {
      "leon": "León", "esteli": "Estelí", "carazo": "Carazo",
      "managua": "Managua", "granada": "Granada", "masaya": "Masaya",
      "chinandega": "Chinandega", "rivas": "Rivas", "boaco": "Boaco",
      "chontales": "Chontales", "jinotega": "Jinotega", "matagalpa": "Matagalpa",
      "nueva segovia": "Nueva Segovia", "madriz": "Madriz",
    };
    const bb = slug(bare);
    return NICA_TOPO[bb] ?? bare;
  }

  if (country === "Honduras") {
    if (s === "bay islands" || s === "islas de la bahia" || s === "islas de la bahía") return "Islas de la Bahía";
    const bare = state.replace(/\s+Department$/i, "").trim();
    const HND_TOPO = {
      "francisco morazan": "Francisco Morazán", "cortes": "Cortés",
      "atlantida": "Atlántida", "comayagua": "Comayagua",
      "santa barbara": "Santa Bárbara", "copan": "Copán",
      "olancho": "Olancho", "yoro": "Yoro", "choluteca": "Choluteca",
      "el paraiso": "El Paraíso", "intibuca": "Intibucá",
      "colon": "Colón", "gracias a dios": "Gracias a Dios",
      "la paz": "La Paz", "lempira": "Lempira", "valle": "Valle",
      "ocotepeque": "Ocotepeque",
    };
    const bb = slug(bare);
    return HND_TOPO[bb] ?? bare;
  }

  if (country === "El Salvador") {
    const bare = state.replace(/\s+Department$/i, "").trim();
    const SLV_TOPO = {
      "san salvador": "San Salvador", "santa ana": "Santa Ana",
      "sonsonate": "Sonsonate", "la libertad": "La Libertad",
      "san miguel": "San Miguel", "la paz": "La Paz",
      "usulutan": "Usulután", "chalatenango": "Chalatenango",
      "san vicente": "San Vicente", "cabanas": "Cabañas",
      "morazan": "Morazán", "la union": "La Unión",
      "ahuachapan": "Ahuachapán", "cuscatlan": "Cuscatlán",
    };
    const bb = slug(bare);
    return SLV_TOPO[bb] ?? bare;
  }

  if (country === "Guatemala") {
    if (s === "quetzaltenango") return "Quezaltenango"; // TopoJSON uses Quez- not Quetz-
    const bare = state.replace(/\s+Department$/i, "").trim();
    const GTM_TOPO = {
      "quezaltenango": "Quezaltenango", "izabal": "Izabal",
      "santa rosa": "Santa Rosa", "jutiapa": "Jutiapa",
      "chiquimula": "Chiquimula", "peten": "Petén",
      "san marcos": "San Marcos", "huehuetenango": "Huehuetenango",
      "quiche": "Quiché", "alta verapaz": "Alta Verapaz",
      "baja verapaz": "Baja Verapaz", "zacapa": "Zacapa",
      "retalhuleu": "Retalhuleu", "suchitepequez": "Suchitepéquez", "suchitepeque": "Suchitepéquez",
      "escuintla": "Escuintla", "guatemala": "Guatemala",
      "jalapa": "Jalapa", "el progreso": "El Progreso",
      "solola": "Sololá", "totonicapan": "Totonicapán",
      "chimaltenango": "Chimaltenango", "sacatepequez": "Sacatepéquez",
    };
    const bb = slug(bare);
    return GTM_TOPO[bb] ?? bare;
  }

  if (country === "Panama") {
    if (s === "ngobe-bugle comarca" || s === "ngöbe-buglé comarca" || s === "ngobe bugle") return "Ngöbe Buglé";
    if (s === "kuna yala" || s === "comarca kuna yala" || s === "san blas") return "Kuna Yala";
    if (s === "embera" || s === "comarca embera" || s === "emberá") return "Emberá";
    if (s === "darien" || s === "darién") return "Darién";
    // "Panamá Oeste" is a 2014 province not yet in Natural Earth — merge into "Panama"
    if (s === "panama oeste province" || s === "panama oeste" || s === "panamá oeste") return "Panama";
    const bare = state.replace(/\s+(Province|Provincia|Comarca)$/i, "").trim();
    const PAN_TOPO = {
      "panama": "Panama", "chiriqui": "Chiriquí", "veraguas": "Veraguas",
      "colon": "Colón", "herrera": "Herrera", "los santos": "Los Santos",
      "cocle": "Coclé", "bocas del toro": "Bocas del Toro",
    };
    const bb = slug(bare);
    return PAN_TOPO[bb] ?? bare;
  }

  if (country === "Costa Rica") {
    const bare = state.replace(/\s+Province$/i, "").trim();
    const CRI_TOPO = {
      "san jose":    "San José", "alajuela": "Alajuela",
      "cartago":     "Cartago",  "heredia": "Heredia",
      "guanacaste":  "Guanacaste", "puntarenas": "Puntarenas",
      "limon":       "Limón",
    };
    const bb = slug(bare);
    return CRI_TOPO[bb] ?? bare;
  }

  // ── Caribbean ─────────────────────────────────────────────────────────────────
  if (country === "Cuba") {
    if (s === "havana" || s === "la habana" || s === "ciudad de la habana") return "Ciudad de la Habana";
    const bare = state.replace(/\s+Province$/i, "").trim();
    const CUB_TOPO = {
      "ciudad de la habana": "Ciudad de la Habana",
      "pinar del rio": "Pinar del Río", "artemisa": "Artemisa",
      "mayabeque": "Mayabeque", "matanzas": "Matanzas",
      "villa clara": "Villa Clara", "cienfuegos": "Cienfuegos",
      "sancti spiritus": "Sancti Spíritus", "ciego de avila": "Ciego de Ávila",
      "camaguey": "Camagüey", "las tunas": "Las Tunas",
      "holguin": "Holguín", "granma": "Granma",
      "santiago de cuba": "Santiago de Cuba",
      "guantanamo": "Guantánamo",
      "isla de la juventud": "Isla de la Juventud",
    };
    const bb = slug(bare);
    return CUB_TOPO[bb] ?? bare;
  }

  if (country === "Dominican Republic") {
    if (s === "nacional" || s === "distrito nacional") return "Distrito Nacional";
    const bare = state.replace(/\s+Province$/i, "").trim();
    const DOM_TOPO = {
      "santo domingo":         "Santo Domingo",
      "santiago":              "Santiago",
      "la altagracia":         "La Altagracia",
      "duarte":                "Duarte",
      "barahona":              "Barahona",
      "azua":                  "Azua",
      "pedernales":            "Pedernales",
      "san cristobal":         "San Cristóbal",
      "peravia":               "Peravia",
      "la romana":             "La Romana",
      "san pedro de macoris":  "San Pedro de Macorís",
      "la vega":               "La Vega",
      "puerto plata":          "Puerto Plata",
      "espaillat":             "Espaillat",
      "maria trinidad sanchez":"María Trinidad Sánchez",
      "samana":                "Samaná",
      "hato mayor":            "Hato Mayor",
      "el seybo":              "El Seybo",
      "independencia":         "Independencia",
      "la estrelleta":         "La Estrelleta",
      "dajabon":               "Dajabón",
      "monte cristi":          "Monte Cristi",
      "valverde":              "Valverde",
      "santiago rodriguez":    "Santiago Rodríguez",
      "bahoruco":              "Bahoruco",
      "san juan":              "San Juan",
      "monsenor nouel":        "Monseñor Nouel",
      "sanchez ramirez":       "Sánchez Ramírez",
      "san jose de ocoa":      "San José de Ocoa",
      "monte plata":           "Monte Plata",
    };
    const bb = slug(bare);
    return DOM_TOPO[bb] ?? bare;
  }

  if (country === "Haiti") {
    const HAITI_TOPO = {
      "artibonite":  "L'Artibonite", "l'artibonite": "L'Artibonite",
      "ouest":       "Ouest",         "nord":         "Nord",
      "nord-est":    "Nord-Est",      "nord-ouest":   "Nord-Ouest",
      "sud":         "Sud",           "sud-est":      "Sud-Est",
      "grand'anse":  "Grand'Anse",    "nippes":       "Nippes",
      "centre":      "Centre",
    };
    return HAITI_TOPO[s] ?? state;
  }

  if (country === "Jamaica") {
    const bare = state.replace(/\s+Parish$/i, "").trim().replace(/^St\.\s+/i, "Saint ");
    const JAM_TOPO = {
      "saint andrew": "Saint Andrew", "saint catherine": "Saint Catherine",
      "saint ann": "Saint Ann",      "saint james": "Saint James",
      "portland": "Portland",         "saint thomas": "Saint Thomas",
      "saint elizabeth": "Saint Elizabeth", "manchester": "Manchester",
      "clarendon": "Clarendon",       "westmoreland": "Westmoreland",
      "hanover": "Hanover",           "trelawny": "Trelawny",
      "saint mary": "Saint Mary",     "kingston": "Kingston",
    };
    const bb = slug(bare);
    return JAM_TOPO[bb] ?? bare;
  }

  if (country === "Belize") {
    if (s === "southern district") return "Stann Creek"; // historical name used in TopoJSON
    const bare = state.replace(/\s+District$/i, "").trim();
    const BLZ_TOPO = {
      "belize": "Belize", "cayo": "Cayo", "orange walk": "Orange Walk",
      "corozal": "Corozal", "toledo": "Toledo", "stann creek": "Stann Creek",
    };
    const bb = slug(bare);
    return BLZ_TOPO[bb] ?? bare;
  }

  if (country === "Bahamas") {
    // TopoJSON admin is "The Bahamas" — snapshot stores "Bahamas"; country match handled separately
    return state;
  }

  // ── Austria ───────────────────────────────────────────────────────────────────
  if (country === "Austria") {
    const AT_TOPO = {
      "tyrol": "Tirol", "tirol": "Tirol",
      "vienna": "Wien", "wien": "Wien",
      "salzburg": "Salzburg",
      "styria": "Steiermark", "steiermark": "Steiermark",
      "carinthia": "Kärnten", "karnten": "Kärnten", "kärnten": "Kärnten",
      "upper austria": "Oberösterreich", "oberosterreich": "Oberösterreich",
      "lower austria": "Niederösterreich", "niederosterreich": "Niederösterreich",
      "burgenland": "Burgenland", "vorarlberg": "Vorarlberg",
    };
    return AT_TOPO[s] ?? state;
  }

  // ── Global suffix strip (catch-all for countries not handled above) ───────────
  // Strips common geographic admin suffixes appended by international data sources.
  // "Lima Province" (Peru) is excluded — it IS a distinct TopoJSON feature.
  const SUFFIX_RE = /\s+(Department|Departamento|Province|Provincia|Parish|District|Distrito|Region|Región|Oblast|Prefecture|Territorio|Territory|Governorate|Komitat|County)$/i;
  if (SUFFIX_RE.test(state) && state !== "Lima Province") {
    return state.replace(SUFFIX_RE, "").trim();
  }

  return state;
}

// ── Fetch all active attractions (cursor-based — no OFFSET, no timeout) ──────
// Uses WHERE id > last_id ORDER BY id so each page is O(log n) via index scan.
// Server caps at 2000 rows/page; sequential is fast enough (~500 requests × 50ms).
const PAGE_SIZE_CURSOR = 2000;

async function fetchAllActive() {
  const { count: plannedCount } = await sb
    .from("attractions")
    .select("*", { count: "planned", head: true })
    .eq("is_active", true);
  console.log(`   Estimated: ~${(plannedCount || 0).toLocaleString()} rows (cursor-based pagination)`);

  const rows = [];
  let lastId = "00000000-0000-0000-0000-000000000000";

  while (true) {
    const { data, error } = await sb
      .from("attractions")
      .select("id, country, state, city")
      .eq("is_active", true)
      .gt("id", lastId)
      .order("id")
      .limit(PAGE_SIZE_CURSOR);

    if (error) {
      const msg = error.message || error.details || error.hint || "";
      throw new Error("Supabase fetch error: " + (msg || JSON.stringify(error)));
    }
    if (!data || data.length === 0) break;

    rows.push(...data);
    lastId = data[data.length - 1].id;

    if (rows.length % 20_000 === 0) {
      process.stdout.write(`\r   Fetching... ${rows.length.toLocaleString()} rows`);
    }
  }

  process.stdout.write(`\r   Fetched ${rows.length.toLocaleString()} rows                          \n`);
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("🌍  Tuggi Coverage Snapshot");
console.log("────────────────────────────");

const rawRows = await fetchAllActive();

// ── Aggregate by state+country ────────────────────────────────────────────────
const stateMap = new Map();

rawRows.forEach(r => {
  const country = normaliseCountry(r.country);
  if (!country) return;

  // For Brazil: only use r.city as fallback when r.state is null AND the city
  // is explicitly in BRAZIL_CITY_TO_STATE. This prevents city names that happen
  // to match a state name (e.g. municipality "Paraná" in Rio Grande do Norte)
  // from being incorrectly counted as the state of Paraná.
  let rawInput;
  if (country === "Brazil") {
    if (r.state) {
      rawInput = r.state;
    } else if (r.city && BRAZIL_CITY_TO_STATE[slug(r.city)]) {
      rawInput = r.city; // only if explicitly mapped
    } else {
      rawInput = null;
    }
  } else {
    rawInput = r.state || r.city;
  }

  const normState = normaliseState(rawInput, country);
  if (!normState) return;

  const key = `${normState}||${country}`;
  stateMap.set(key, (stateMap.get(key) || 0) + 1);
});

// ── Apply threshold ───────────────────────────────────────────────────────────
const states = [];
stateMap.forEach((count, key) => {
  if (count < STATE_MIN_COUNT) return;
  const [state, country] = key.split("||");
  states.push({ state, country, activeCount: count, comingSoonCount: 0 });
});

states.sort((a, b) => b.activeCount - a.activeCount);

// ── Derived totals ────────────────────────────────────────────────────────────
// totalActiveRaw = every row fetched from DB with is_active=true (the real number)
// totalActive    = sum of states that passed the threshold (used only for map display)
const totalActiveRaw       = rawRows.length;            // 234k — used in hero stats
const totalActive          = states.reduce((s, r) => s + r.activeCount, 0); // 226k — map only
const totalActiveCountries = new Set(states.map(s => s.country)).size;
const totalActiveRegions   = states.length;
const byCountry            = {};
states.forEach(s => { byCountry[s.country] = (byCountry[s.country] || 0) + s.activeCount; });

// ── Write snapshot ────────────────────────────────────────────────────────────
const snapshot = {
  states,
  totalActiveRaw,       // hero stat: all active in DB
  totalActive,          // map stat: only states with >= STATE_MIN_COUNT
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
console.log(`   Source             : core.attractions WHERE is_active=true`);
console.log(`   State threshold    : >= ${STATE_MIN_COUNT} items`);
console.log(`   Raw total (active) : ${totalActiveRaw.toLocaleString()}  ← hero stat`);
console.log(`   After threshold    : ${totalActive.toLocaleString()} (in ${totalActiveRegions} regions)  ← map only`);
console.log(`   Countries          : ${totalActiveCountries}`);
console.log("");
console.log("   By country:");
Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) =>
  console.log(`     ${String(n).padStart(8).replace(/\B(?=(\d{3})+(?!\d))/g,",")}  ${c}`));
console.log("");
console.log(`   States breakdown:`);
const byC = {};
states.forEach(s => { if (!byC[s.country]) byC[s.country] = 0; byC[s.country]++; });
Object.entries(byC).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) => console.log(`     ${String(n).padStart(4)} regions  ${c}`));
console.log("");
console.log("👉  Commit src/data/coverage-snapshot.json and push to deploy.");
