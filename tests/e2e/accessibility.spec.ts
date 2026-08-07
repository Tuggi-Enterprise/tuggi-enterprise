import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "../../src/i18n/locales";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * WCAG 2.1 AA regression net for the site, and the executable half of
 * DS-COR-004.
 *
 * Written against `docs/design/acessibilidade-auditoria-2026-08.md`, which
 * measured 23 findings across the 8 public pages in 4 locales and concluded the
 * site did not meet AA while `/trust-center/accessibility` declared it did.
 * Twenty-two of those were CSS or markup; one — the brand palette — was
 * structural, and the reason it was structural is that nothing stopped the
 * broken pairing from coming back in the next component. That is what the
 * first half of this file is: two greps, no judgement.
 *
 * The second half is what only the rendered page can answer: the tab order of
 * /coverage, the heading tree, and the document language.
 *
 * Deliberately NOT covered here, and each one has a reason written down:
 *
 *   - `opacity: 0` / `whileInView` (audit §2). Tested SC by SC and it violates
 *     none of them: the browser's own scroll-into-view is the trigger the
 *     IntersectionObserver waits for, so focus never lands on an invisible
 *     element, and `opacity` does not touch the accessibility tree. Its real
 *     defect is behaviour without JavaScript, which is a robustness card —
 *     #191, and it is asserted in `no-javascript.spec.ts`.
 *   - Transcripts for the three audio players (SC 1.2.1, finding 6). Missing
 *     content, not missing markup — there is nothing to assert until the text
 *     exists.
 *   - The header dropdown's missing `Escape` (1.4.13) and the mobile drawer's
 *     missing modal semantics (2.4.3 / 2.4.7). Both live in the menu, which
 *     this card was told not to touch; asserting them here would be a red test
 *     nobody is allowed to fix.
 */

// ───────────────────────────────────────────────────────────────────────────
// Half 1 — DS-COR-004, read off the source
// ───────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
/** Generated route and coverage snapshots, not hand-written markup. */
const SOURCE_SCAN_IGNORE = [path.join(SRC, "data")];
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".css", ".mjs", ".js"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SOURCE_SCAN_IGNORE.some((ignored) => full.startsWith(ignored))) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function sourceFiles(): { file: string; relative: string; text: string }[] {
  return walk(SRC).map((file) => ({
    file,
    relative: path.relative(REPO_ROOT, file),
    text: fs.readFileSync(file, "utf8"),
  }));
}

/**
 * Every quoted run in a file: `"…"`, `'…'` and `` `…` ``.
 *
 * Tailwind class lists are always string literals, including the branches of a
 * `${cond ? "a" : "b"}` inside a template — so scanning literals catches both
 * `className="…"` and the conditional class strings, without having to parse
 * JSX. It also means a comment can describe the forbidden pairing without
 * failing the test, which matters: the explanation of a defect has to be able
 * to name it.
 */
function stringLiterals(text: string): string[] {
  return text.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? [];
}

/**
 * A Tailwind utility, allowing any variant prefix (`focus:`, `group-hover:`,
 * `sm:`…) and refusing any suffix. `bg-tuggi-primary-text` and
 * `bg-tuggi-primary/20` are different utilities and must not match:
 *
 *   - `-text` is the darkened pair, the thing DS-COR-004 tells you to reach
 *     for, so matching it would fail the fix;
 *   - `/20` is a 20 %-alpha wash, not a filled brand surface. It is used on
 *     dark sections (TriggerSimulator) where white on top is legible, and the
 *     rule is about the *filled* surface. Widening the pattern to catch alpha
 *     variants would force a worse contrast, not a better one.
 */
function utility(name: string): RegExp {
  return new RegExp(String.raw`(?:^|[\s'"\`])(?:[a-z-]+:)*${name}(?![\w\-/])`);
}

const BG_PRIMARY = utility("bg-tuggi-primary");
const BG_SECONDARY = utility("bg-tuggi-secondary");
const TEXT_WHITE = utility("text-white");

test.describe("DS-COR-004 — filled brand surface carries dark ink", () => {
  test("no className pairs a filled brand surface with white ink (SC 1.4.3, SC 1.4.11)", () => {
    // Brand cyan with white on top measures 2.70:1 and brand orange 2.79:1 —
    // both under the 4.5:1 SC 1.4.3 asks of normal text and under the 3:1 floor
    // SC 1.4.11 asks of a non-text component. The same surfaces with
    // --color-tuggi-dark measure 6.92:1 and 6.71:1. There is no third option
    // that keeps the brand: closing the orange against white costs #C25100,
    // which is a second orange on the same page.
    const offenders: string[] = [];

    for (const { relative, text } of sourceFiles()) {
      for (const literal of stringLiterals(text)) {
        const filledSurface = BG_PRIMARY.test(literal) || BG_SECONDARY.test(literal);
        if (filledSurface && TEXT_WHITE.test(literal)) {
          offenders.push(`${relative}: ${literal.trim().slice(0, 160)}`);
        }
      }
    }

    expect(
      offenders,
      "Filled brand surface with white ink. Swap the ink for text-tuggi-dark " +
        "(DS-COR-004) — the surface never darkens, the ink does.",
    ).toEqual([]);
  });

  test("the secondary hover value exists only in globals.css (DS-COR-001)", () => {
    // The hover of a filled brand surface is a named token, not a hex in a
    // class. The value shipped as a literal in three lines of GlobalHeader for
    // as long as it existed; a colour with no owner is the shape of defect
    // CLAUDE.md §6 opens with.
    const hoverHex = /#e65f00/i;
    const owner = path.join("src", "app", "globals.css");

    const offenders = sourceFiles()
      .filter(({ text }) => hoverHex.test(text))
      .map(({ relative }) => relative)
      .filter((relative) => relative !== owner);

    expect(
      offenders,
      "Use the --color-tuggi-secondary-hover token (bg-tuggi-secondary-hover).",
    ).toEqual([]);
  });

  test("the token is declared in the @theme block", () => {
    const css = fs.readFileSync(path.join(SRC, "app", "globals.css"), "utf8");
    expect(css).toMatch(/--color-tuggi-secondary-hover:\s*#e65f00;/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Half 2 — what only the rendered page answers
// ───────────────────────────────────────────────────────────────────────────

/** The public URL of an internal pathname, for one locale. */
function localeUrl(locale: string, pagePath: string): string {
  if (!pagePath) return `/${locale}`;
  const slug = localizedPathname(locale, pagePath);
  return slug === "/" ? `/${locale}` : `/${locale}${slug}`;
}

/** The 8 pages the audit covered. */
const AUDITED_PAGES = [
  "",
  "/drive",
  "/technology",
  "/purpose",
  "/coverage",
  "/contact",
  "/tours",
  "/trust-center/accessibility",
] as const;

test.describe("Coverage map keyboard operability (SC 2.4.7, 2.4.3, 4.1.2)", () => {
  test("no decorative shape of the map is in the tab order", async ({ page }) => {
    // react-simple-maps hardcodes tabIndex="0" on every <path> it draws, and it
    // is not in our JSX — no grep of this repo ever showed it, and the axe rules
    // that would have caught it are best-practice, outside wcag2a/wcag2aa. It
    // put 4,773 unnamed, focus-invisible stops in the tab order of /coverage:
    // the first one on Tab #48, and still inside the map 140 Tabs later.
    await page.goto(localeUrl("pt", "/coverage"));

    const map = page.locator("svg.rsm-svg");
    await expect(map).toBeVisible();
    // The paths render asynchronously (the TopoJSON is fetched after mount).
    await expect(page.locator("svg.rsm-svg path").first()).toBeAttached();

    expect(await page.locator('svg.rsm-svg path[tabindex="0"]').count()).toBe(0);
    expect(await page.locator('svg.rsm-svg [tabindex="0"]').count()).toBe(0);
  });

  test("the map is hidden from assistive technology, and only because nothing in it is focusable", async ({
    page,
  }) => {
    // aria-hidden over focusable descendants is itself a violation, so these
    // two assertions only mean anything together.
    await page.goto(localeUrl("pt", "/coverage"));

    const map = page.locator("svg.rsm-svg");
    await expect(map).toHaveAttribute("aria-hidden", "true");
    expect(await map.locator("[tabindex]:not([tabindex='-1'])").count()).toBe(0);
  });

  test("tabbing through the coverage section never lands inside the map", async ({ page }) => {
    // The measurement the audit made, turned into a bound: the country filter
    // pills are two Tabs apart, and no shape sits between them.
    await page.goto(localeUrl("pt", "/coverage"));
    await expect(page.locator("svg.rsm-svg path").first()).toBeAttached();

    const insideMap: string[] = [];
    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press("Tab");
      const landed = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return el.closest("svg.rsm-svg") ? el.tagName.toLowerCase() : null;
      });
      if (landed) insideMap.push(`Tab #${i + 1} → <${landed}>`);
    }

    expect(insideMap, "Focus reached a decorative shape of the map.").toEqual([]);
  });
});

test.describe("Document structure and language", () => {
  for (const locale of LOCALES) {
    for (const pagePath of AUDITED_PAGES) {
      const url = localeUrl(locale, pagePath);

      test(`${url} — exactly one h1, no skipped heading level (SC 1.3.1)`, async ({ page }) => {
        // /trust-center/* is the page this catches: the sidebar label was an
        // <h2> in the shared layout, so it came *before* the page's own <h1> in
        // document order on the very page where the site declares conformance.
        await page.goto(url);

        const headings = await page.evaluate(() =>
          Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => ({
            level: Number(el.tagName.slice(1)),
            text: (el.textContent ?? "").trim().slice(0, 60),
          })),
        );

        const h1s = headings.filter((h) => h.level === 1);
        expect(h1s.map((h) => h.text), "one <h1> per page").toHaveLength(1);
        expect(headings[0]?.level, "the first heading of the document is the <h1>").toBe(1);

        const skips = headings
          .slice(1)
          .map((heading, index) => ({ heading, previous: headings[index] }))
          .filter(({ heading, previous }) => heading.level > previous.level + 1)
          .map(({ heading, previous }) => `h${previous.level} → h${heading.level} (${heading.text})`);

        expect(skips, "heading levels step by one on the way down").toEqual([]);
      });

      test(`${url} — exactly one main landmark (SC 1.3.1)`, async ({ page }) => {
        await page.goto(url);
        expect(await page.locator("main, [role=main]").count()).toBe(1);
      });

      test(`${url} — the document declares its own language (SC 3.1.1)`, async ({ page }) => {
        await page.goto(url);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
      });
    }
  }
});
