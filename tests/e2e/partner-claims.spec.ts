import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * BR-B2B-007 — "O que a oferta publicada ao parceiro pode afirmar".
 *
 * The rule closes the list of what partner-facing copy may state as existing
 * (partner brand in the CMS he operates, data scope, QR/fingerprint
 * attribution, revenue share). Everything else is forbidden until a new
 * decision exists, and the claims below were all published on
 * /enterprise/fleets, /enterprise/city-os and /technology until they were
 * removed. This spec is the tripwire: it fails if any of them comes back,
 * in source or in what the server actually renders.
 *
 * Three scopes, because three different kinds of string were removed:
 *
 *   "everywhere" — the wording has no legitimate use anywhere on the site
 *                  (a fabricated dashboard figure, a certification we do not
 *                  hold). Scanned across all of src/.
 *   "partner"    — the same words are true elsewhere and only the partner
 *                  claim was forbidden. "24 hours" is the free trial window
 *                  (BR-MONETIZACAO-013) on consumer pages but a deployment
 *                  SLA on /enterprise/fleets; "99.9%" still lives in the
 *                  traveller-facing trust center, which this removal did not
 *                  cover. Scanned only over the partner surfaces.
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
    claim: "99.9% uptime SLA",
    terms: ["99,9%", "99.9%"],
    scope: "partner",
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
    for (const pagePath of PARTNER_PAGES) {
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
        for (const { claim, terms } of FORBIDDEN_CLAIMS) {
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
