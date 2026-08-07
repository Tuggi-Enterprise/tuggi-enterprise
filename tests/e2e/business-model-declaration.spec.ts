import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PUBLISHABLE_MODELS } from "../../src/lib/segments";

/**
 * Card #193, component 4.5 — `BusinessModelCards`, spec §5, as reshaped by
 * `design` in the comment on #195.
 *
 * The spec drew three cards. BR-B2B-009 item 1 then left one model publishable
 * and the form changed with the count: with one model the section is a
 * declaration, not a grid. That coupling is what this file guards — the count,
 * the form, and the two things the copy may not carry.
 *
 * **What is not asserted here, and why.** Nothing serves this component yet:
 * the hub `/parcerias` and the segment pages are card #195, open and unblocked.
 * The rendered-HTML assertions (server component, four locales, 360 px) belong
 * with the route that mounts it and are listed in the comment on #193. A test
 * asserting that nobody mounts it would go red the day #195 does its job,
 * which is the wrong direction for a guard to point.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const COMPONENT = path.join(SRC, "components/blocks/BusinessModelCards.tsx");
const LOCALES = ["pt", "en", "es", "it"] as const;

/**
 * Source with comments stripped. The component explains in prose why it has no
 * `h3` and no card frame, and a scan that reads its subject's explanation goes
 * red on the explanation.
 */
function componentCode(): string {
  return fs
    .readFileSync(COMPONENT, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function commercialCopy(locale: string): Record<string, string> {
  const file = path.join(SRC, "messages", `${locale}.json`);
  const all = JSON.parse(fs.readFileSync(file, "utf8")) as {
    Segments: { commercial: Record<string, string> };
  };
  return all.Segments.commercial;
}

test.describe("BR-B2B-009 item 1 — one publishable model, and the form follows the count", () => {
  test("BR-B2B-009: `commission` is the only model a public surface may state", () => {
    expect([...PUBLISHABLE_MODELS]).toEqual(["commission"]);
  });

  /**
   * The list is the type — that is the whole gate. Measured on this commit:
   * `businessModels: ['wholesale']` fails with `Type '"wholesale"' is not
   * assignable to type '"commission"'`. Replacing the derivation with a
   * hand-written union would reopen the hole while every runtime assertion
   * still passed, so the derivation itself is what is asserted.
   */
  test("BR-B2B-009: BusinessModelKey is derived from the list, never written by hand", () => {
    const registry = fs.readFileSync(path.join(SRC, "lib/segments.ts"), "utf8");
    expect(registry).toContain(
      "export type BusinessModelKey = (typeof PUBLISHABLE_MODELS)[number];",
    );
  });

  /**
   * `design` (#195): a card is an affordance of comparison. One card centred on
   * a site that uses a grid of three everywhere else reads as "the other two
   * failed to load", and an `h3` above the single body would stack *comissão*
   * and *participação na receita* — the same thing under two names — on one
   * screen.
   */
  test("#195: with one model the section declares, and carries no card chrome", () => {
    const code = componentCode();
    for (const chrome of ["<h3", "shadow", "rounded-", "grid", ".map("]) {
      expect(code, `BusinessModelCards.tsx carries ${chrome}`).not.toContain(chrome);
    }
    // A card frame is a border on every side; the section rule below the block
    // is `border-b`, which is the page's rhythm and not a frame.
    expect(code).not.toMatch(/\bborder\s/);
  });

  test("spec §5.5: the block is a server component — nothing here needs the client", () => {
    expect(componentCode()).not.toContain("use client");
  });
});

test.describe("BR-B2B-005 / BR-MONETIZACAO-039 — the page never sizes the share", () => {
  for (const locale of LOCALES) {
    test(`BR-B2B-005: ${locale} states the share without a figure, a percentage or a range`, () => {
      const offenders = Object.entries(commercialCopy(locale)).flatMap(([key, value]) => {
        const hits: string[] = [];
        // spec §5.8 item 4 — no digit in any of the three strings. The
        // percentage is the operator's, set in the commercial agreement, and a
        // page that names it commits the company to it.
        if (/\d/.test(value)) hits.push(`${key} carries a digit: "${value}"`);
        if (/%|\bpor ?cento\b|\bper ?cent\b/i.test(value)) {
          hits.push(`${key} carries a percentage sign: "${value}"`);
        }
        if (/a partir de|starting at|desde|a partire da/i.test(value)) {
          hits.push(`${key} opens a range: "${value}"`);
        }
        return hits;
      });
      expect(offenders).toEqual([]);
    });
  }

  test("BR-IDIOMA-001 item 3: the three strings exist in all four locales", () => {
    for (const locale of LOCALES) {
      const copy = commercialCopy(locale);
      for (const key of ["title", "lead", "note"]) {
        expect(copy[key]?.trim().length, `${locale}: Segments.commercial.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
