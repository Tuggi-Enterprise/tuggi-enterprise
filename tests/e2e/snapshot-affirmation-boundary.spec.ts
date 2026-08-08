import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * BR-COMUNICACAO-002 item 5, and the edge case "a linha entre afirmação e
 * listagem é esta, e ela é testável".
 *
 * `coverage-snapshot.json` counts by `STATE_MIN_COUNT = 50` — a rendering
 * threshold, not a measurement — and it is frozen at 2026-07-13: 25 days old
 * on the date this file was written, superdeclaring the archive by 244,120
 * points against the 2026-08-06 production measurement (item 9's own
 * "totalActiveRaw" case). It may feed **navigation**: the map, the country
 * list, the region pills of `CoverageDensityMap.tsx`. It may never feed a
 * number presented **as a claim**, and the rule names the claim surfaces by
 * name: "Nenhum data-fact, meta tag, Open Graph ou llms.txt pode ler de
 * coverage-snapshot.json."
 *
 * ---------------------------------------------------------------------------
 * Why this is a source scan, not a rendered-page scan
 * ---------------------------------------------------------------------------
 *
 * The four surfaces the rule names are metadata, not visible copy — an
 * `og:image`, a `<meta>` tag, a `data-fact` element, a text file nobody's
 * browser renders. Reading them off a live page would mean re-parsing HTTP
 * headers and image buffers for four locales; reading the *source* answers
 * the actual question — does this surface's code path ever touch a numeric
 * field of `CoverageData`? — directly, and it is the same technique
 * `no-hardcoded-copy.spec.ts` already uses for the same reason (the TypeScript
 * compiler, not a regex, because `import { getCoverageData } from "..."` and a
 * comment that merely *mentions* coverage look the same to a regex).
 *
 * `generateMetadata` gets a narrower scope than `opengraph-image.tsx`: a
 * `page.tsx` legitimately calls `getCoverageData()` once and feeds the page
 * body's listing with it (`CoverageDensityMap`), so the whole file is not the
 * surface — only the metadata function's own subtree is. An
 * `opengraph-image.tsx` file has no such split: the whole file *is* the
 * affirmation surface, so any numeric field reached anywhere in it counts.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const APP_DIR = path.join(SRC, "app");

/** The numeric fields of `StateCoverage` / `CoverageData` (src/lib/coverage.ts) — everything a snapshot read could turn into a published figure. */
const SNAPSHOT_NUMERIC_FIELDS = new Set([
  "activeCount",
  "comingSoonCount",
  "totalActive",
  "totalActiveRaw",
  "totalComingSoon",
  "totalCountries",
  "totalActiveCountries",
  "totalActiveRegions",
]);

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return /\.(tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** Whether the file imports the snapshot, directly or through its one reader. */
function importsCoverage(source: ts.SourceFile): boolean {
  let found = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      (node.moduleSpecifier.text.includes("lib/coverage") ||
        node.moduleSpecifier.text.includes("coverage-snapshot"))
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** Every property access reading a snapshot numeric field, within `root`. */
function numericFieldAccesses(root: ts.Node, source: ts.SourceFile): string[] {
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) && SNAPSHOT_NUMERIC_FIELDS.has(node.name.text)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      hits.push(`${node.getText()} (line ${line + 1})`);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return [...new Set(hits)];
}

/** The node of a top-level `generateMetadata` export — function or arrow, either binding shape Next.js accepts. */
function generateMetadataNode(source: ts.SourceFile): ts.Node | null {
  let found: ts.Node | null = null;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === "generateMetadata") {
      found = node;
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "generateMetadata" &&
      node.initializer
    ) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/* ---------------------------------------------------------------------------
 * Known, reported exceptions — each one a real finding, not a loophole.
 * ---------------------------------------------------------------------------
 * "não conserte a copy" (card #206): a guard going red on delivered code is a
 * finding to report, not a defect for `qa` to fix. Each entry here is a
 * finding filed as a `dev` card; the second test below keeps the list from
 * outliving the code it excuses.
 */
type Waiver = { file: string; accesses: string[]; card: string; reason: string };

const WAIVED: Waiver[] = [
  // Empty, and that is the point: the one entry that lived here — `s.activeCount`
  // in app/[locale]/coverage/opengraph-image.tsx, the share card's country
  // ranking — was #221, and #221 landed. The panel now lists country names with
  // no count beside them and the file reaches no snapshot figure at all, so the
  // og:image test above proves the rule for it instead of excusing it.
];

function isWaived(file: string, access: string): boolean {
  return WAIVED.some((w) => w.file === file && w.accesses.includes(access));
}

/* ---------------------------------------------------------------------------
 * Surface discovery — by shape, not by a hand-typed list of paths
 * ------------------------------------------------------------------------- */

const ogImageFiles = tsxFiles(APP_DIR).filter((f) => path.basename(f) === "opengraph-image.tsx");

const metadataFiles = tsxFiles(APP_DIR)
  .map((file) => ({ file, source: parse(file) }))
  .map(({ file, source }) => ({ file, source, node: generateMetadataNode(source) }))
  .filter((entry): entry is { file: string; source: ts.SourceFile; node: ts.Node } => entry.node !== null);

const llmsRoute = path.join(SRC, "app/llms.txt/route.ts");

test.describe("BR-COMUNICACAO-002 item 5 — no affirmation surface reads the snapshot", () => {
  test("opengraph-image.tsx files exist to scan (control)", () => {
    expect(ogImageFiles.length).toBeGreaterThan(0);
  });

  for (const file of ogImageFiles) {
    const label = path.relative(SRC, file);
    test(`BR-COMUNICACAO-002 item 5: ${label} — whole file, it is the affirmation`, () => {
      const source = parse(file);
      if (!importsCoverage(source)) return; // most og images never touch coverage at all

      const hits = numericFieldAccesses(source, source).filter(
        (hit) => !isWaived(label, hit.split(" (")[0]),
      );

      expect(
        hits,
        "A snapshot numeric field reached an og:image file. BR-COMUNICACAO-002 item 5: " +
          '"Nenhum data-fact, meta tag, Open Graph ou llms.txt pode ler de coverage-snapshot.json." ' +
          "coverage-snapshot.json is a rendering threshold (STATE_MIN_COUNT = 50), frozen, and " +
          "superdeclares the archive by 244,120 points — src/lib/product-facts.ts is the dono.",
      ).toEqual([]);
    });
  }

  test("generateMetadata exports exist to scan (control)", () => {
    expect(metadataFiles.length).toBeGreaterThan(5);
  });

  for (const { file, source, node } of metadataFiles) {
    const label = path.relative(SRC, file);
    test(`BR-COMUNICACAO-002 item 5: ${label} generateMetadata() never reads the snapshot`, () => {
      // Scoped to the function's own subtree — page.tsx legitimately calls
      // getCoverageData() once and hands it to the page body's listing
      // (CoverageDensityMap); that call is not inside this function.
      const hits = numericFieldAccesses(node, source).filter(
        (hit) => !isWaived(label, hit.split(" (")[0]),
      );

      expect(
        hits,
        `${label}: generateMetadata() reads a snapshot numeric field. A <meta> tag is an ` +
          "affirmation surface (item 5's explicit list) even when the rest of the file uses the " +
          "same import for the page's listing.",
      ).toEqual([]);
    });
  }

  test("BR-COMUNICACAO-002 item 5: llms.txt/route.ts never reads the snapshot", () => {
    expect(fs.existsSync(llmsRoute)).toBe(true);
    const source = parse(llmsRoute);
    expect(
      importsCoverage(source),
      "llms.txt is read by an AI crawler as fact, not navigated — item 5 names it explicitly.",
    ).toBe(false);
  });

  test("BR-COMUNICACAO-002 item 5: every data-fact element is fed by product-facts.ts, not the snapshot", () => {
    // data-fact is CoverageHero's own marker (tests/e2e/product-facts.spec.ts
    // reads it) and today the only file that carries the attribute. A file
    // that both imports lib/coverage and renders data-fact is exactly the
    // shape item 5 forbids, whichever file it turns out to be tomorrow.
    const offenders: string[] = [];
    for (const file of tsxFiles(SRC)) {
      const text = fs.readFileSync(file, "utf8");
      if (!text.includes("data-fact")) continue;
      const source = parse(file);
      if (importsCoverage(source)) offenders.push(path.relative(SRC, file));
    }
    expect(offenders).toEqual([]);
  });

  test("the waiver above still matches a real access, in the file it names", () => {
    // The other half of a tracked exception: once #221 lands, this access is
    // gone and the entry has to go with it, or the guard has quietly stopped
    // proving anything for that file.
    for (const waiver of WAIVED) {
      const file = path.join(SRC, waiver.file);
      expect(fs.existsSync(file), `${waiver.file} (waived for ${waiver.card}) no longer exists`).toBe(
        true,
      );
      const source = parse(file);
      const hits = numericFieldAccesses(source, source).map((hit) => hit.split(" (")[0]);
      for (const access of waiver.accesses) {
        expect(
          hits,
          `${waiver.file}: waived access "${access}" (${waiver.card}) no longer appears — remove the waiver`,
        ).toContain(access);
      }
    }
  });
});
