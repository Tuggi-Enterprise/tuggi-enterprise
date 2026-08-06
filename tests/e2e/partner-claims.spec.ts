import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * BR-B2B-007 — "O que a oferta publicada ao parceiro pode afirmar".
 * BR-B2B-004 — "O parceiro distribui; quem paga é o usuário final".
 * BR-B2B-009 — "A venda de pacote ao parceiro existe como possibilidade e
 *               não se divulga".
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
 * absolute and no vigent rule backs it. It stays, for now, in the ~30
 * consumer strings of src/messages (Drive, Tours, FAQ, trust center) and in
 * FatFooter.tsx, whose tagline — "The Cultural Copilot for Drivers. 100%
 * Hands-Free Contextual Routing." — is a separate card with new copy in four
 * languages (issue #147). FATFOOTER_EXCEPTION and stripFooter() below exist
 * only for that; both come out when that card lands, and then this claim
 * moves to "everywhere".
 *
 * src/data/ is excluded from the source scan: those are generated route and
 * coverage snapshots (`npm run update-routes`), not copy, and their POI ids
 * collide with the bare numbers below.
 */

type Scope = "everywhere" | "partner" | "code";

interface ForbiddenClaim {
  /** What was removed, as the operator listed it. */
  claim: string;
  /** The literal strings, in every language the claim was published in. */
  terms: string[];
  scope: Scope;
  /** Source files this claim is knowingly still allowed in, with the reason. */
  except?: string[];
}

/**
 * The one file allowed to keep "100% Hands-Free": the footer tagline, whose
 * replacement needs new copy in four languages and has its own issue (#147).
 * Delete this constant when that card lands — it is not a general waiver.
 */
const FATFOOTER_EXCEPTION = "src/components/global/FatFooter.tsx";

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
    except: [FATFOOTER_EXCEPTION],
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

const PARTNER_PAGES = ["/enterprise/fleets", "/enterprise/city-os", "/technology"];

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

/** Only the partner namespaces of each message file, as one haystack per locale. */
function partnerMessages(): Haystack[] {
  return LOCALES.map((locale) => {
    const file = path.join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
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

function findHits(haystacks: Haystack[], terms: string[], except: string[] = []): string[] {
  const hits: string[] = [];
  for (const { label, text } of haystacks) {
    if (except.includes(label)) continue;
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
 * nothing about what this page claims. The footer is dropped for the same
 * reason it is waived in the source scan — FATFOOTER_EXCEPTION.
 */
async function publishedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelectorAll("footer, script, template, noscript").forEach((node) => node.remove());

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

  for (const { claim, terms, except } of everywhere) {
    test(`BR-B2B-007: "${claim}" is gone from src/`, () => {
      expect(findHits(allSourceFiles(), terms, except)).toEqual([]);
    });
  }

  for (const { claim, terms, except } of partnerOnly) {
    test(`BR-B2B-007: "${claim}" is gone from the partner surfaces`, () => {
      expect(findHits(partnerSourceFiles(), terms, except)).toEqual([]);
    });
  }

  for (const { claim, terms, except } of codeOnly) {
    test(`BR-B2B-007: "${claim}" is gone from components, routes and partner messages`, () => {
      expect(findHits(codeSourceFiles(), terms, except)).toEqual([]);
    });
  }

  // A waiver that outlives its reason silences the guard it belongs to. This
  // one fails the day issue #147 replaces the footer tagline, which is the
  // day FATFOOTER_EXCEPTION, stripFooter() and the "code" scope come out.
  test("BR-B2B-007: the FatFooter waiver still has a reason to exist", () => {
    const footer = fs.readFileSync(path.join(REPO_ROOT, FATFOOTER_EXCEPTION), "utf8");
    expect(footer, "the tagline is gone — drop the exception").toContain(
      "100% Hands-Free Contextual Routing",
    );
  });

  for (const locale of LOCALES) {
    for (const { path: pagePath, scopes } of RENDERED_PAGES) {
      test(`BR-B2B-007: /${locale}${pagePath} renders and serves no forbidden claim`, async ({
        page,
      }) => {
        const response = await page.goto(`/${locale}${pagePath}`);
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

  test("BR-B2B-007: the fleets NPS section shows no star rating", () => {
    const blocks = path.join(SRC, "components/blocks");
    for (const name of fs.readdirSync(blocks).filter((f) => f.startsWith("Fleets"))) {
      const source = fs.readFileSync(path.join(blocks, name), "utf8");
      expect(source, `${name} renders stars`).not.toMatch(/\bStar\b/);
    }
  });
});
