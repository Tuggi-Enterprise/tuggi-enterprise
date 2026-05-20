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
  if (["usa","us","united states","estados unidos"].includes(lc)) return "United States of America";
  if (lc === "brasil")                                             return "Brazil";
  if (lc === "uk" || lc === "reino unido")                        return "United Kingdom";
  if (["italia","italia","it"].includes(lc))                      return "Italy";
  if (["espana","espanha"].includes(lc))                          return "Spain";
  if (["franca","france"].includes(lc))                           return "France";
  if (["irlanda","ireland"].includes(lc))                         return "Ireland";
  if (["mexico"].includes(lc))                                    return "Mexico";
  if (["paraguay / paraguai","paraguay"].includes(lc))            return "Paraguay";
  if (["osterreich","austria"].includes(lc))                      return "Austria";
  if (lc.startsWith("schweiz") || lc === "switzerland")           return "Switzerland";
  if (["peru"].includes(lc))                                      return "Peru";
  if (["thailand"].includes(lc))                                  return "Thailand";
  if (["malaysia","malasia"].includes(lc))                        return "Malaysia";
  return (raw || "").trim();
}

// ── Chile: DB region names → exact TopoJSON canonical names ──────────────────
// TopoJSON (Natural Earth 10m) uses these exact names:
const CHILE_SLUG_TO_TOPO = {
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
  // Also catch variant spellings
  "region del biobio":                                        "Bío-Bío",
  "biobio":                                                   "Bío-Bío",
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
    // Already a real state name → keep
    if (BRAZIL_STATE_SLUGS.has(s)) return BRAZIL_STATE_SLUGS.get(s);
    // City → state mapping
    if (BRAZIL_CITY_TO_STATE[s]) return BRAZIL_CITY_TO_STATE[s];
    // Drop cities we can't map (won't match TopoJSON)
    return null;
  }

  if (country === "United States of America") {
    // Expand abbreviations
    if (US_STATE_ABBREV[rawState.trim()]) return US_STATE_ABBREV[rawState.trim()];
  }

  return state;
}

// ── Fetch all active attractions (paginated) ──────────────────────────────────
async function fetchAllActive() {
  let page = 0;
  const rows = [];
  process.stdout.write("   Fetching core.attractions (is_active=true)...");
  while (true) {
    const { data, error } = await sb
      .from("attractions")
      .select("country, state, city")
      .eq("is_active", true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error("Supabase fetch error: " + error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
    if (page % 50 === 0) process.stdout.write(`\n   ...${rows.length.toLocaleString()} fetched`);
  }
  process.stdout.write(` done → ${rows.length.toLocaleString()} rows\n`);
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
