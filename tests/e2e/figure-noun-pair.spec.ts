import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * BR-COMUNICACAO-002 item 2 — "É proibido usar o número de pontos com
 * substantivo de conteúdo — história, guia, áudio, narração, roteiro."
 *
 * ---------------------------------------------------------------------------
 * Why this is a pair, and not a list of keys
 * ---------------------------------------------------------------------------
 *
 * The defect this file exists for has already migrated once. `c5f558e` fixed
 * `Coverage.Stats.attractions` and `SEO_COVERAGE.ogTitle`; the same mistake
 * reappeared in `Coverage.Map.tooltipAttractions` and
 * `CountryList.attractionsLabel`, fixed by `e532c50` (#205). A test that names
 * a key proves that key stays fixed and nothing else — it goes green the
 * moment the defect rents a different apartment. What has to be watched is the
 * shape: a figure that counts points, next to a noun that means content.
 *
 * Two shapes carry that pair in this codebase, and they need two different
 * nets:
 *
 * **1. Inside one string.** `"Mais de {mappedPointMillions} milhões de
 * histórias"` — the figure and the noun are typed next to each other, either
 * as a literal digit or as an ICU placeholder. `looseFigure()` below is an
 * adjacency test, not a co-occurrence test: `SEO_COVERAGE.description` states
 * `{coverageCountries} países e {mappedPointMillions} milhões de pontos de
 * interesse` in one clause and `Histórias em áudio tocam automaticamente` in
 * an unrelated one, and the distance between them is what keeps the second
 * clause off this guard — a co-occurrence test would flag every sentence that
 * merely mentions both a count and a story in the same breath.
 *
 * **2. Across two elements.** The actual historical bug: `{hoveredState.
 * activeCount} {t("tooltipAttractions")}` in JSX, where the message string
 * itself carries no digit at all — `t("tooltipAttractions")` resolved to
 * "Histórias Esperando", plain text, and the number arrived at render time
 * from a sibling expression. No string-level sweep sees this; `componentPairs()`
 * below reads the component instead, which is why it is scoped to the exact
 * numeric fields `src/lib/coverage.ts` exposes (`StateCoverage`/`CoverageData`)
 * — the single place any POI count in this codebase is allowed to originate
 * (CLAUDE.md §6, SSOT). A file that renders one of those fields as JSX text
 * *and* resolves a translation key to one of the five nouns, anywhere in the
 * same file, is the shape of the bug regardless of which key or which variable
 * name either side uses next time.
 *
 * The one figure allowed next to these nouns is the audio-guide count —
 * `AUDIO_GUIDES_FLOOR` / `{audioGuidesFloor}` — because it counts guides, not
 * points. It is excluded by construction: `ANY_FIGURE` below does not include
 * that placeholder, and it is not a `StateCoverage`/`CoverageData` field.
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
 * 1. Inside one string — the ruler
 * ------------------------------------------------------------------------- */

/**
 * Two figures, two rulers — deliberately not one regex over "any digit".
 *
 * **The placeholder ruler.** `{mappedPointMillions}` / `{coverageCountries}`
 * next to a content noun is unambiguous: these two names *are* POI counts,
 * declared once in `product-facts.ts`, and no legitimate sentence interpolates
 * either next to história/guia/áudio/narração/roteiro. A raw-digit ruler this
 * precise does not exist — "100" next to "audio" is `Drive.Pricing.pass1Feat1`
 * ("mapas e audio 100% sin conexión", a percentage, not a count) and "7" next
 * to "audio." is `Metadata.driveDescription` ("unlimited audio. One-time
 * 7-day passes", a trial window two sentences over — `monetizacao.md`'s
 * figure, not this rule's). A blind digit sweep flags both; this file does not
 * repeat that mistake.
 *
 * **The raw-digit ruler, narrowed.** `tests/e2e/product-facts.spec.ts`
 * already sweeps every literal digit next to história/story/storia/racconti
 * and against áudio-guia/audio-guide/narra* (its `COUNTED_NOUNS`) — a second
 * sweep of the same pair would be CLAUDE.md §6's "segunda implementação da
 * mesma decisão". What that sweep does not cover is **guia standalone** (not
 * the áudio-guia compound) and **roteiro/itinerary** — item 2's own list has
 * five nouns, that file's has three. `RAW_DIGIT_NOUN` below is exactly the
 * two-noun gap, so this file adds coverage instead of duplicating it.
 */
const POI_PLACEHOLDER = "\\{\\s*(?:mappedPointMillions|coverageCountries)\\s*(?:,[^}]*)?\\}";
const RAW_FIGURE = "\\d{1,3}(?:[.,\u00a0\u202f ]\\d{3})*(?:[.,]\\d+)?";
const LEAD = "(?:mais de |más de |over |oltre |più di )?";
const SCALE = "mil |mila |thousand |milh(?:ão|ões) de |millones? de |milioni? di |million ";
const CONNECTOR = "(?:de |di |of )?";

/** BR-COMUNICACAO-002 item 2's closed list, four languages — for the placeholder ruler. */
const NOUN = [
  "hist[oó]rias?",
  "stor(?:y|ies)",
  "storie?",
  "racconti?",
  "gu[ií]as?",
  "guides?",
  "guida",
  "guide",
  "[aá]udios?",
  "audio",
  "narra[cçz]\\w*",
  "narration\\w*",
  "narrazion\\w*",
  "narraci[oó]n(?:es)?",
  "roteiros?",
  "itinerar(?:y|ies)",
  "itinerari(?:os?)?",
].join("|");

/** The two nouns product-facts.spec.ts's own sweep does not already cover — for the raw-digit ruler. */
const RAW_DIGIT_NOUN = ["gu[ií]as?", "guides?", "guida", "guide", "roteiros?", "itinerar(?:y|ies)", "itinerari(?:os?)?"].join(
  "|",
);

function figureThenNoun(figure: string, noun: string): RegExp {
  return new RegExp(`${LEAD}(${figure})\\s*\\+?\\s*(?:${SCALE})?\\s*${CONNECTOR}(?:${noun})\\b`, "i");
}
/**
 * The reverse order — "histórias: 50.000" — a same-clause gap only, so it
 * cannot bridge a full stop, and never a "/" so a URL slug — "tour-guide/615…"
 * in `app-meta.ts`'s Facebook link — never reads as a paired figure.
 */
function nounThenFigure(figure: string, noun: string): RegExp {
  return new RegExp(`\\b(?:${noun})[^\\d{.!?\\n/]{0,12}(${figure})`, "i");
}

const PLACEHOLDER_PAIRS = [figureThenNoun(POI_PLACEHOLDER, NOUN), nounThenFigure(POI_PLACEHOLDER, NOUN)];
const RAW_DIGIT_PAIRS = [
  figureThenNoun(RAW_FIGURE, RAW_DIGIT_NOUN),
  nounThenFigure(RAW_FIGURE, RAW_DIGIT_NOUN),
];

function pairHits(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of [...PLACEHOLDER_PAIRS, ...RAW_DIGIT_PAIRS]) {
    const match = text.match(pattern);
    if (match) hits.push(match[0].trim());
  }
  return hits;
}

/* ---------------------------------------------------------------------------
 * Reading the repository
 * ------------------------------------------------------------------------- */

function messagesFor(locale: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));
}

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

/** Everything under src/, minus the module that owns the figures and the snapshot itself. */
const SWEEP_IGNORE = [path.join(SRC, "data"), path.join(SRC, "messages"), path.join(SRC, "lib/product-facts.ts")];

function sourceFiles(dir = SRC, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SWEEP_IGNORE.includes(full)) continue;
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test.describe("BR-COMUNICACAO-002 item 2 — no POI-derived figure sits next to a content noun, in one string", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-002 item 2: src/messages/${locale}.json pairs no figure with a content noun`, () => {
      const offenders: string[] = [];
      for (const [key, value] of flatMessages(locale)) {
        for (const hit of pairHits(value)) offenders.push(`${key} — "${hit}"`);
      }
      expect(
        offenders,
        "A number that counts points (mappedPointMillions, coverageCountries, or a literal digit) " +
          "reached the same sentence as história/guia/áudio/narração/roteiro. The only figure that " +
          "may sit next to those nouns is {audioGuidesFloor} — it counts guides, not points.",
      ).toEqual([]);
    });
  }

  test("BR-COMUNICACAO-002 item 2: no .ts/.tsx source under src/ pairs one either", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      for (const hit of pairHits(fs.readFileSync(file, "utf8"))) {
        offenders.push(`${path.relative(REPO_ROOT, file)} — "${hit}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * 2. Across two elements — a component that renders both halves
 * ------------------------------------------------------------------------- */

/**
 * The numeric fields `src/lib/coverage.ts` exposes — the only place a POI
 * count can come from in this codebase (SSOT). Matches `SNAPSHOT_NUMERIC_FIELDS`
 * in tests/e2e/snapshot-affirmation-boundary.spec.ts by design: both guards
 * read the same fact about where a POI count is allowed to originate.
 */
const POI_COUNT_FIELDS = new Set([
  "activeCount",
  "comingSoonCount",
  "totalActive",
  "totalActiveRaw",
  "totalComingSoon",
  "totalActiveCountries",
  "totalActiveRegions",
]);

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * `{x}` or `{x.y}` in JSX child position, where the tail name is a POI count
 * field — the exact shape `{hoveredState.activeCount}` and `{stats.totalPOIs}`
 * had. Ternaries and template text are not walked: this is deliberately just
 * "is this value ever shown as text", not a full data-flow analysis.
 */
function renderedCountFields(source: ts.SourceFile): string[] {
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      const expr = node.expression;
      const tail = ts.isPropertyAccessExpression(expr)
        ? expr.name.text
        : ts.isIdentifier(expr)
          ? expr.text
          : null;
      if (tail && POI_COUNT_FIELDS.has(tail)) hits.push(expr.getText());
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...new Set(hits)];
}

/** `const t = useTranslations("Ns")` / `getTranslations("Ns")`, and every `t("key")` it calls. */
function translationCalls(source: ts.SourceFile): { binding: string; namespace: string; key: string }[] {
  const bindings = new Map<string, string>();
  const calls: { binding: string; key: string }[] = [];

  const namespaceOf = (arg: ts.Expression): string | null => {
    if (ts.isStringLiteral(arg)) return arg.text;
    if (ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === "namespace" &&
          ts.isStringLiteral(prop.initializer)
        ) {
          return prop.initializer.text;
        }
      }
    }
    return null;
  };

  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      ["useTranslations", "getTranslations"].includes(node.initializer.expression.text)
    ) {
      const ns = node.initializer.arguments[0] ? namespaceOf(node.initializer.arguments[0]) : "";
      bindings.set(node.name.text, ns ?? "");
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      bindings.has(node.expression.text) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      calls.push({ binding: node.expression.text, key: node.arguments[0].text });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return calls.map(({ binding, key }) => ({ binding, namespace: bindings.get(binding) ?? "", key }));
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function messageAt(locale: string, dottedKey: string): string | undefined {
  return flatMessages(locale).get(dottedKey);
}

test.describe("BR-COMUNICACAO-002 item 2 — no component renders a POI count next to a content-noun label", () => {
  test("the component sweep has files to scan (control)", () => {
    expect(tsxFiles(path.join(SRC, "components")).length).toBeGreaterThan(20);
  });

  for (const file of [...tsxFiles(path.join(SRC, "components")), ...tsxFiles(path.join(SRC, "app"))]) {
    const label = path.relative(SRC, file);
    test(`BR-COMUNICACAO-002 item 2: ${label} — a rendered POI count and a content-noun label never share a file`, () => {
      const source = parse(file);
      const countFields = renderedCountFields(source);
      if (countFields.length === 0) return; // most files render no count at all

      const offenders: string[] = [];
      for (const { namespace, key } of translationCalls(source)) {
        if (!namespace) continue;
        const dottedKey = `${namespace}.${key}`;
        for (const locale of LOCALES) {
          const value = messageAt(locale, dottedKey);
          if (!value) continue;
          const regex = new RegExp(`\\b(?:${NOUN})\\b`, "i");
          if (regex.test(value)) {
            offenders.push(`${dottedKey} (${locale}: "${value}") next to ${countFields.join(", ")}`);
          }
        }
      }

      expect(
        offenders,
        "This file renders a POI count (src/lib/coverage.ts field) as JSX text, and also resolves " +
          "a translation to a content noun (história/guia/áudio/narração/roteiro). That is the exact " +
          "shape of the tooltipAttractions/attractionsLabel bug (#205) — whichever key or variable " +
          "name is involved this time.",
      ).toEqual([]);
    });
  }
});
