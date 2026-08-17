import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * BR-COMUNICACAO-004 items 1, 3 and 4 — the closed non-objective list
 * (routing/"navigation" as what Tuggi delivers, and an undeclared second
 * product name), swept where item 3 says the three original findings actually
 * were: **inside a component**, not just inside `src/messages/*.json`.
 *
 * ---------------------------------------------------------------------------
 * Why a component sweep, and not only the message files
 * ---------------------------------------------------------------------------
 *
 * Half of this cycle's findings (#192, #190) were English, fixed in the JSX,
 * never in i18n at all — "B2B2C API Platform", "Audio-First Navigation",
 * "Accessibility OS". A sweep of `src/messages/*.json` is structurally blind
 * to that class: the string was never there to find. `tests/e2e/
 * accessibility-claim.spec.ts` already guards one navigation claim
 * (`CityOS.Accessibility.desc`) and says so in its own comment — "scoped to
 * this one key, and that scope is the finding". This file is the
 * generalization: every message string, in every locale, plus every literal
 * JSX text node, attribute and expression value under `src/`, using the same
 * TypeScript-compiler scan `no-hardcoded-copy.spec.ts` already runs for
 * DS-COPY-001 (a regex cannot tell `className` from copy; the compiler can).
 *
 * ---------------------------------------------------------------------------
 * The ruler for item 1, and the false positive it may not fire on
 * ---------------------------------------------------------------------------
 *
 * "Navegação" is not banned outright — BR-MAPA-005 item 3 requires the site to
 * *say* Tuggi runs alongside the visitor's navigation app, in every language.
 * The five sentences that do that today are quoted in `CONVIVENCIA` below,
 * matched by the same clause shape the copy already uses: a negation
 * ("não é um app de navegação", "isn't a navigation app") or a coexistence verb
 * ("roda junto", "runs alongside", "funziona insieme"). What item 1 forbids is
 * the word describing what **Tuggi itself provides** — a feature titled
 * "Navigation", a sentence with no negation and no coexistence verb in it. A
 * routing word with neither marker nearby is the violation; `Header.breadcrumb`
 * ("Trilha de navegação") is the one true non-match, because it names a UI
 * element (a breadcrumb trail), not a capability, and is excluded by name.
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
 * Item 1 — routing as what Tuggi provides
 * ------------------------------------------------------------------------- */

/** Routing/navigation, the four languages (matches accessibility-claim.spec.ts's ROUTING_WORDS). */
const ROUTING_WORD = /\bnavega\w*|\bnavigat\w*|\bnavigazion\w*|turn-?by-?turn/i;

/** The coexistence clause BR-MAPA-005 item 3 requires — a negation or a "runs alongside" verb. */
const CONVIVENCIA: RegExp[] = [
  /n[ãa]o\s+(?:é|e)\s+(?:um\s+)?app(?:licativo)?\s+de\s+navega/i,
  /n[ãa]o\s+substitu\w*/i,
  /roda\s+junto/i,
  /funciona\s+junto/i,
  /isn'?t\s+a\s+navigation\s+app/i,
  /is\s+not\s+a\s+navigation\s+app/i,
  /does(?:n'?t|\s+not)\s+replace/i,
  /runs\s+alongside/i,
  /no\s+es\s+(?:una\s+)?app\s+de\s+navegaci[oó]n/i,
  /no\s+sustituye/i,
  /funciona\s+junto\s+a/i,
  /non\s+[eè]\s+un'?app\s+di\s+navigazione/i,
  /non\s+sostituisce/i,
  /funziona\s+(?:insieme|al\s+(?:suo\s+)?fianco)/i,
];

/** Header.breadcrumb ("Trilha de navegação") names a UI element, not a capability — BR-COMUNICACAO-004 does not reach it. */
const BREADCRUMB = /trilha\s+de\s+navega|percorso\s+di\s+navigazione|ruta\s+de\s+navegaci[oó]n/i;

/**
 * A third sense the word carries in this codebase, next to "routing" and
 * "breadcrumb": **interface** navigation — moving through the site's own UI
 * with a keyboard or a screen reader. `Legal.Accessibility.s1Item2` opens with
 * "Navigation:" as a heading and describes VoiceOver/TalkBack compatibility,
 * and `GlobalHeader.tsx`'s `aria-label="Main Navigation"` / `"Mobile
 * Navigation"` name the `<nav>` landmark by the term screen readers expect
 * (and are the exact strings `tests/e2e/routing.spec.ts` locates by, per
 * `no-hardcoded-copy.spec.ts`'s own `PENDING_NAV_LOCATOR` waiver). Neither
 * claims Tuggi routes a trip; both are excluded by the same marker that
 * accompanies interface navigation and never accompanies a routing claim.
 */
const UI_NAVIGATION: RegExp[] = [
  /\bmain\s+navigation\b/i,
  /\bmobile\s+navigation\b/i,
  /voiceover|talkback|screen\s*readers?|leitor(?:es)?\s+de\s+tela|lector(?:es)?\s+de\s+pantalla|lettori?\s+di\s+schermo/i,
];

/**
 * A fourth sense, and the only one that is a **different word** rather than a
 * different claim: `navegador` is Portuguese and Spanish for *web browser*, and
 * the `\bnavega\w*` prefix above reaches it. `Legal.Privacy.s1Item7` declares
 * the user-agent kept in the contract acceptance trail (BR-USUARIO-031 item 1)
 * — "a identificação que o navegador declara" — which is a personal-data
 * declaration, not a claim that Tuggi routes anybody anywhere.
 *
 * Removed from the text before matching, instead of excluding the whole string
 * the way the three senses above do. An exclusion returns `null` for the
 * entire value, so a sentence that named a browser *and* claimed routing would
 * stop being read at all; deleting the browser noun leaves every other routing
 * word in the same string still matchable.
 */
const BROWSER_NOUN = /\bnavegador(?:es)?\b/gi;

function routingOffense(value: string): string | null {
  const text = value.replace(BROWSER_NOUN, "");
  const hit = text.match(ROUTING_WORD);
  if (!hit) return null;
  if (BREADCRUMB.test(text)) return null;
  if (UI_NAVIGATION.some((pattern) => pattern.test(text))) return null;
  if (CONVIVENCIA.some((pattern) => pattern.test(text))) return null;
  return hit[0];
}

/* ---------------------------------------------------------------------------
 * Item 4 — an undeclared second product name
 * ------------------------------------------------------------------------- */

/** 1–3 Capitalized words ending in a product-suffix word — the shape "Accessibility OS" and "B2B2C API Platform" both had. */
const PRODUCT_NAME_SHAPE = /\b(?:[A-Z][a-zA-Z0-9]*\s+){1,3}(?:OS|Platform|Engine|Suite|Hub|Studio)\b/g;

/**
 * Published with a decision behind it (BR-COMUNICACAO-004 edge case "nome já
 * publicado não sai do ar"). The bare forms matter as much as the prefixed
 * one: a CTA button ("Request City OS") or a privacy-policy clause naming the
 * product it is about does not re-state "TUGGI" every time, and item 4 is
 * about a *second* name existing at all, not about which sentence spells the
 * brand out.
 */
const DECLARED_PRODUCT_NAMES = new Set([
  "TUGGI City OS",
  "Tuggi City OS",
  "City OS",
  "CITY OS",
]);

function productNameOffenses(text: string): string[] {
  return [...text.matchAll(PRODUCT_NAME_SHAPE)]
    .map((m) => m[0].trim())
    // A match containing a declared name — "Request City OS", "O TUGGI City OS" — is that
    // declared product named from inside a longer sentence, not a second, undeclared one.
    .filter((name) => ![...DECLARED_PRODUCT_NAMES].some((declared) => name.includes(declared)));
}

/* ---------------------------------------------------------------------------
 * Reading src/messages
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

test.describe("BR-COMUNICACAO-004 item 1 — src/messages/*.json: no routing word without its coexistence clause", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-004 item 1: ${locale}.json — every "navegação"/"navigation" carries a coexistence clause`, () => {
      const offenders: string[] = [];
      for (const [key, value] of flatMessages(locale)) {
        const hit = routingOffense(value);
        if (hit) offenders.push(`${key} — "${hit}" in "${value}"`);
      }
      expect(
        offenders,
        "BR-MAPA-005: Tuggi does not route — Google Maps, Waze and Apple Maps are partners, not " +
          'competitors. A routing word needs a negation ("não é um app de navegação") or a ' +
          'coexistence verb ("roda junto", "runs alongside") in the same string, or it reads as a ' +
          "capability Tuggi itself provides.",
      ).toEqual([]);
    });
  }

  test("BR-COMUNICACAO-004 item 4: no message string names an undeclared second product", () => {
    const offenders: string[] = [];
    for (const locale of LOCALES) {
      for (const [key, value] of flatMessages(locale)) {
        for (const name of productNameOffenses(value)) offenders.push(`${locale}:${key} — "${name}"`);
      }
    }
    expect(
      offenders,
      "A second product name next to TUGGI needs a decision registered as a BR-* rule (item 4), not " +
        "a label typed into copy. TUGGI City OS is the one name already decided and it is allowlisted.",
    ).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * The component sweep — item 3's own point: mock and screenshot text is copy
 * ------------------------------------------------------------------------- */

/** Literal string content reachable from `src/`, minus messages and generated data — mirrors no-hardcoded-copy.spec.ts's scan, duplicated rather than imported (that file is a 1,500-line guard another agent writes against). */
function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

const CODE_TAGS = new Set(["pre", "code"]);

function jsxTagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}

function literalValues(node: ts.Expression): ts.StringLiteralLike[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node];
  if (ts.isParenthesizedExpression(node)) return literalValues(node.expression);
  if (ts.isConditionalExpression(node)) {
    return [...literalValues(node.whenTrue), ...literalValues(node.whenFalse)];
  }
  if (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    return [...literalValues(node.left), ...literalValues(node.right)];
  }
  return [];
}

type Literal = { file: string; line: number; text: string };

function scanLiterals(): Literal[] {
  const found: Literal[] = [];

  for (const file of tsxFiles(SRC)) {
    const label = path.relative(SRC, file);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const push = (node: ts.Node, raw: string) => {
      const text = raw.replace(/\s+/g, " ").trim();
      if (!text) return;
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      found.push({ file: label, line: line + 1, text });
    };

    const visit = (node: ts.Node) => {
      const tag = jsxTagName(node);
      if (tag && CODE_TAGS.has(tag)) return;

      if (ts.isJsxText(node)) push(node, node.text);
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        push(node, node.initializer.text);
      }
      if (
        ts.isJsxExpression(node) &&
        node.expression &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
      ) {
        for (const literal of literalValues(node.expression)) push(literal, literal.text);
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return found;
}

test.describe("BR-COMUNICACAO-004 item 3 — mock and component text is copy too", () => {
  test("BR-COMUNICACAO-004 item 1: no literal in src/components or src/app reads as routing Tuggi delivers", () => {
    const offenders = scanLiterals()
      .filter((lit) => !lit.file.startsWith(path.join("messages")))
      .map((lit) => ({ ...lit, hit: routingOffense(lit.text) }))
      .filter((lit) => lit.hit)
      .map((lit) => `${lit.file}:${lit.line} — "${lit.hit}" in "${lit.text}"`);

    expect(
      offenders,
      'The three original findings ("B2B2C API Platform", "Audio-First Navigation", ' +
        '"Accessibility OS") were English, hardcoded in JSX, invisible to a scan of ' +
        "src/messages/*.json (#192, #190). This is the scan that would have caught them: every " +
        "literal string a browser can render, not just the ones already in i18n.",
    ).toEqual([]);
  });

  test("BR-COMUNICACAO-004 item 4: no literal in src/components or src/app names an undeclared second product", () => {
    const offenders = scanLiterals().flatMap((lit) =>
      productNameOffenses(lit.text).map((name) => `${lit.file}:${lit.line} — "${name}"`),
    );
    expect(offenders).toEqual([]);
  });

  test("BR-COMUNICACAO-004 item 1: the coexistence sentences survive the sweep (positive control)", () => {
    // Without this, a ruler that over-matches (bans the word outright) would
    // pass by deleting BR-MAPA-005 item 3's required sentences instead of
    // leaving them alone — the false positive this file's own comment warns
    // against.
    for (const locale of LOCALES) {
      const messages = flatMessages(locale);
      const survivors = [...messages.values()].filter((v) => ROUTING_WORD.test(v));
      expect(survivors.length, `${locale}.json: no coexistence sentence found to protect`).toBeGreaterThan(0);
      for (const value of survivors) {
        expect(routingOffense(value), `${locale}.json wrongly flags: "${value}"`).toBeNull();
      }
    }
  });
});
