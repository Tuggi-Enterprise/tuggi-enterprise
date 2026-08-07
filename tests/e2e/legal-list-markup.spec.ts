import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * #189 — `security-sla` had two `<ul>` holding a single `<li>` each: `s2Item1`
 * and `s3Item1` survived a claims recut that removed their siblings
 * (`docs/dev/medicao-constantes-site-2026-08.md` is a different cut; this one
 * is `05a6492`/`a647fa9`), and a list marker next to one item announces that
 * something used to be there (SC 1.3.1 — the markup no longer says what the
 * content is). Fixed in `12c1644` by trading the `<ul><li>` pair for a `<p>`,
 * `t.rich` and all.
 *
 * This is the static régua that keeps it fixed: the five trust-center pages
 * are hand-authored prose, edited by hand as claims are added or removed
 * (BR-B2B-007, the accessibility audit), and a `<li>` is exactly the kind of
 * sibling that is easy to delete without noticing it left the marker behind.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const TRUST_CENTER = path.join(REPO_ROOT, "src/app/[locale]/trust-center");

function legalPages(): string[] {
  return fs
    .readdirSync(TRUST_CENTER, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(TRUST_CENTER, entry.name, "page.tsx"))
    .filter((file) => fs.existsSync(file));
}

/**
 * Comment out before matching — the same order `no-javascript.spec.ts` uses
 * for `opacity: 0`, and for the same reason: the comment this fix left on
 * `security-sla/page.tsx` explains the defect in prose ("used to be a `<ul>`
 * holding a single `<li>`"), and those two tags in a code comment are not
 * markup. A first version of this régua matched from the comment's `<ul>`
 * through to the real one below it and miscounted — a false negative on the
 * exact regression it exists to catch.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Each page.tsx has no nested `<ul>`, so a non-greedy match is exact. */
function singleItemLists(source: string): number {
  const lists = stripComments(source).match(/<ul>[\s\S]*?<\/ul>/g) ?? [];
  return lists.filter((list) => (list.match(/<li>/g) ?? []).length === 1).length;
}

test.describe("BR trust-center prose — no <ul> is left holding a single <li> (#189)", () => {
  for (const file of legalPages()) {
    const relative = path.relative(REPO_ROOT, file);

    test(`${relative}: every <ul> has more than one <li>`, () => {
      const source = fs.readFileSync(file, "utf8");
      expect(
        singleItemLists(source),
        `${relative} has a <ul> with exactly one <li> — the marker for a list ` +
          "that no longer exists. Either restore the sibling item(s) or trade " +
          "the <ul><li> pair for a <p> (t.rich keeps the <strong> lead inline).",
      ).toBe(0);
    });
  }
});
