import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * BR-B2B-007 — "O que a oferta publicada ao parceiro pode afirmar".
 * BR-B2B-004 — "O parceiro distribui; quem paga é o usuário final".
 * BR-B2B-009 — "A venda de pacote ao parceiro existe como possibilidade e
 *               não se divulga".
 * BR-MAPA-005 — "Roteirização é de terceiro: o Tuggi não roteiriza".
 *
 * BR-B2B-007 closes the list of what partner-facing copy may state as
 * existing (partner brand in the CMS he operates, data scope, QR/fingerprint
 * attribution, revenue share). Everything else is forbidden until a new
 * decision exists, and the claims below were all published on
 * /enterprise/fleets, /enterprise/city-os, /technology,
 * /trust-center/security-sla and /trust-center/data-deletion until they were
 * removed. This spec is the tripwire: it fails if any of them comes back, in
 * source or in what the server actually renders.
 *
 * BR-B2B-009 is the mirror image: wholesale — packages, lots, volume
 * discounts — was never published, and its absence is a decision, not a gap.
 * Nothing to remove there, so what this spec guards is that nobody
 * "completes" the page with it later.
 *
 * Three scopes, because three different kinds of string were removed:
 *
 *   "everywhere" — the wording has no legitimate use anywhere on the site
 *                  (a fabricated dashboard figure, a certification we do not
 *                  hold). Scanned across all of src/.
 *   "partner"    — the same words are true elsewhere and only the partner
 *                  claim was forbidden. "24 hours" is the free trial window
 *                  (BR-MONETIZACAO-013) on consumer pages but a deployment
 *                  SLA on /enterprise/fleets. Scanned only over the partner
 *                  surfaces.
 *   "code"       — the claim was cut out of everything a human or a crawler
 *                  reads *outside* the consumer message files: components,
 *                  route handlers, lib constants, plus the partner
 *                  namespaces of src/messages. Consumer copy still carries
 *                  the wording in 4 languages and replacing it is a copy
 *                  card, not a deletion — see the hands-free note below.
 *
 * The "100% hands-free" claim is the one "code" scope exists for. It was
 * removed from the partner surfaces, from /llms.txt and from the
 * SoftwareApplication feature list, because those said it as an unbacked
 * absolute and no vigent rule backs it. It stays, for now, in the consumer
 * strings of src/messages (Home, Drive, Tours, FAQ), which are outside this
 * scope on purpose — replacing them is a copy card, not a deletion. The
 * FatFooter waiver this claim used to carry is gone: issue #147 landed, the
 * tagline moved to Footer.tagline in four languages, and the footer is now
 * scanned like any other component and read like any other rendered text.
 *
 * Some claims here have no rule behind them in either direction — not
 * "forbidden by BR-B2B-007", but "asserted with nothing to assert it from".
 * Liability reduction, physical safety, a software audit and delegated
 * governance were all published as fact and no BR-* authorizes any of them.
 * They are guarded the same way, and the reason is written on each entry: it
 * is what tells whoever wants the wording back that it needs a rule first,
 * not a better sentence.
 *
 * src/data/ is excluded from the source scan: those are generated route and
 * coverage snapshots (`npm run update-routes`), not copy, and their POI ids
 * collide with the bare numbers below.
 *
 * ---------------------------------------------------------------------------
 * The two halves of this file, and why the second one exists
 * ---------------------------------------------------------------------------
 *
 * Everything above is the first half: a list of wordings that were published
 * and removed. It is exact and it is retrospective, and four sweeps in a row
 * proved what that costs — each one turned up the next one's material, because
 * a list can only catch the sentence somebody already wrote.
 *
 * CLAIM_FAMILIES, further down, is the second half. It carries the five classes
 * those sweeps decided — a gain promised to the partner, an absolute with
 * nothing behind it, a priced entry, safety sold as a benefit, governance held
 * by a third party — as patterns rather than literals, matched against every
 * message string in four languages, against what the partner and trust-center
 * pages actually serve, and against /llms.txt.
 *
 * A family is not a banned word. It is a word *with nobody behind it*, so every
 * survivor is waived by message key with its reason written next to it. That
 * waiver list is the honest inventory of what still stands and why: the
 * contract's own liability disclaimer, the price and plan copy this sweep was
 * scoped out of, two claims reported to `produto` rather than cut. Adding to it
 * is a deliberate act with a sentence attached — and a waiver whose only reason
 * is "the test was red" is the failure mode this whole file exists against.
 *
 * The specific claims a rule already settled are cited by ID on each entry:
 * BR-COMUNICACAO-002 item 6 (nothing earlier than 2025 is publishable),
 * BR-COMUNICACAO-003 (a usage figure needs instrumentation on the day it is
 * published, and no rounding repairs one that has none).
 */

type Scope = "everywhere" | "partner" | "code";

interface ForbiddenClaim {
  /** What was removed, as the operator listed it. */
  claim: string;
  /** The literal strings, in every language the claim was published in. */
  terms: string[];
  scope: Scope;
}

const FORBIDDEN_CLAIMS: ForbiddenClaim[] = [
  {
    claim: "RevPA dashboard mockup on /enterprise/fleets (fabricated figures)",
    terms: [
      "RENTAL_REVPA",
      "142500",
      "142.500",
      "142,500",
      "4205",
      "4.205",
      "4,205",
      "12400",
      "12.400",
      "12,400",
      "Total Ancillary Revenue",
      "Active Fleets",
      "Premium Upgrades",
    ],
    scope: "everywhere",
  },
  {
    // The metric itself, not just the mockup: "Boost Your RevPA" (hero),
    // "Maximized RevPA" (financial column) and "generate new RevPA streams"
    // (home fork) all promised the partner a revenue outcome. BR-B2B-007
    // item 4 backs a revenue *share* on what he attributes — never a figure
    // or a lift.
    claim: "RevPA promised to the partner as an outcome",
    terms: ["RevPA"],
    scope: "everywhere",
  },
  {
    claim: "Zero-risk badge above the fleet safety mockup",
    terms: ["Zero Risk", "Risco Zero", "Riesgo Cero", "Rischio Zero"],
    scope: "everywhere",
  },
  {
    claim: "Fewer collisions and less workshop downtime for the fleet",
    terms: [
      "Reduza colisões",
      "Reduce minor collisions",
      "Reduce las colisiones",
      "Riduci i piccoli incidenti",
      "inatividade dos veículos",
      "vehicle downtime",
      "inactividad de los vehículos",
      "fermi macchina in officina",
    ],
    scope: "everywhere",
  },
  {
    claim: "National fleet deployed in 24 hours",
    terms: ["em 24 horas", "in 24 hours", "en 24 horas", "in 24 ore"],
    scope: "partner",
  },
  {
    claim: "Dynamic Routing Protocol panel on /enterprise/city-os",
    terms: ["Dynamic Routing", "Re-routing flow", "Historical Center: 95%"],
    scope: "everywhere",
  },
  {
    claim: "Economic decompression routes",
    terms: [
      "Descompressão Econômica",
      "Economic Decompression",
      "Descompresión Económica",
      "Decompressione Economica",
      "Instant Story Re-routing",
    ],
    scope: "everywhere",
  },
  {
    claim: "Public utility and emergency broadcasting",
    terms: [
      "Utilidade Pública e Emergências",
      "Public Utility & Emergencies",
      "Utilidad Pública y Emergencias",
      "Utilità Pubblica ed Emergenze",
    ],
    scope: "everywhere",
  },
  {
    claim: "Predictive heatmaps",
    terms: ["Mapas de Calor", "Predictive Heatmaps", "Mappe di Calore", "Heatmaps"],
    scope: "everywhere",
  },
  {
    claim: "Language demographics with per-language percentages",
    terms: [
      "Demografia de Idiomas",
      "Language Demographics",
      "Demografía Lingüística",
      "Demografia Linguistica",
    ],
    scope: "everywhere",
  },
  {
    claim: "DTI Compliance Engine badge",
    terms: ["DTI Compliance"],
    scope: "everywhere",
  },
  {
    claim: "City certified as a Smart Destination",
    terms: [
      "Destino Inteligente certificado",
      "certified Smart Destination",
      "Destinazione Intelligente certificata",
    ],
    scope: "everywhere",
  },
  {
    // Was "partner" scope while the same figure survived in the traveller
    // facing trust center (Legal.Security.s3Item2). That copy is gone too, so
    // the number now has no home on the site and the scope widens with it.
    // No vigent rule states an availability target; until one does, quoting a
    // figure is a promise nothing backs.
    claim: "99.9% uptime SLA",
    terms: ["99,9%", "99.9%"],
    scope: "everywhere",
  },
  {
    claim: "Military-grade governance",
    terms: ["Nível Militar", "Military-Grade", "Grado Militar", "Livello Militare"],
    scope: "everywhere",
  },
  {
    claim: "Audit trail table on /technology",
    terms: [
      "Audit Trail",
      "audit trail",
      "Trilhas de Auditoria",
      "UPDATE_TRIGGER",
      "REVOKE_LICENSE",
      "PREFETCH_CACHE",
      "sec_log_tail",
    ],
    scope: "everywhere",
  },
  {
    // Split from the entry above only because the Spanish wording collides
    // with the trust center's own audit-log section (Legal.Security.s2Title),
    // which is traveller-facing and outside this removal.
    claim: "Audit trail promised to the partner (es)",
    terms: ["Registros de Auditoría"],
    scope: "partner",
  },
  {
    claim: "World's first 100% hands-free contextual routing engine",
    terms: [
      "world's first",
      "primeiro motor de roteamento",
      "primer motor de enrutamiento",
      "primo motore di routing",
    ],
    scope: "everywhere",
  },
  {
    claim: "Hands-free stated as an absolute on partner and machine-readable surfaces",
    terms: [
      "hands-free",
      "hands free",
      "Hands-free",
      "Hands-Free",
      "Hands Free",
      "manos libres",
      "Manos Libres",
      "mani libere",
      "Mani Libere",
      "mãos livres",
      "Mãos Livres",
    ],
    scope: "code",
  },

  // ---------------------------------------------------------------------
  // Second wave: what BR-B2B-007 forbids on /enterprise/fleets and on
  // /trust-center/security-sla, plus the wholesale BR-B2B-009 keeps unsaid.
  // ---------------------------------------------------------------------

  {
    // BR-B2B-007 item 5. The whole Fleets.Brand block promised the rental
    // company its identity inside the *traveller's app* — its voice, its
    // colours — and the three cards said it in hard-coded English, outside
    // i18n (CLAUDE.md §8). BR-CMS-001 keeps the Tuggi brand in front of the
    // end user, so the block came out with its component.
    //
    // The bare word "white-label" is deliberately NOT in this list: the rule
    // fixes its *object*, not the word. "Your brand on the panel you operate"
    // is item 1 of the allowed list and is true. Every term below names the
    // app, not the CMS.
    claim: "Partner branding applied to the traveller's app (voice, colours, identity)",
    terms: [
      "White-Label UI",
      "your own visual identity",
      "Custom Voice",
      "tailored audio guides",
      "Personalize a voz",
      "Customize the app's voice",
      "Personaliza la voz",
      "Personalizza la voce",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 6. No rule creates per-partner content scope in the
    // app, and "sponsored" presupposes item 7 on top of it. Published in two
    // places at once: the Fleets.Brand copy sold the sponsored premium route,
    // and the trust center promised routes "visible only to your users".
    claim: "Sponsored or exclusive routes reserved to a partner's users",
    terms: [
      "Rotas Premium Exclusivas",
      "Exclusive Premium Routes",
      "Rutas Premium Exclusivas",
      "Percorsi Premium Esclusivi",
      "Exclusive Routes",
      "Sponsor unique private routes",
      "rotas exclusivas",
      "exclusive routes",
      "rutas exclusivas",
      "percorsi esclusivi",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 7, on a trust center page: the money was described as
    // walking *into* Tuggi, which BR-B2B-004 items 2 and 3 say it never does.
    claim: "City OS acquired by a municipality",
    terms: ["adquire o City OS", "acquires City OS", "adquiere City OS", "acquisisce City OS"],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 7, same page: "official zones contracted by cities or
    // companies" states a purchase and a per-buyer content scope at once.
    claim: "Official zones contracted by cities or companies",
    terms: [
      "zonas oficiais contratadas",
      "official zones contracted",
      "zonas oficiales contratadas",
      "zone ufficiali contrattate",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 7, in page metadata rather than on screen: the orphaned
    // Metadata.fleetsDescription still offered the fleet "a simple monthly
    // license per vehicle". A licence the partner buys is exactly what
    // BR-B2B-004 item 2 rules out.
    claim: "Monthly per-vehicle license sold to the fleet",
    terms: [
      "licença mensal por veículo",
      "monthly license per vehicle",
      "licencia mensual por vehículo",
      "licenza mensile per veicolo",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-009 items 1 and 2. Wholesale never went live — the copy was
    // caught before publication — so this entry guards an absence, not a
    // removal. The operator chose not to publish instead of revoking
    // BR-B2B-004, and item 2 says whoever notices the gap must not "complete"
    // the page. The bare word "pacote" is not here on purpose: it is the
    // offline city download in three consumer strings (BR-B2B-009, edge
    // cases), and only the buying phrasings are forbidden.
    claim: "Partner buying a package, lot or volume discount (BR-B2B-009)",
    terms: [
      "pacotes de dias",
      "lote de acessos",
      "desconto de volume",
      "packages of days",
      "batch of accesses",
      "volume discount",
      "paquetes de días",
      "lote de accesos",
      "descuento por volumen",
      "pacchetti di giorni",
      "lotto di accessi",
      "sconto sul volume",
    ],
    scope: "everywhere",
  },

  // ---------------------------------------------------------------------
  // Third wave: the licence-provisioning API on /technology, the
  // provisioning path invoked on /trust-center/data-deletion, the revenue
  // outcome on /enterprise/fleets and the delegated-zone frame left over on
  // /trust-center/security-sla.
  // ---------------------------------------------------------------------

  {
    // BR-B2B-007 item 7 and BR-B2B-004 item 3, sold as an integration: the
    // whole Technology.API block existed to say a rental company's booking
    // system provisions a paid licence when the traveller pays for the car.
    // No account is ever paid for by a third party, so the block came out
    // with its component.
    claim: "Licenses provisioned through the partner's booking flow (BR-B2B-004)",
    terms: [
      "Provisione licenças",
      "Instantly provision licenses",
      "Aprovisiona licencias",
      "Attiva istantaneamente le licenze",
    ],
    scope: "everywhere",
  },
  {
    // Same block, second layer: the request mockup stated the same thing in
    // a form a technical buyer would try. api.tuggi.io does not resolve
    // (NXDOMAIN, checked 2026-08-06) and /api/v1/licenses/provision never
    // existed — a fabricated endpoint for a capability the rule forbids.
    // brandProfile is item 5 on top of it: the partner's identity inside the
    // traveller's app.
    claim: "REST mockup with a dead host and a fabricated provisioning endpoint",
    terms: [
      "api.tuggi.io",
      "licenses/provision",
      "sk_live_fleet",
      "bookingRef",
      "renterEmail",
      "brandProfile",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 7 and BR-B2B-004 item 3 on the data deletion page,
    // which is the worst place for them: the copy told the data subject his
    // erasure could be held back by a City OS portal or a Fleets corporate
    // licence — a provisioning path that does not exist, and a contract
    // nobody signs. The section was only that premise, so it went whole. The
    // page still states what happens to the data in section 1; the retention
    // that is real (BR-USUARIO-022, BR-USUARIO-023) was never on this page
    // and is copy for the design agent, not something a removal invents.
    claim: "Account provisioned by a City OS portal or a Fleets corporate license (BR-B2B-004)",
    terms: [
      "portal governamental City OS",
      "City OS government portal",
      "portal gubernamental City OS",
      "portale governativo City OS",
      "licença corporativa de Frotas",
      "Fleet Enterprise license",
      "licencia corporativa de Flotas",
      "licenza Fleet Enterprise",
      "contratos B2B",
      "B2B contracts",
      "contratti B2B",
    ],
    scope: "everywhere",
  },
  {
    // Same class as RevPA, removed in the first wave: BR-B2B-007 item 4
    // backs a share of the revenue the partner attributes, never a promised
    // gain and never an adjective sizing it. The fleet hero promised both
    // the gain and its size, plus a cost floor nothing backs.
    claim: "Massive ancillary revenue at near-zero cost promised to the fleet",
    terms: [
      "receitas auxiliares massivas",
      "massive ancillary revenue",
      "ingresos auxiliares masivos",
      "enormi ricavi accessori",
      "custos de infraestrutura quase nulos",
      "near-zero infrastructure costs",
      "costos de infraestructura casi nulos",
      "costi di infrastruttura quasi nulli",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 items 6 and 7. After the second wave the security page kept
    // a frame wider than what was left inside it: a "Delegated Sovereignty"
    // model and a heading about zone management for B2G and B2B, both of
    // which presuppose a zone handed to a city or a company — the same thing
    // "contracted zones" was removed for. The surviving item says the
    // opposite (Tuggi curates where there is no local management), so it
    // became the section and the frame went.
    claim: "Delegated sovereignty over a zone handed to a city or company",
    terms: [
      "Soberania Delegada",
      "Delegated Sovereignty",
      "Soberanía Delegada",
      "Sovranità Delegata",
      "Gestão de Zonas",
      "Zone Management",
      "Gestión de Zonas",
      "Gestione delle Zone",
    ],
    scope: "everywhere",
  },

  // ---------------------------------------------------------------------
  // Fourth wave. The first three entries are a different border from
  // everything above: they were not removed because BR-B2B-007 forbids
  // them, but because no vigent BR-* asserts them at all. Searching
  // docs/business-rules/ for risk reduction, driver distraction, physical
  // safety, software audit or delegated governance returns no rule, in
  // either direction. That is the reason each one is here, and it is also
  // the condition for coming back: a rule, not a rewrite. Whoever wants the
  // argument on the page again asks `produto` for the BR-* first.
  //
  // The last two do have a rule: the near-zero cost of entry is BR-B2B-007
  // item 7 again, and the footer tagline claimed contextual routing, which
  // is exactly what BR-MAPA-005 denies.
  // ---------------------------------------------------------------------

  {
    // No rule authorizes it. The whole FleetsRisk block existed to argue that
    // Tuggi lowers the fleet's risk and liability: "Minimize Liability" as a
    // heading, third-party crash statistics with no source in the body, and a
    // "High Risk" badge over screen-based apps in hard-coded English (CLAUDE.md
    // §8). The component went with its copy. The nearest thing to a rule here
    // is BR-AUDIO-019 — Tuggi coexists with the apps already playing — and it
    // says nothing about safety outcomes.
    claim: "Liability and crash-risk reduction promised to the fleet (no rule authorizes it)",
    terms: [
      "Minimize a Responsabilidade",
      "Minimize Liability",
      "Minimiza la Responsabilidad",
      "Minimizza la Responsabilità",
      "A distração do motorista",
      "Driver distraction",
      "La distracción del conductor",
      "La distrazione del conducente",
      "olhos do motorista na estrada",
      "Eyes on the Road",
      "ojos del conductor en la carretera",
      "occhi del conducente sulla strada",
      "Visual Distraction",
      "Screen-based Apps",
      "High Risk",
      "Risk Management",
    ],
    scope: "everywhere",
  },
  {
    // No rule authorizes it, and the second half asserts a fact about the
    // world: Legal.Security.s3Item3 told the traveller that his physical
    // safety is our "number one commitment" and that "the software is
    // audited". Nobody here knows of an audit, and an audit claim on a trust
    // center page is the kind a buyer checks. The item went; the offline one
    // next to it stayed, because BR-AUDIO-007 backs it.
    claim: "Audited software and physical safety as a number-one commitment (no rule authorizes it)",
    terms: [
      "O software é auditado",
      "The software is audited",
      "El software está auditado",
      "Il software è verificato",
      "compromisso número um",
      "number one commitment",
      "compromiso número uno",
      "impegno numero uno",
      "sua segurança física",
      "your physical safety",
      "su seguridad física",
      "la tua sicurezza fisica",
    ],
    scope: "everywhere",
  },
  {
    // No rule authorizes it, and it is the frame the third wave left standing.
    // "Delegated Sovereignty" and "Zone Management" came out as headings, but
    // the page kept saying the same thing in prose: a "hybrid governance
    // model" for "Citizens, Governments and Enterprises", and a curation
    // clause that only makes sense if somewhere else has active local
    // management. That is items 6 and 7 of BR-B2B-007 by other words, and
    // nothing describes a zone delegated to a city or a company.
    claim: "Hybrid governance with zones delegated to a city or company (no rule authorizes it)",
    terms: [
      "governança híbrida",
      "hybrid governance",
      "gobernanza híbrida",
      "governance ibrido",
      "Em áreas onde não há uma gestão local ativa",
      "In areas where there is no active local management",
      "En áreas donde no hay gestión local activa",
      "Nelle aree in cui non c'è una gestione locale attiva",
      "Cidadãos, Governos e Empresas",
      "Citizens, Governments, and Enterprises",
      "Ciudadanos, Gobiernos y Empresas",
      "Cittadini, Governi e Aziende",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 7, the same class as the "near-zero infrastructure
    // costs" removed from the fleet hero in the third wave. A cost floor is
    // only meaningful to someone who is deploying the product, and no partner
    // or municipality deploys, contracts or pays for anything. What was true
    // underneath — no specialized hardware, no government infrastructure to
    // run — stayed; the price of entry went.
    claim: "Near-zero cost of entry offered to a partner or a government",
    terms: [
      "Custo de Entrada Quase Nulo",
      "Near-Zero Entry Cost",
      "Costo de Entrada Casi Nulo",
      "Costo d'ingresso quasi nullo",
      "sem custos de infraestrutura para governos",
      "without government infrastructure costs",
      "sin costos de infraestructura gubernamental",
      "senza costi di infrastruttura per il governo",
    ],
    scope: "everywhere",
  },
  {
    // BR-MAPA-005: routing is a third party's job and "Contextual Routing" is
    // the exact thing the rule denies, published in English on every page of
    // the site because the footer tagline was hard-coded in the component.
    // Issue #147 replaced it with Footer.tagline in four languages.
    claim: "Contextual routing claimed in the footer tagline (BR-MAPA-005, issue #147)",
    terms: [
      "Contextual Routing",
      "The Cultural Copilot for Drivers",
      "Cultural Copilot",
    ],
    scope: "everywhere",
  },

  // ---------------------------------------------------------------------
  // Fifth wave. Four waves of named lists each turned up the next wave's
  // material, so this one was a sweep rather than a list: every string the
  // site publishes, read against five families of claim that the four
  // commits before it already decided (see CLAIM_FAMILIES below). The
  // entries here are the literal wordings that came out; the family scan is
  // what stops the sixth wave from existing.
  // ---------------------------------------------------------------------

  {
    // BR-B2B-007 item 4 backs a share of the revenue the partner attributed,
    // never the gain and never a satisfaction metric. This was published in
    // three places at once: the fleets page meta description (so it reached
    // the search snippet and the social card), the home fork card, and a
    // whole section built on the metric — "the war on it", won by "exploding
    // customer satisfaction". Same class as RevPA in the first wave.
    claim: "Revenue and satisfaction-metric gains promised to the fleet (BR-B2B-007 item 4)",
    terms: [
      "NPS",
      "RevPA",
      "ROI",
      "você ganha receita",
      "you add revenue",
      "tú sumas ingresos",
      "tu aumenti ricavi",
      "explodindo a satisfação",
      "exploding customer satisfaction",
      "disparando la satisfacción",
      "facendo esplodere la soddisfazione",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 7 and BR-B2B-004 items 2 and 3: the money walks out of
    // Tuggi to the partner, never in, so there is no entry price to call
    // small. Three separate cost floors were still published — the fleet's
    // hardware investment and "bring your own device" model, its cost of
    // acquisition, its "only investment" with a payback horizon — plus the
    // municipality's minimal capital expenditure. The fourth wave removed one
    // of these from the same card ("near-zero entry cost") and left the
    // heading above it saying the same thing.
    claim: "A priced entry — capex, hardware investment, acquisition cost, payback (BR-B2B-007 item 7)",
    terms: [
      "CAPEX",
      "BYOD",
      "Baixo CAC",
      "Low-CAC",
      "Bajo CAC",
      "Basso CAC",
      "Investimento Mínimo em Hardware",
      "Minimal Hardware Investment",
      "Inversión Mínima en Hardware",
      "Investimento Hardware Minimo",
      "Seu único investimento",
      "Your only investment",
      "Tu única inversión",
      "Il tuo unico investimento",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 7. The municipality does not stand the product up and
    // does not pay to hand it out: "distribute the OS without digital
    // marketing spend" is both halves at once, and the heading above it
    // priced the rollout. The section was only that premise, so it went with
    // its component (CityOSMandate.tsx).
    claim: "A municipality deploying and distributing the OS (BR-B2B-007 item 7)",
    terms: [
      "Distribua o OS",
      "Distribute the OS",
      "Distribuya el OS",
      "Distribuisci l'OS",
      "sem gastos com marketing digital",
      "without digital marketing spend",
      "sin gasto en marketing digital",
      "senza spese di marketing digitale",
    ],
    scope: "everywhere",
  },
  {
    // Narrative control handed to a third party: BR-B2B-007 items 6 and 7,
    // the same ground "Delegated Sovereignty" was cleared from in the third
    // wave. Published in three registers — the home fork sold it to the
    // municipality, the city-os meta description promised the destination
    // decides what gets told, and the purpose page made it the company's
    // third act. Nothing in docs/business-rules/ hands a narrative, a zone or
    // a curation decision to anyone outside Tuggi.
    claim: "Narrative sovereignty or narrative control granted to a third party (BR-B2B-007 items 6, 7)",
    terms: [
      "soberania narrativa",
      "narrative sovereignty",
      "soberanía narrativa",
      "sovranità narrativa",
      "você decide o que é contado",
      "you stay in control of what's told",
      "tú decides qué se cuenta",
      "decidi tu cosa raccontare",
      "Retomando a Narrativa",
      "Reclaiming the Story",
      "Recuperando la Narrativa",
      "Riprendersi la Storia",
      "poder de retomar sua história",
      "power to reclaim their history",
      "poder de recuperar su historia",
      "potere di riappropriarsi della propria storia",
    ],
    scope: "everywhere",
  },
  {
    // No rule authorizes it, and it is an assertion about personal data,
    // which is the worst kind to leave unbacked. The /technology page stated
    // telemetry was anonymized in full and that adherence to GDPR and LGPD
    // was strict. Searching docs/business-rules/ for what the site telemetry
    // collects returns nothing: BR-USUARIO-017 and 018 define anonymization
    // *on account deletion*, a different fact about a different pipeline.
    // The column went whole rather than softened — an adverb is not what was
    // wrong with it.
    claim: "Telemetry stated as fully anonymized and strictly compliant (no rule authorizes it)",
    terms: [
      "Telemetria 100% Anonimizada",
      "100% Anonymized Telemetry",
      "Telemetría 100% Anonimizada",
      "Telemetria 100% Anonimizzata",
      "Adesão estrita às leis",
      "Strict adherence to European",
      "Estricto cumplimiento de las leyes",
      "Stretta aderenza alle leggi",
    ],
    scope: "everywhere",
  },
  {
    // Absolutes with nothing behind them, on /technology and on the trust
    // center. "Zero connectivity reliance" is contradicted two sentences
    // later by its own copy, which requires a download first; "absolute
    // security", "guaranteeing zero playback failures", "immune to connection
    // failures" and "the same security standards as the world's largest
    // technology companies" state outcomes no rule and no measurement backs.
    claim: "Reliability and security stated as absolutes (no rule authorizes them)",
    terms: [
      "Dependência Zero de Conectividade",
      "Zero Connectivity Reliance",
      "Dependencia Cero de Conectividad",
      "Zero Dipendenza dalla Connettività",
      "zero falhas de reprodução",
      "zero playback failures",
      "cero fallos de reproducción",
      "zero interruzioni di riproduzione",
      "segurança absoluta",
      "absolute security",
      "seguridad absoluta",
      "sicurezza assoluta",
      "imune a falhas de conexão",
      "immune to connection failures",
      "inmune a fallos de conexión",
      "immune ai guasti di connessione",
      "mesmos padrões de segurança das maiores empresas",
      "same security standards as the world's largest",
      "mismos estándares de seguridad que las empresas de tecnología más grandes",
      "stessi standard di sicurezza delle più grandi aziende",
    ],
    scope: "everywhere",
  },
  {
    // Two guarantees about what the product will do, on surfaces where the
    // contract says the opposite. Legal.Terms.s3Item1 declines to warrant
    // trigger precision in shadowed areas and s3Item2 declines to warrant the
    // narration's accuracy — while /technology promised triggering ONLY when
    // facing the POI and the trust center promised delivery "with precision"
    // and that the tourist is never left in silence. Two published texts
    // cannot disagree about the same fact; the one with no rule is the one
    // that goes.
    claim: "Trigger precision and delivery guaranteed against the contract's own disclaimer",
    terms: [
      "acionadas APENAS quando",
      "trigger ONLY when",
      "se activen SOLO cuando",
      "partano SOLO quando",
      "nunca fique em silêncio",
      "never left in silence",
      "nunca se quede en silencio",
      "non resti mai in silenzio",
      "entregue com precisão e segurança",
      "delivered with precision and security",
      "se entregue con precisión y seguridad",
      "forniti con precisione e sicurezza",
    ],
    scope: "everywhere",
  },
  {
    // No rule authorizes it, in either direction — the same border the fourth
    // wave crossed when it removed the liability block and the physical-safety
    // pledge. Safety was still the first of the company's stated values, and
    // it carried an absolute and a pledge about the driver's attention with
    // it. BR-AUDIO-019 is about coexisting with the audio already playing and
    // says nothing about safety outcomes.
    // The bare heading is deliberately not a term here: Legal.Terms.s2Title
    // uses the same words to name the traffic-liability *disclaimer*, which is
    // the opposite claim and belongs on that page. The pledge below it is
    // unambiguous, so that is what is guarded.
    claim: "Safety sold as a value, with a pledge about the driver's attention (no rule authorizes it)",
    terms: [
      "Segurança Primeiro.",
      "Seguridad Primero.",
      "Nunca competimos pela atenção do motorista",
      "We never compete with the driver's attention",
      "Nunca competimos con la atención del conductor",
      "Non competiamo mai con l'attenzione del conducente",
    ],
    scope: "everywhere",
  },
  {
    // BR-B2B-007 item 4 again, in the shape a public buyer recognizes: an
    // eyebrow badge offering to fast-track the municipality's accessibility
    // rating. A score is an outcome, and nothing produces it on our side.
    claim: "A lift in the municipality's accessibility rating (BR-B2B-007 item 4)",
    terms: [
      "Pontuação de Acessibilidade DTI",
      "DTI Accessibility Score",
      "Puntuación de Accesibilidad DTI",
      "Punteggio di Accessibilità",
    ],
    scope: "everywhere",
  },
  {
    // BR-COMUNICACAO-003, items 3, 4 and 5. A five-figure play count was
    // published in four languages with a TODO next to it asking whether it
    // was true. It is not — 1,653 raw plays, 201 from 7 external users,
    // measured 2026-08-06 — and item 4 says no rounding repairs a figure with
    // no source. Item 5 holds the space empty until question 72 is answered,
    // so this entry guards an absence as much as a removal.
    claim: "Play-count social proof with no instrumentation behind it (BR-COMUNICACAO-003)",
    terms: [
      "50.000 histórias",
      "50,000 stories",
      "50.000 historias",
      "50.000 storie",
      "50k plays",
    ],
    scope: "everywhere",
  },
  {
    // BR-COMUNICACAO-002 item 6: the first row in auth.users is 2025-07-01,
    // and nothing earlier than 2025 is publishable under any reading. The
    // purpose page signed its manifesto with an earlier year, hard-coded in
    // English on every locale.
    claim: "An operating-since date earlier than the rule allows (BR-COMUNICACAO-002 item 6)",
    terms: ["Since 2024", "desde 2024", "dal 2024", "Since 2023", "desde 2023"],
    scope: "everywhere",
  },
  {
    // BR-MAPA-005, the localized half of what issue #147 removed from the
    // footer in English. /technology invited the reader to discover the
    // architecture behind "the contextual routing engine" in all four
    // languages. Tuggi does not route: "how do I get there" leaves for Google
    // Maps, Waze or Apple Maps, which are partners.
    claim: "A contextual routing engine, in the four site languages (BR-MAPA-005)",
    terms: [
      "motor de roteamento contextual",
      "contextual routing engine",
      "motor de enrutamiento contextual",
      "motore di routing contestuale",
    ],
    scope: "everywhere",
  },
];

/* ---------------------------------------------------------------------------
 * Claim families.
 *
 * Everything above is a list of wordings that were removed, and a list only
 * catches the sentence that was already written. Four waves of named lists each
 * turned up the fifth wave's material, which is the evidence that the method
 * runs out: the next sentence of the same class is not on any list yet.
 *
 * These five families are the classes themselves, each one already decided by
 * the commits above, each one matched by pattern rather than by literal. A
 * sentence of a known class now fails the day it is written instead of being
 * found in the next sweep.
 *
 * A family is not a ban on a word. It is a ban on a word *with nobody behind
 * it* — so every survivor is waived by key, with the reason written next to it,
 * and the waiver list is the honest record of what is still standing and why.
 * Adding a waiver is a deliberate act with a sentence attached; that is the
 * point. What must never happen is a waiver whose reason is "the test was red".
 * ------------------------------------------------------------------------- */

interface Waiver {
  /** Message keys, or key prefixes: "Legal.Terms" waives that whole namespace. */
  keys: string[];
  why: string;
}

interface ClaimFamily {
  id: string;
  /** What decided this family — a rule, or the absence of one. */
  rule: string;
  patterns: RegExp[];
  waivers: Waiver[];
}

const CLAIM_FAMILIES: ClaimFamily[] = [
  {
    id: "gain promised to the partner",
    rule:
      "BR-B2B-007 item 4 — what the partner gets is a share of the revenue he " +
      "attributed. Never the gain, never a metric, never an adjective sizing it.",
    patterns: [
      /\bNPS\b/,
      /\bRevPA\b/,
      /\bROI\b/,
      /\bupsell/i,
      /\bmaximiz/i,
      /\bticket m[eé]dio\b|\baverage ticket\b|\bticket medio\b/i,
      /\bocupa[cç][aã]o\b|\boccupancy\b|\bocupaci[oó]n\b|\boccupazione\b/i,
      /(receitas?|ingresos|ricavi|revenue)[^.]{0,30}(auxiliar|ancillary|accessori)/i,
    ],
    waivers: [],
  },
  {
    id: "absolute with nothing behind it",
    rule:
      "No BR-* backs an absolute about availability, precision, anonymization " +
      "or safety. The fourth wave removed the availability figure for this " +
      "reason; the fifth removed the anonymization and reliability absolutes.",
    patterns: [
      /100\s?%/,
      /\b(zero|cero)\b/i,
      /\bgarant\w*/i,
      /\bguarante\w*/i,
      /\bensur\w*/i,
      /\b(sempre|siempre|always)\b/i,
      /\bnunca\b|\bnever\b/i,
      /\b(certificad\w*|certified)\b/i,
      /\b(absolut\w*|assolut\w*)\b/i,
      /\b(fully|totalmente|completamente)\b/i,
      /\btotal\b/i,
    ],
    waivers: [
      {
        keys: ["Legal.Terms"],
        why:
          "The contract, and the words point the other way there: s3Item1 declines " +
          "to warrant trigger precision in shadowed areas, s3Item2 declines to " +
          "warrant the narration's accuracy, s8Item3 is Apple's and Google's " +
          "statutory warranty clause and s1Item2 is the driver warranting his own " +
          "licence. Its owner is legal counsel, not `design`.",
      },
      {
        keys: ["Legal.Privacy", "Legal.Accessibility"],
        why:
          "Policy pages. The absolutes left are about the data subject's rights " +
          '("total control over your data") and about WCAG conformance, both of ' +
          "which are claims about personal data and about compliance — reported to " +
          "`produto`, not cut by `dev` on its own reading.",
      },
      {
        keys: ["Legal.DataDeletion"],
        why: "Issue #167 owns this page; the fifth wave was told to leave it alone.",
      },
      {
        keys: ["Drive"],
        why:
          "Price, plan and billing (BR-MONETIZACAO), which the fifth wave was " +
          'scoped out of: the offline absolutes on the passes ("100% offline", ' +
          '"zero roaming charges", "always") describe what a pass includes and the ' +
          "site has to agree with the store. Reported, not cut.",
      },
      {
        keys: ["NotFound.subtitle"],
        why:
          "404 copy about the traveller's freedom to go anywhere, not a capability " +
          "of the product.",
      },
      {
        keys: ["Purpose.Freedom.body"],
        why:
          'A belief, and it says so ("we believe exploration should be…"). It ' +
          "asserts nothing the product does.",
      },
      {
        keys: ["Home.Simulator.subtitle"],
        why:
          'The en and es strings say the driver never has to look at a screen — ' +
          "the hands-free wording the fourth wave deliberately left in consumer " +
          "copy as a copy card, not an absolute of its own.",
      },
    ],
  },
  {
    id: "acquisition, deployment, licence, contract or invoice by a partner",
    rule:
      "BR-B2B-007 item 7 and BR-B2B-004 items 2 and 3 — the money walks from the " +
      "partner outwards. Nobody buys, licences, provisions or is invoiced, so no " +
      "cost of entry exists to be called small. BR-B2B-009 adds that the wholesale " +
      "we could sell is deliberately unpublished: its absence is a decision.",
    patterns: [
      /\bCAPEX\b/i,
      /\bBYOD\b/i,
      /\blicen[cçs]\w*|\blicenz\w*/i,
      /\badquir\w*|\bacquire\w*|\bacquisisc\w*|\bacquist\w*/i,
      /\bcontratad\w*|\bcontracted\b|\bcontrattat\w*/i,
      /\bfatura\w*|\binvoic\w*|\bfattura\w*/i,
      /\bimplanta\w*|\bimplementa\w*|\bdeploy\w*|\bdespleg\w*/i,
      /\binvestiment\w*|\binversi[oó]n\b|\binvestment\b/i,
      /custo de entrada|entry cost|costo de entrada|costo d'ingresso/i,
      /pacotes? de dias|lote de acessos|desconto de volume|volume discount/i,
    ],
    waivers: [
      {
        keys: ["Legal.Terms"],
        why:
          "s1Item2 is the driver's own driving licence, not a product licence — " +
          "the only hit in the contract.",
      },
      {
        keys: ["Fleets.Financial.col2Desc"],
        why:
          "Rolling QR displays out across the counter network is BR-B2B-010 item 1 " +
          "and BR-B2B-001: the establishment becomes a distribution point. Nothing " +
          "is acquired, licensed or paid for.",
      },
      {
        keys: ["Fleets.ESG.title"],
        why:
          "Reported, not removed. It says the rollout is frictionless and asserts " +
          "no purchase, no licence and no figure, and it is the section's only " +
          "heading — cutting it needs copy from `design`, which is the one thing a " +
          "removal must not invent.",
      },
      {
        keys: ["CityOS.Animator.deployButton"],
        why:
          "A CMS mock-up button: the Tuggi operator publishing a POI to the grid, " +
          "not a partner standing anything up.",
      },
      {
        keys: ["Fleets.Financial.col3Desc"],
        why:
          'The Italian "acquisti" there is the *traveller\'s* purchases feeding the ' +
          "partner's revenue share — BR-B2B-007 item 4 and BR-B2B-005, the one " +
          "money flow the rules do back, and it runs outwards.",
      },
    ],
  },
  {
    id: "safety, risk, liability or distraction as a benefit",
    rule:
      "No BR-* authorizes any of them, in either direction — searched in the " +
      "fourth wave and again in the fifth. BR-AUDIO-019 is about coexisting with " +
      "the audio already playing and says nothing about safety outcomes.",
    patterns: [
      /\bdistra\w*/i,
      /segurança física|physical safety|seguridad física|sicurezza fisica/i,
      /\brisco\b|\brisk\b|\briesgo\b|\brischio\b/i,
      /\bresponsabilidad\w*|\bliabilit\w*|\bresponsabilit\w*/i,
      /\bcolis\w*|\bcollision\w*/i,
      /safety first|segurança primeiro|seguridad primero|sicurezza prima/i,
    ],
    waivers: [
      {
        keys: ["Legal.Terms"],
        why:
          "The liability section is a disclaimer, which is the opposite claim: the " +
          "user is solely responsible for driving and TUGGI is not liable. s8Item4 " +
          "is Apple's and Google's product-liability clause.",
      },
    ],
  },
  {
    id: "governance, sovereignty, a zone or narrative control held by a third party",
    rule:
      "BR-B2B-007 items 6 and 7 — no rule creates per-partner content scope, a " +
      "delegated zone or a narrative anyone outside Tuggi decides. The third and " +
      "fourth waves cleared the trust center of it; the fifth cleared the home " +
      "fork, the city-os meta description and the purpose page.",
    patterns: [
      /\bsoberan\w*|\bsovereignt\w*|\bsovranit\w*/i,
      /\bgovernan\w*|\bgobernanza\b/i,
      /gest[ãa]o de zonas|gesti[oó]n de zonas|gestione delle zone|zone management/i,
      /zonas? (oficiais|oficiales|contratad\w*)|official zones/i,
      /curadoria local|local curation|curaci[oó]n local|curatela locale/i,
      /(controle|control|controllo)[^.]{0,25}(narrativ|hist[oó]ri|stor)/i,
    ],
    waivers: [
      {
        keys: ["CityOS.Hero.subtitle"],
        why:
          "Reported, not removed. It claims the product lines up with an external " +
          "framework's pillars (technology, sustainability, accessibility, data), " +
          "which is positioning — not a zone, a narrative or a curation decision " +
          "handed to the city. Cutting it needs a new sentence, so it goes to " +
          "`produto` instead of being rewritten here.",
      },
      {
        keys: ["Legal.Security.title"],
        why: "The page's own heading, about Tuggi's governance of Tuggi.",
      },
    ],
  },
];

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const MESSAGES_DIR = path.join(SRC, "messages");

/** Generated content snapshots, not copy — see the header note. */
const SOURCE_SCAN_IGNORE = [path.join(SRC, "data")];

/**
 * Read off the message directory rather than imported from src/i18n/routing:
 * that module pulls next-intl's client navigation in, which blows up when a
 * spec file is evaluated in Node. A locale is publishable exactly when it has
 * a message file, so this is the same set by another road.
 */
const LOCALES = fs
  .readdirSync(MESSAGES_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => path.basename(name, ".json"))
  .sort();

/** The message namespaces the three partner pages read from. */
const PARTNER_NAMESPACES = ["Fleets", "CityOS", "Technology", "SEO_FLEETS", "SEO_CITY_OS"];

/**
 * The three partner surfaces, as **internal** pathnames — the keys of the
 * route map in src/i18n/pathnames.ts. The public slug differs per locale
 * (/pt/destinos, /it/destinazioni), so the URL is resolved below rather than
 * written here: a test that hard-codes the old URL would still pass through
 * the 301 and stop checking the page it names.
 */
const PARTNER_PAGES = ["/enterprise/fleets", "/destinations", "/technology"];

/** The public URL of an internal pathname, for one locale. */
function localeUrl(locale: string, pagePath: string): string {
  if (!pagePath) return `/${locale}`;
  const slug = localizedPathname(locale, pagePath);
  return slug === "/" ? `/${locale}` : `/${locale}${slug}`;
}

interface RenderedPage {
  path: string;
  /** Which claim scopes are asserted against what this page serves. */
  scopes: Scope[];
}

/**
 * The pages whose served output is checked, and against which scopes.
 *
 * The two trust center pages carried BR-B2B-007 violations of their own —
 * security-sla the delegated-zone frame and the SLA figure,
 * data-deletion the City OS / Fleets provisioning path — so both have to be
 * checked. But they are traveller-facing copy, and the "partner" and "code"
 * scopes exist precisely to leave consumer strings alone. Both would fire
 * here for the wrong reason: security-sla's own audit-log heading is
 * "Registros de Auditoría" in Spanish, and its hands-free safety item is
 * consumer copy the previous removal deliberately kept. "everywhere" is the
 * scope that means "no legitimate use anywhere on the site", so it is the one
 * that applies to these pages.
 */
const RENDERED_PAGES: RenderedPage[] = [
  ...PARTNER_PAGES.map((path) => ({
    path,
    scopes: ["everywhere", "partner", "code"] as Scope[],
  })),
  { path: "/trust-center/security-sla", scopes: ["everywhere"] as Scope[] },
  { path: "/trust-center/data-deletion", scopes: ["everywhere"] as Scope[] },
];

interface Haystack {
  label: string;
  text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SOURCE_SCAN_IGNORE.includes(full)) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Every source file that could carry copy, generated snapshots aside. */
function allSourceFiles(): Haystack[] {
  return walk(SRC).map((file) => ({
    label: path.relative(REPO_ROOT, file),
    text: fs.readFileSync(file, "utf8"),
  }));
}

type MessageFile = Record<string, Record<string, unknown>>;

function messagesFor(locale: string): MessageFile {
  const file = path.join(MESSAGES_DIR, `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as MessageFile;
}

/** Only the partner namespaces of each message file, as one haystack per locale. */
function partnerMessages(): Haystack[] {
  return LOCALES.map((locale) => {
    const messages = messagesFor(locale);
    const partnerOnly = Object.fromEntries(
      PARTNER_NAMESPACES.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
    );
    return {
      label: `src/messages/${locale}.json (${PARTNER_NAMESPACES.join(", ")})`,
      text: JSON.stringify(partnerOnly),
    };
  });
}

/**
 * Everything that is not consumer copy: components, route handlers and lib
 * constants, plus the partner namespaces of src/messages. The consumer
 * strings are out on purpose — see the hands-free note in the header.
 */
function codeSourceFiles(): Haystack[] {
  const code = walk(SRC)
    .filter((file) => !file.startsWith(MESSAGES_DIR + path.sep))
    .map((file) => ({
      label: path.relative(REPO_ROOT, file),
      text: fs.readFileSync(file, "utf8"),
    }));
  return [...code, ...partnerMessages()];
}

/** The blocks and routes that make up the three partner pages, plus their messages. */
function partnerSourceFiles(): Haystack[] {
  const blocks = path.join(SRC, "components/blocks");
  const files = fs
    .readdirSync(blocks)
    .filter((name) => /^(Fleets|CityOS|Tech)/.test(name))
    .map((name) => path.join(blocks, name));

  files.push(
    ...walk(path.join(SRC, "app/[locale]/enterprise")),
    // The City OS route moved out of /enterprise and is served at
    // /destinations, with a 301 per locale. Same page, same claims to guard:
    // this scope follows the file, it does not shrink with it.
    ...walk(path.join(SRC, "app/[locale]/destinations")),
    ...walk(path.join(SRC, "app/[locale]/technology")),
    path.join(SRC, "app/llms.txt/route.ts"),
  );

  const sources: Haystack[] = files.map((file) => ({
    label: path.relative(REPO_ROOT, file),
    text: fs.readFileSync(file, "utf8"),
  }));

  sources.push(...partnerMessages());

  return sources;
}

/** Every leaf string of a message file, by dotted key. */
function flatMessages(locale: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (node: unknown, prefix: string) => {
    if (typeof node === "string") {
      out.set(prefix, node);
    } else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        walk(value, prefix ? `${prefix}.${key}` : key);
      }
    }
  };
  walk(messagesFor(locale), "");
  return out;
}

/** A waiver covers the exact key and everything under it. */
function isWaived(family: ClaimFamily, key: string): Waiver | undefined {
  return family.waivers.find((waiver) =>
    waiver.keys.some((waived) => key === waived || key.startsWith(`${waived}.`)),
  );
}

/**
 * The message strings this family waives, as they appear on screen.
 *
 * Used to subtract the known survivors from a rendered page before scanning it:
 * a waiver written once, by key, then holds for both the source scan and the
 * served scan. `<strong>` markup is stripped because innerText has none.
 */
function waivedStrings(family: ClaimFamily): string[] {
  const out: string[] = [];
  for (const locale of LOCALES) {
    for (const [key, value] of flatMessages(locale)) {
      if (isWaived(family, key)) out.push(value.replace(/<[^>]+>/g, ""));
    }
  }
  // Longest first: a short waived string must not be subtracted out of the
  // middle of a longer one before the longer one gets its turn.
  return out.sort((a, b) => b.length - a.length);
}

function familyHits(family: ClaimFamily, text: string): string[] {
  const hits: string[] = [];
  for (const pattern of family.patterns) {
    const match = text.match(pattern);
    if (match) hits.push(match[0]);
  }
  return hits;
}

function findHits(haystacks: Haystack[], terms: string[]): string[] {
  const hits: string[] = [];
  for (const { label, text } of haystacks) {
    for (const term of terms) {
      if (text.includes(term)) hits.push(`${label} — "${term}"`);
    }
  }
  return hits;
}

/**
 * What the page actually publishes: its visible text, its head metadata and
 * its JSON-LD.
 *
 * Not page.content(): next-intl ships the whole message file down in the RSC
 * payload, so raw HTML matches every consumer string on every page and says
 * nothing about what this page claims. The footer is part of what the page
 * publishes and is read with it — it stopped being an exception when #147
 * moved its tagline into i18n.
 */
async function publishedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelectorAll("script, template, noscript").forEach((node) => node.remove());

    const meta = [...document.querySelectorAll("meta")]
      .map((tag) => tag.getAttribute("content") ?? "")
      .join("\n");
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((tag) => tag.textContent ?? "")
      .join("\n");

    return [document.title, meta, jsonLd, body.innerText].join("\n");
  });
}

test.describe("BR-B2B-007 — partner-facing copy states only what a vigent rule backs", () => {
  const everywhere = FORBIDDEN_CLAIMS.filter((c) => c.scope === "everywhere");
  const partnerOnly = FORBIDDEN_CLAIMS.filter((c) => c.scope === "partner");
  const codeOnly = FORBIDDEN_CLAIMS.filter((c) => c.scope === "code");

  for (const { claim, terms } of everywhere) {
    test(`BR-B2B-007: "${claim}" is gone from src/`, () => {
      expect(findHits(allSourceFiles(), terms)).toEqual([]);
    });
  }

  for (const { claim, terms } of partnerOnly) {
    test(`BR-B2B-007: "${claim}" is gone from the partner surfaces`, () => {
      expect(findHits(partnerSourceFiles(), terms)).toEqual([]);
    });
  }

  for (const { claim, terms } of codeOnly) {
    test(`BR-B2B-007: "${claim}" is gone from components, routes and partner messages`, () => {
      expect(findHits(codeSourceFiles(), terms)).toEqual([]);
    });
  }

  for (const locale of LOCALES) {
    for (const { path: pagePath, scopes } of RENDERED_PAGES) {
      test(`BR-B2B-007: /${locale}${pagePath} renders and serves no forbidden claim`, async ({
        page,
      }) => {
        const response = await page.goto(localeUrl(locale, pagePath));
        expect(response?.status()).toBe(200);
        // The page still has to be a page — a removal that empties it is a
        // regression too, not a pass.
        await expect(page.locator("h1")).toBeVisible();

        const served: Haystack[] = [
          { label: `/${locale}${pagePath}`, text: await publishedText(page) },
        ];
        for (const { claim, terms, scope } of FORBIDDEN_CLAIMS) {
          if (!scopes.includes(scope)) continue;
          expect(findHits(served, terms), claim).toEqual([]);
        }
      });
    }
  }

  test("BR-B2B-007: /llms.txt carries no forbidden claim to AI crawlers", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    const body: Haystack[] = [{ label: "/llms.txt", text: await response.text() }];
    for (const { claim, terms } of FORBIDDEN_CLAIMS) {
      expect(findHits(body, terms), claim).toEqual([]);
    }
  });

  // BR-COMUNICACAO-003 item 1: no peça publishes a usage figure that does not
  // come out of instrumentation, and a star rating is that figure drawn. The
  // section this used to guard is gone with the satisfaction metric it
  // promised; the guard stays, because the next fleets block would draw the
  // same stars.
  test("BR-COMUNICACAO-003: no fleets block renders a star rating", () => {
    const blocks = path.join(SRC, "components/blocks");
    for (const name of fs.readdirSync(blocks).filter((f) => f.startsWith("Fleets"))) {
      const source = fs.readFileSync(path.join(blocks, name), "utf8");
      expect(source, `${name} renders stars`).not.toMatch(/\bStar\b/);
    }
  });

  // Issue #147. The removed tagline was the only string on the site published
  // in English to every visitor, on every page, and it claimed contextual
  // routing (BR-MAPA-005). Its replacement has to exist in all four languages
  // — a key present in one file only would render the fallback and put us
  // back where we started.
  test("BR-MAPA-005: Footer.tagline exists in every language (issue #147)", () => {
    for (const locale of LOCALES) {
      const tagline = messagesFor(locale).Footer?.tagline;
      expect(tagline, `Footer.tagline is missing in ${locale}.json`).toBeTruthy();
      expect(String(tagline).trim().length, `Footer.tagline is empty in ${locale}.json`)
        .toBeGreaterThan(0);
    }
  });

  for (const locale of LOCALES) {
    test(`BR-MAPA-005: /${locale} serves the footer tagline from i18n (issue #147)`, async ({
      page,
    }) => {
      const tagline = String(messagesFor(locale).Footer.tagline);
      await page.goto(`/${locale}`);

      const footer = page.locator("footer");
      await expect(footer).toContainText(tagline);
      // The logo link is the way back home, and its accessible name is the
      // brand — not the file it points at (WCAG 2.2 AA 1.1.1).
      await expect(footer.getByRole("link", { name: "TUGGI", exact: true })).toBeVisible();
    });
  }

  // CLAUDE.md §8: text a human reads is never hard-coded in a component, and
  // og:image:alt is read out loud by the same crawlers and readers as the
  // rest. It was the last string on /enterprise/fleets living in the route
  // file, in English for all four locales.
  const OG_ALT_PAGES: { path: string; key: string }[] = [
    { path: "", key: "Metadata.homeOgImageAlt" },
    { path: "/enterprise/fleets", key: "SEO_FLEETS.ogImageAlt" },
    { path: "/destinations", key: "SEO_CITY_OS.ogImageAlt" },
    { path: "/purpose", key: "SEO_PURPOSE.ogImageAlt" },
    { path: "/coverage", key: "SEO_COVERAGE.ogImageAlt" },
  ];

  for (const locale of LOCALES) {
    for (const { path: pagePath, key } of OG_ALT_PAGES) {
      test(`CLAUDE.md §8: /${locale}${pagePath} serves og:image:alt from i18n`, async ({
        page,
      }) => {
        const expected = flatMessages(locale).get(key);
        expect(expected, `${key} is missing in ${locale}.json`).toBeTruthy();

        await page.goto(localeUrl(locale, pagePath));
        const alt = await page
          .locator('meta[property="og:image:alt"]')
          .first()
          .getAttribute("content");
        expect(alt).toBe(expected);
      });
    }
  }
});

/* ---------------------------------------------------------------------------
 * The family scan.
 *
 * This is the half of the spec that is not about anything already written. It
 * reads every published string against the five classes above, so that the next
 * sentence of a decided class is red the day it is typed — which is the only
 * way the sixth sweep does not happen.
 * ------------------------------------------------------------------------- */
test.describe("Claim families — a decided class does not come back in new words", () => {
  for (const family of CLAIM_FAMILIES) {
    for (const locale of LOCALES) {
      test(`family "${family.id}" is absent from ${locale}.json`, () => {
        const offenders: string[] = [];
        for (const [key, value] of flatMessages(locale)) {
          if (isWaived(family, key)) continue;
          for (const hit of familyHits(family, value)) {
            offenders.push(`${key} — "${hit}" in "${value}"`);
          }
        }
        expect(offenders, family.rule).toEqual([]);
      });
    }

    // The same patterns against what the partner and trust-center pages
    // actually serve, which is where a claim hard-coded in a component shows up
    // — those never reach src/messages and so never reach the scan above.
    for (const locale of LOCALES) {
      for (const { path: pagePath } of RENDERED_PAGES) {
        test(`family "${family.id}" is absent from what /${locale}${pagePath} serves`, async ({
          page,
        }) => {
          const response = await page.goto(localeUrl(locale, pagePath));
          expect(response?.status()).toBe(200);

          let text = await publishedText(page);
          // Subtract the survivors this family already waived by key, so the
          // reason lives in one place instead of being repeated per page.
          for (const waived of waivedStrings(family)) {
            if (waived.length > 3) text = text.split(waived).join(" ");
          }
          expect(familyHits(family, text), family.rule).toEqual([]);
        });
      }
    }

    test(`family "${family.id}" is absent from /llms.txt`, async ({ request }) => {
      const response = await request.get("/llms.txt");
      expect(response.status()).toBe(200);
      expect(familyHits(family, await response.text()), family.rule).toEqual([]);
    });
  }

  // A waiver with no reason is how a family scan turns into a formality: the
  // next person silences a red test by adding a key and moves on. The reason is
  // the part that has to be written, so it is the part that is checked.
  test("every waiver carries a reason, and every waived key still exists", () => {
    const known = new Set(flatMessages("pt").keys());
    for (const family of CLAIM_FAMILIES) {
      for (const waiver of family.waivers) {
        expect(waiver.why.trim().length, `${family.id}: waiver with no reason`)
          .toBeGreaterThan(40);
        for (const key of waiver.keys) {
          const exists = known.has(key) || [...known].some((k) => k.startsWith(`${key}.`));
          expect(exists, `${family.id}: waiver for "${key}", which no longer exists`).toBe(true);
        }
      }
    }
  });
});
