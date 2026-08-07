import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { getCoverageData } from "../../src/lib/coverage";
import {
  CONTENT_LANGUAGES,
  CMS_CONTENT_LANGUAGES,
  SITE_INTERFACE_LANGUAGES,
  OPERATING_SINCE,
  COVERAGE_COUNTRIES,
  MAPPED_POINT_MILLIONS,
  COVERAGE_REGIONS_FLOOR,
  STORIES_PLAYED,
  DECIDED_FACTS,
  PRODUCT_FACTS,
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
 * **3. The decisions.** Three figures were `null` in the module while the
 * operator had not chosen them; all three closed (2026-08-06 and 2026-08-07).
 * Two got a value — the archive floor and the country count, BR-COMUNICACAO-002
 * items 8 and 9 — and one was decided *not to be published*, which is why
 * `STORIES_PLAYED` is still null (BR-COMUNICACAO-003 item 5). The decided half
 * holds both directions at once: while a value is null nothing may publish it,
 * and while it is not null the copy has to read it from the module in all four
 * languages or this suite goes red. That is what a `TODO` could not do — the
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
 * 3. The archive and coverage figures, and the snapshot they are not
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-002 items 8 and 9 — the two figures the rule decided", () => {
  test("BR-COMUNICACAO-002 item 8: the archive floor is the million, and production still carries it", async () => {
    const data = await getCoverageData();

    // The published figure is not read off the snapshot anymore — item 5,
    // and the borda that takes both country figures off it as well. What the
    // snapshot is still asked is the one question it can answer honestly:
    // does the data contradict the floor? The archive shrank 48,120 rows in
    // 24 days, so a floor of thousands would depend on the snapshot's age;
    // at the million, 2,090,916 and 2,042,796 publish the same sentence.
    expect(
      Math.floor(data.totalActive / 1_000_000),
      "The snapshot no longer supports the published floor. Re-measure in " +
        "production, move MAPPED_POINT_MILLIONS and BR-COMUNICACAO-002 item 8 " +
        "together — the constant does not move on its own.",
    ).toBeGreaterThanOrEqual(MAPPED_POINT_MILLIONS);

    // Four languages spell the scale word out in the plural ("2 milhões",
    // "2 million"). A value of one needs the singular written first; this is
    // the guarantee the copy makes, so it is the one asserted here.
    expect(MAPPED_POINT_MILLIONS).toBeGreaterThanOrEqual(2);
  });

  test("BR-COMUNICACAO-002 item 9: coverage is the measured country count, never the map's threshold", async () => {
    const data = await getCoverageData();

    // 48 sovereign countries with at least one published POI, measured on
    // 2026-08-06. Not 58 — a dependent territory is not a country — and not
    // 14, which is the only country figure that may carry a content noun.
    expect(COVERAGE_COUNTRIES).toBe(48);

    // The 39 that was on the site is `STATE_MIN_COUNT = 50` seen sideways: a
    // map rendering threshold read as a coverage criterion. Anyone who wires
    // a page back to the snapshot's country count republishes it, and this is
    // what says so.
    expect(
      COVERAGE_COUNTRIES,
      "The published country count went back to the snapshot's, which counts " +
        "the regions the map draws (STATE_MIN_COUNT = 50), not the countries " +
        "the product is live in.",
    ).not.toBe(data.totalActiveCountries);
  });

  test("BR-COMUNICACAO-002 item 10: the region floor is below the measurement, and never the map's threshold", async () => {
    const data = await getCoverageData();

    // 927 regions measured in production on 2026-08-06 (core.attractions,
    // approved, entity_kind = 'poi', non-empty state) —
    // docs/dev/medicao-constantes-site-2026-08.md §2. A floor that is not
    // strictly below the measurement is not a floor.
    expect(COVERAGE_REGIONS_FLOOR).toBeLessThan(927);
    expect(COVERAGE_REGIONS_FLOOR).toBeGreaterThanOrEqual(900);

    // 980 (`data.totalActiveRegions`) is `states.length` after
    // `STATE_MIN_COUNT = 50` — the map's rendering threshold, counted after
    // the map applies it. Publishing it as coverage is the same mistake item
    // 9 already closed for country, aimed at region instead.
    expect(
      COVERAGE_REGIONS_FLOOR,
      "The published region floor went back to the snapshot's post-threshold " +
        "count, which is what the map draws, not what item 10 measured.",
    ).not.toBe(data.totalActiveRegions);
  });
});

/* ---------------------------------------------------------------------------
 * 4. The decisions, and the copy that has to follow them
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-002 / BR-COMUNICACAO-003 — a decision and its copy move together", () => {
  test("BR-COMUNICACAO-003 item 5: no usage figure is interpolable, decided or not", () => {
    // STORIES_PLAYED is null *by decision*, not for want of a measurement:
    // the operator closed it on 2026-08-07 — "esse é um numero de venda e nao
    // real". Item 6 is the only door back, and it opens with a number from
    // the store consoles that no agent may measure or estimate.
    expect(STORIES_PLAYED).toBeNull();

    const leaked = DECIDED_FACTS.filter(
      (fact) => fact.value === null && fact.placeholder in PRODUCT_FACTS,
    ).map((fact) => fact.name);
    expect(
      leaked,
      "A null fact in PRODUCT_FACTS would render as an empty slot instead of " +
        "failing, which is the placeholder the design spec §0 forbids.",
    ).toEqual([]);
  });

  for (const fact of DECIDED_FACTS) {
    test(`${fact.name}: the decision and the copy that publishes it move together (${fact.rule})`, () => {
      const users: string[] = [];
      for (const locale of LOCALES) {
        for (const [key, value] of flatMessages(locale)) {
          if (placeholdersIn(value).includes(fact.placeholder)) {
            users.push(`${locale}:${key}`);
          }
        }
      }

      if (fact.value === null) {
        // Decided not to be published. A sentence that interpolates it would
        // render an unresolved placeholder to a visitor, and re-adding one is
        // how the figure comes back through the side door.
        expect(
          users,
          `${fact.name} is null by decision (${fact.rule}). Copy cannot ` +
            "publish it, and no rounding or smaller invention replaces it.",
        ).toEqual([]);
      } else {
        // This is the half a TODO never had: setting the value is not the end
        // of the job, and the suite says so until the sentence reads it from
        // the module in every language.
        expect(
          users,
          `${fact.name} has a value (${fact.rule}) and no message string ` +
            `interpolates {${fact.placeholder}}. Wire the copy in all four ` +
            "languages — a decided figure that no page publishes is the " +
            "figure being forgotten a second time.",
        ).not.toEqual([]);
        expect(
          new Set(users.map((u) => u.split(":")[0])).size,
          `{${fact.placeholder}} is missing from at least one locale. A ` +
            "figure published in three languages and hardcoded in the fourth " +
            "is exactly how pt and es came to disagree with en and it.",
        ).toBe(LOCALES.length);
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
 * Every string the module feeds is in this map, or in NOT_MOUNTED_YET below —
 * and until now that was a claim in a comment rather than a check. It is a
 * check as of #193: the exhaustiveness test at the end of this section walks
 * every message that interpolates a module value and demands one of the two.
 * The exception it replaces was `Drive.Behavior.step1Desc`, fed by a component
 * nothing imported, so the sentence reached no page; the component and its
 * message block went with #196.
 */
const PUBLISHED_ON: Record<string, string[]> = {
  "/": [
    "Home.Hero.trustLine",
    "Home.Showcase.feat6Body",
    "Home.Context.p3",
    "Home.FAQ.a1",
    "Home.FAQ.a5",
    "Home.Coverage.title",
    "Metadata.rootDescription",
  ],
  "/coverage": [
    "Coverage.Hero.subtitle",
    "SEO_COVERAGE.description",
    "SEO_COVERAGE.ogTitle",
  ],
  "/drive": [
    "Drive.Features.feat3Desc",
    "Drive.Pricing.pass2Feat3",
    "Drive.FAQ.a4",
    "Drive.Comparison.langTuggi",
    "Drive.PlansExplainer.p3",
  ],
  "/download": ["Download.metaDesc"],
  "/trust-center/accessibility": [
    "Legal.Accessibility.s1Item1",
    "Legal.Accessibility.s2Item3",
  ],
};

/**
 * Message keys whose component exists and is not on a route yet, with the card
 * that mounts it.
 *
 * A component delivered before it is placed is the ordinary shape of this
 * repo's work — the spec is one card and the reordering is another — and the
 * honest way to carry it is a named, dated exception rather than a silent hole
 * in the map above. The entry dies when the card lands: the moment the block
 * renders, the rendered half below is where its sentences have to appear.
 */
const NOT_MOUNTED_YET: Record<string, string> = {
  Proof:
    "ProofBlock (card #193, component 4.2) is built and deliberately not " +
    "placed: the home reordering is #194. When #194 mounts it, Proof.points, " +
    "Proof.guides and Proof.since move into PUBLISHED_ON under '/'.",
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

/**
 * The sentence as a visitor should read it: markup stripped, values filled.
 *
 * Two ICU shapes, because the module carries two kinds of figure. A bare
 * `{name}` is rendered by formatjs as `String(value)` — which is why "2
 * milhões" is spelled out around a `2` and never around a formatted number.
 * `{name, number}` is the locale's own formatting, and the four-digit figures
 * need it: 16,000 in en, 16.000 in pt, and a bare slot there would publish
 * "16000" in every language.
 */
function resolved(message: string, locale: string): string {
  let out = message.replace(/<[^>]+>/g, "");
  for (const [name, value] of Object.entries(PRODUCT_FACTS)) {
    out = out.replaceAll(`{${name}}`, String(value));
    if (typeof value === "number") {
      out = out.replace(
        new RegExp(`\\{\\s*${name}\\s*,\\s*number\\s*\\}`, "g"),
        value.toLocaleString(locale),
      );
    }
  }
  return out;
}

test.describe("DS-COPY-005 — the figure reaches the page, in every language", () => {
  // The map above is only worth what its coverage is. A sentence that reads a
  // module value and appears in neither list is a figure nobody checks the
  // rendering of — which is how `Drive.Behavior.step1Desc` published to no one
  // for months.
  test("DS-COPY-005: every sentence fed by the module is placed, or named as not placed", () => {
    const placed = new Set(Object.values(PUBLISHED_ON).flat());
    const names = Object.keys(PRODUCT_FACTS);
    const unaccounted: string[] = [];

    for (const [key, value] of flatMessages("pt")) {
      if (!placeholdersIn(value).some((name) => names.includes(name))) continue;
      if (placed.has(key)) continue;
      if (NOT_MOUNTED_YET[key.split(".")[0]]) continue;
      unaccounted.push(key);
    }

    expect(
      unaccounted,
      "These sentences interpolate a product figure and no page claims them. " +
        "Either add the key to PUBLISHED_ON under the route that serves it, or " +
        "add its namespace to NOT_MOUNTED_YET with the card that will mount it.",
    ).toEqual([]);
  });

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
            resolved(message!, locale),
          );
        }

        // An unresolved ICU slot survives as braces in the served text. Every
        // name the module publishes is checked, not just the first one that
        // ever leaked.
        for (const name of Object.keys(PRODUCT_FACTS)) {
          expect(served).not.toContain(`{${name}`);
        }
        for (const key of keys) expect(served).not.toContain(key);
      });
    }
  }
});

/* ---------------------------------------------------------------------------
 * 6. The coverage stat cards, which publish a number with no sentence
 * ------------------------------------------------------------------------- */

/**
 * The three cards at the top of /coverage are the one place a figure reaches a
 * visitor without a sentence around it: the number is markup and the noun is a
 * separate, CSS-uppercased label. Matching them by text is how this guard
 * would rot, so `CoverageHero` marks the values with `data-fact` and this
 * reads those.
 */
test.describe("BR-COMUNICACAO-002 items 8, 9 and 10 — what the coverage page shows without a sentence", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-002 items 8, 9 and 10: /${locale}/coverage publishes the measured country count and the two floors`, async ({
      page,
    }) => {
      const response = await page.goto(localeUrl(locale, "/coverage"));
      expect(response?.status()).toBe(200);

      await expect(page.locator("[data-fact=countries]")).toHaveText(
        COVERAGE_COUNTRIES.toLocaleString(locale),
      );

      // Item 4: the archive number is a floor, and a floor rendered bare reads
      // as an exact count — the "+" is the "mais de".
      await expect(page.locator("[data-fact=points]")).toHaveText(
        `${(MAPPED_POINT_MILLIONS * 1_000_000).toLocaleString(locale)}+`,
      );

      // Item 10: same "+" treatment, and never the exact figure — item 10
      // forbids the exact-with-date escape item 4 would otherwise allow.
      await expect(page.locator("[data-fact=regions]")).toHaveText(
        `${COVERAGE_REGIONS_FLOOR.toLocaleString(locale)}+`,
      );

      // The thresholds that used to be here, named so the next person who
      // wires either card back to the snapshot sees why it fails.
      const data = await getCoverageData();
      await expect(page.locator("[data-fact=countries]")).not.toHaveText(
        data.totalActiveCountries.toLocaleString(locale),
      );
      await expect(page.locator("[data-fact=regions]")).not.toHaveText(
        data.totalActiveRegions.toLocaleString(locale),
      );
    });
  }
});
