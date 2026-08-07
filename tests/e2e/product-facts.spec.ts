import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import {
  CONTENT_LANGUAGES,
  CMS_CONTENT_LANGUAGES,
  SITE_INTERFACE_LANGUAGES,
  OPERATING_SINCE,
  PENDING_FACTS,
  PRODUCT_FACTS,
  activeCountries,
  activePoints,
} from "../../src/lib/product-facts";

/**
 * BR-COMUNICACAO-002 — "Número publicado sobre acervo, cobertura e operação:
 *                       o que ele conta, e quem é o dono".
 * BR-COMUNICACAO-003 — "Prova social de uso: só o que a instrumentação
 *                       sustenta".
 * BR-IDIOMA-001      — "São dois catálogos de idioma, e eles não são a mesma
 *                       lista".
 * DS-COPY-005        — número de produto vem do módulo, e o texto declara de
 *                       qual catálogo ele vem.
 *
 * ---------------------------------------------------------------------------
 * What this file guards, in three parts
 * ---------------------------------------------------------------------------
 *
 * **1. The sweep.** No product figure written by hand, anywhere the site can
 * publish it. It is the part that stops the regression: the language count was
 * spelled out in fifty-six message strings, in the app feature list and in
 * /llms.txt, and the copies had already drifted — pt and es published one
 * figure while en and it published another, for the same sentence. A list of
 * the sentences that were wrong would only catch those sentences; the pattern
 * catches the next one.
 *
 * **2. The wiring.** A number that comes out of the module still has to reach
 * the page. next-intl 4 has no global default values, so each call site passes
 * them, and a call site that forgets renders the message key instead of the
 * sentence — visibly wrong, silently shipped. The rendered half below reads
 * what the server actually serves, in four languages.
 *
 * **3. The pending decisions.** Three figures are `null` in the module because
 * the operator has not chosen them (`_perguntas-abertas.md` 70, 71, 72). The
 * pending half holds both directions at once: while a value is null nothing
 * may publish it, and the day it stops being null the copy has to read it from
 * the module or this suite goes red. That is what a `TODO` could not do — the
 * previous unbacked figure sat next to one for months.
 *
 * ---------------------------------------------------------------------------
 * The ruler, and the false positives it must not fire on
 * ---------------------------------------------------------------------------
 *
 * A "product figure in loose text" is a numeral **immediately attached** to a
 * noun this product counts: languages, countries, points, stories or audio
 * guides, cities, regions, trips, users, downloads — plus an operating year
 * ("desde 2025"). Adjacency is the whole ruler, and it is what keeps these out:
 *
 *   - **Price, plan and trial figures.** "7 ou 30 dias", "24h de áudio
 *     ilimitado". Their owner is `monetizacao.md`, not this module, and
 *     BR-COMUNICACAO-002 says so in "Não se aplica a".
 *   - **Copyright year.** Rendered from `new Date()` in the footer, never a
 *     string.
 *   - **Version and standard numbers.** "WCAG 2.1 AA", "iOS 17".
 *   - **Step ordinals.** "1. Escolha seu Idioma" — a digit and the word
 *     "idioma" in the same string, with a sentence between them.
 *   - **Availability shorthand.** "24/7, em vários idiomas" — same reason.
 *   - **Figures inside a proper noun or a sample narration.** "Miradouro da
 *     Serra, a 847 metros", "um panorama de 360°".
 *
 * The sweep reads comments as well as strings, deliberately: a figure typed
 * into a comment next to the code is exactly how the wrong one gets copied
 * into a sentence later. `src/data` is excluded — generated snapshots, whose
 * POI counts are the source, not a claim.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const MESSAGES_DIR = path.join(SRC, "messages");

const LOCALES = fs
  .readdirSync(MESSAGES_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => path.basename(name, ".json"))
  .sort();

/* ---------------------------------------------------------------------------
 * The ruler
 * ------------------------------------------------------------------------- */

/** Nouns this product counts, in the four languages the site publishes. */
const COUNTED_NOUNS = [
  "idiomas?|languages?|lenguas?|lingue|lingua",
  "pa[ií]s(?:es)?|countr(?:y|ies)|paesi?",
  "pontos?|points?|POIs?|punti|punto",
  "atra[cç][õo]es|atracci[oó]n(?:es)?|attractions?|attrazioni?",
  "hist[oó]rias?|stor(?:y|ies)|storie|racconti?",
  "[aá]udio-?guias?|audio ?guides?|audiogu[ií]as?|audioguide|narra[cçz]\\w*",
  "cidades?|cit(?:y|ies)|ciudades?|citt[àa]",
  "regi[õo]es|regions?|regiones|regioni",
  "viagens?|viajes?|viaggi|trips?",
  "usu[aá]rios?|users?|utenti|viajantes?|travell?ers?|viaggiatori",
  "downloads?|instala[cç][õo]es|installs?",
].join("|");

/** Adjectives that may sit between the numeral and the noun. */
const QUALIFIERS =
  "nativ\\w+|native|narrad\\w+|narrated|mapeados?|mapped|cobert\\w+|covered|" +
  "soberanos?|sovereign|distintos?|distinct|prontas?|ready|guiad\\w+|guided|" +
  "tocad\\w+|played";

/** A figure, with the thousands separators of the four locales. */
const FIGURE = "\\d{1,3}(?:[.,\u00a0\u202f ]\\d{3})*(?:[.,]\\d+)?";

/** A scale word between the figure and the noun: "2 milhões de pontos". */
const SCALE =
  "mil |mila |thousand |milh(?:ão|ões) de |millones? de |milioni? di |million ";

const COUNTED_FIGURE = new RegExp(
  `(?:mais de |más de |over |oltre |più di )?\\b(${FIGURE})\\s*\\+?\\s*` +
    `(?:${SCALE})?(?:(?:${QUALIFIERS})\\s+)?(?:${COUNTED_NOUNS})\\b`,
  "i",
);

/** BR-COMUNICACAO-002 item 6 — the operating date is a product figure too. */
const OPERATING_DATE = /\b(?:desde|since|dal|dall')\s*((?:19|20)\d{2})\b/i;

function looseFigures(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of [COUNTED_FIGURE, OPERATING_DATE]) {
    const match = text.match(pattern);
    if (match) hits.push(match[0]);
  }
  return hits;
}

/* ---------------------------------------------------------------------------
 * Reading the repository
 * ------------------------------------------------------------------------- */

function messagesFor(locale: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));
}

/** Every leaf string of a message file, by dotted key — arrays included. */
function flatMessages(locale: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (node: unknown, prefix: string) => {
    if (typeof node === "string") {
      out.set(prefix, node);
    } else if (Array.isArray(node)) {
      node.forEach((value, i) => walk(value, `${prefix}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        walk(value, prefix ? `${prefix}.${key}` : key);
      }
    }
  };
  walk(messagesFor(locale), "");
  return out;
}

/** The module owns the figures; scanning it would flag its own declarations. */
const SWEEP_IGNORE = [
  path.join(SRC, "data"),
  path.join(SRC, "messages"),
  path.join(SRC, "lib/product-facts.ts"),
];

function sourceFiles(dir = SRC, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SWEEP_IGNORE.includes(full)) continue;
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Every ICU placeholder name used by a message string. */
function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{\s*([A-Za-z][A-Za-z0-9_]*)\s*[,}]/g)].map((m) => m[1]);
}

/* ---------------------------------------------------------------------------
 * 1. The sweep
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-002 / BR-IDIOMA-001 — no product figure in loose text", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-002: src/messages/${locale}.json publishes no figure of its own`, () => {
      const offenders: string[] = [];
      for (const [key, value] of flatMessages(locale)) {
        for (const hit of looseFigures(value)) {
          offenders.push(`${key} — "${hit}"`);
        }
      }
      expect(
        offenders,
        "A product figure belongs in src/lib/product-facts.ts and reaches the " +
          "sentence as an ICU value (DS-COPY-005). If the figure below is a " +
          "price, a trial window or a standard's version, the ruler at the top " +
          "of this file needs the exception written into it — not a waiver here.",
      ).toEqual([]);
    });
  }

  test("BR-COMUNICACAO-002: no component, route or lib constant carries one either", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      for (const hit of looseFigures(fs.readFileSync(file, "utf8"))) {
        offenders.push(`${path.relative(REPO_ROOT, file)} — "${hit}"`);
      }
    }
    // The app feature list in lib/app-meta.ts and the /llms.txt body are the
    // two that were not in i18n at all: structured data and the AI crawler
    // file were publishing the language count on their own.
    expect(offenders).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * 2. The catalogues agree with themselves
 * ------------------------------------------------------------------------- */

test.describe("BR-IDIOMA-001 — the two language catalogues, and only one owner each", () => {
  for (const locale of LOCALES) {
    test(`BR-IDIOMA-001 item 2: ${locale} lists exactly CONTENT_LANGUAGES languages`, () => {
      const messages = messagesFor(locale) as { Languages: { langs: string[] } };
      // The pills a visitor reads are the list behind the number the sentence
      // states. They are two declarations of one fact, so they are checked
      // against each other: adding a pill has to move the sentence with it.
      expect(messages.Languages.langs).toHaveLength(CONTENT_LANGUAGES);
    });
  }

  test("BR-IDIOMA-001 item 3: the site's interface count is the locales it ships", () => {
    expect(SITE_INTERFACE_LANGUAGES).toBe(LOCALES.length);
  });

  test("BR-IDIOMA-001 items 1 and 2: the content catalogue is smaller than the CMS one", () => {
    // Russian and Japanese are held back by an operator decision of
    // 2026-08-05. The gap is the decision; closing it reverts the decision.
    expect(CMS_CONTENT_LANGUAGES - CONTENT_LANGUAGES).toBe(2);
  });

  test("BR-COMUNICACAO-002 item 6: nothing earlier than 2025 is publishable", () => {
    expect(OPERATING_SINCE).toBeGreaterThanOrEqual(2025);
  });
});

/* ---------------------------------------------------------------------------
 * 3. Snapshot figures never travel without their age
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-002 items 4 and 5 — a snapshot figure carries its date", () => {
  test("BR-COMUNICACAO-002: activePoints and activeCountries report when they were measured", async () => {
    const [points, countries] = await Promise.all([activePoints(), activeCountries()]);

    for (const fact of [points, countries]) {
      expect(fact.value).toBeGreaterThan(0);
      // A published figure with no date on it ages in silence — and this one
      // moves in both directions: the archive shrank between two readings.
      expect(Number.isNaN(Date.parse(fact.measuredAt))).toBe(false);
    }

    // Item 4: the published count is a floor, rounded down. One owner for the
    // rounding, which used to be written out three times over one snapshot.
    expect(points.value % 1000).toBe(0);
  });
});

/* ---------------------------------------------------------------------------
 * 4. The pending decisions
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-002 / BR-COMUNICACAO-003 — the figures still waiting on a decision", () => {
  test("no pending figure is interpolable while it has no value", () => {
    const leaked = PENDING_FACTS.filter(
      (fact) => fact.value === null && fact.placeholder in PRODUCT_FACTS,
    ).map((fact) => fact.name);
    expect(
      leaked,
      "A null fact in PRODUCT_FACTS would render as an empty slot instead of " +
        "failing, which is the placeholder the design spec §0 forbids.",
    ).toEqual([]);
  });

  for (const fact of PENDING_FACTS) {
    test(`${fact.name}: question ${fact.question} and the copy that publishes it move together (${fact.rule})`, () => {
      const users: string[] = [];
      for (const locale of LOCALES) {
        for (const [key, value] of flatMessages(locale)) {
          if (placeholdersIn(value).includes(fact.placeholder)) {
            users.push(`${locale}:${key}`);
          }
        }
      }

      if (fact.value === null) {
        // Nothing published: the value does not exist yet, so a sentence that
        // interpolates it would render an unresolved placeholder to a visitor.
        expect(
          users,
          `${fact.name} has no value yet — _perguntas-abertas.md ${fact.question} ` +
            "is open. Copy cannot publish it before the operator chooses it.",
        ).toEqual([]);
      } else {
        // The decision landed. This is the half a TODO never had: the value
        // being set is not the end of the job, and the suite says so until the
        // sentence reads it from the module in every language.
        expect(
          users,
          `${fact.name} now has a value (_perguntas-abertas.md ${fact.question} ` +
            `closed), and no message string interpolates {${fact.placeholder}}. ` +
            "Wire the copy in all four languages, or set it back to null — a " +
            "decided figure that no page publishes is the figure being " +
            "forgotten a second time.",
        ).not.toEqual([]);
        expect(new Set(users.map((u) => u.split(":")[0])).size).toBe(LOCALES.length);
      }
    });
  }
});

/* ---------------------------------------------------------------------------
 * 5. What the server actually serves
 * ------------------------------------------------------------------------- */

/**
 * The sentences the module feeds, and the page each one reaches the visitor on.
 *
 * `Drive.Behavior.step1Desc` is migrated and deliberately absent from this
 * map: nothing imports `DriveBehavior.tsx`, so the string is not published
 * anywhere today. Naming the reason here rather than leaving a silent gap —
 * the orphan component is reported, not deleted by this card.
 */
const PUBLISHED_ON: Record<string, string[]> = {
  "/": [
    "Home.Hero.trustLine",
    "Home.Showcase.feat6Body",
    "Home.Context.p3",
    "Home.FAQ.a1",
    "Home.FAQ.a5",
    "Metadata.rootDescription",
  ],
  "/drive": [
    "Drive.Features.feat3Desc",
    "Drive.Pricing.pass2Feat3",
    "Drive.FAQ.a4",
    "Drive.Comparison.langTuggi",
    "Drive.PlansExplainer.p3",
  ],
  "/download": ["Download.metaDesc"],
  "/trust-center/accessibility": ["Legal.Accessibility.s2Item3"],
};

function localeUrl(locale: string, pagePath: string): string {
  const slug = localizedPathname(locale, pagePath);
  return slug === "/" ? `/${locale}` : `/${locale}${slug}`;
}

/**
 * What the page publishes: its title, its head metadata, its JSON-LD and its
 * visible text.
 *
 * Not `page.content()`. next-intl ships the whole message file down in the RSC
 * payload, so raw HTML still contains every un-interpolated source string and
 * would say nothing about what this page renders. Deliberately a twin of the
 * helper in partner-claims.spec.ts rather than a shared import: pulling it out
 * of that file would edit a 1,500-line guard another agent writes against, for
 * twelve lines.
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

/** The sentence as a visitor should read it: markup stripped, values filled. */
function resolved(message: string): string {
  let out = message.replace(/<[^>]+>/g, "");
  for (const [name, value] of Object.entries(PRODUCT_FACTS)) {
    out = out.replaceAll(`{${name}}`, String(value));
  }
  return out;
}

test.describe("DS-COPY-005 — the figure reaches the page, in every language", () => {
  for (const locale of LOCALES) {
    for (const [pagePath, keys] of Object.entries(PUBLISHED_ON)) {
      test(`DS-COPY-005: /${locale}${pagePath} serves every product figure resolved`, async ({
        page,
      }) => {
        const response = await page.goto(localeUrl(locale, pagePath));
        expect(response?.status()).toBe(200);

        const served = await publishedText(page);
        const messages = flatMessages(locale);

        for (const key of keys) {
          const message = messages.get(key);
          expect(message, `${key} is missing from ${locale}.json`).toBeDefined();

          // The sentence, with the number in it. A call site that forgot to
          // pass the values renders the message key instead, and a placeholder
          // the module does not know stays in the text as braces — both fail
          // here rather than in front of a visitor.
          expect(served, `${key} is not served resolved on /${locale}${pagePath}`).toContain(
            resolved(message!),
          );
        }

        expect(served).not.toContain("{contentLanguages");
        for (const key of keys) expect(served).not.toContain(key);
      });
    }
  }
});
