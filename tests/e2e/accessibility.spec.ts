import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "../../src/i18n/locales";
import { localizedPathname } from "../../src/i18n/pathnames";
import { measuredTextContrast } from "./support/contrast";

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
 *
 * The third half, added by #198 and #220, is the menu: findings 7 and 8 were
 * carved out of the first pass because the header was being rewritten, and they
 * are the two the audit could only describe as behaviour — dismissing a panel
 * and escaping a drawer are keystrokes, not attributes, and a keystroke with no
 * test disappears at the next refactor. The contrast of the locale dropdown
 * closes it: the first half of this file greps source, and a ratio produced by
 * compositing a 50 %-alpha wash is not something a grep can see.
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
  /**
   * Since #223 the drawing loads only once its frame comes near the fold, so
   * the three tests below have to bring it there before they can look at it.
   * The rule each one proves is untouched: whether the shapes are focusable is
   * a question about the map that exists, and this is how it comes to exist.
   */
  const bringMapIntoView = (page: Page) =>
    page.locator('[data-part="map-frame"]').scrollIntoViewIfNeeded();

  test("no decorative shape of the map is in the tab order", async ({ page }) => {
    // react-simple-maps hardcodes tabIndex="0" on every <path> it draws, and it
    // is not in our JSX — no grep of this repo ever showed it, and the axe rules
    // that would have caught it are best-practice, outside wcag2a/wcag2aa. It
    // put 4,773 unnamed, focus-invisible stops in the tab order of /coverage:
    // the first one on Tab #48, and still inside the map 140 Tabs later.
    await page.goto(localeUrl("pt", "/coverage"));
    await bringMapIntoView(page);

    const map = page.locator("svg.rsm-svg");
    await expect(map).toBeVisible();
    // The paths render asynchronously (the TopoJSON is fetched once the frame
    // is near the fold, #223).
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
    await bringMapIntoView(page);

    const map = page.locator("svg.rsm-svg");
    await expect(map).toHaveAttribute("aria-hidden", "true");
    expect(await map.locator("[tabindex]:not([tabindex='-1'])").count()).toBe(0);
  });

  test("tabbing through the coverage section never lands inside the map", async ({ page }) => {
    // The measurement the audit made, turned into a bound: the country filter
    // pills are two Tabs apart, and no shape sits between them.
    await page.goto(localeUrl("pt", "/coverage"));
    await bringMapIntoView(page);
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

// ───────────────────────────────────────────────────────────────────────────
// Half 3 — the menu, findings 7 and 8
// ───────────────────────────────────────────────────────────────────────────

/**
 * Both surfaces are located by `data-*`, never by their accessible name. The
 * names are copy now (A11y namespace, #198): asserting against them would pin
 * a test to a Portuguese string and break the day a translator improves it —
 * which is the exact coupling that kept these two names in English for months.
 *
 * And they are copy in the full sense: the moment they left the JSX for
 * src/messages, non-objective-sweep.spec.ts started reading them, and
 * "Navegação principal" failed BR-COMUNICACAO-004 item 1 on the spot. The names
 * that shipped say "menu", not "navigation".
 */
const LOCALE_TRIGGER = "[data-locale-trigger]";
const LOCALE_PANEL = "[data-locale-panel]";
const MENU_TRIGGER = "[data-menu-trigger]";
const DRAWER = '[role="dialog"][aria-modal="true"]';

test.describe("Locale dropdown is dismissible from the keyboard (SC 1.4.13)", () => {
  test("Escape closes the panel and hands the focus back to its trigger", async ({ page }) => {
    // SC 1.4.13 asks three things of additional content: hoverable, persistent
    // and dismissible. The first two were already true; the third had no
    // implementation at all — the only way out of this panel was the pointer.
    await page.goto(localeUrl("pt", ""));

    const trigger = page.locator(LOCALE_TRIGGER);
    const panel = page.locator(LOCALE_PANEL);

    await trigger.click();
    await expect(panel).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");

    await expect(panel).not.toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Dismissing by dropping the focus to <body> trades SC 1.4.13 for SC 2.4.3.
    await expect(trigger).toBeFocused();
  });

  test("the closed panel keeps its four links out of the tab order", async ({ page }) => {
    // `visibility: hidden` is what does this, and the audit flagged it as the
    // one thing already right about this dropdown. It is asserted so that
    // swapping `invisible` for an opacity fade — which looks identical — fails
    // here instead of adding four phantom tab stops to every page.
    await page.goto(localeUrl("pt", ""));

    const reachable = await page.locator(`${LOCALE_PANEL} a`).evaluateAll((nodes) =>
      nodes.filter((node) => node.checkVisibility({ visibilityProperty: true })).length,
    );
    expect(reachable, "focusable links inside the closed locale panel").toBe(0);
  });
});

test.describe("Mobile drawer is a modal (SC 2.4.3, SC 2.4.7)", () => {
  // The drawer only exists below `lg:`. On the suite's desktop viewport it is
  // `display: none`, and every assertion below would pass without meaning.
  test.use({ viewport: { width: 390, height: 844 } });

  test("the drawer declares itself a modal dialog with a localized name", async ({ page }) => {
    await page.goto(localeUrl("pt", ""));

    const drawer = page.locator(DRAWER);
    await expect(drawer).toHaveCount(1);

    // A dialog with no accessible name is an unnamed region to a screen
    // reader, and next-intl renders the key path itself when a key is missing —
    // in production, silently. So the assertion reads the expected value out of
    // the message file rather than repeating it: the name is copy, and copy has
    // one owner.
    const messages = JSON.parse(
      fs.readFileSync(path.join(SRC, "messages", "pt.json"), "utf8"),
    ) as { A11y: Record<string, string> };
    await expect(drawer).toHaveAttribute("aria-label", messages.A11y.menu);
  });

  test("the closed drawer is out of the tab order", async ({ page }) => {
    // Finding 8's quiet half. The panel never leaves the DOM — it slides out
    // with `-translate-x-full`, which does not touch focusability. Before
    // `inert`, tabbing from the top of any page at mobile width walked through
    // the whole hidden menu before reaching the page content.
    await page.goto(localeUrl("pt", ""));

    await expect(page.locator(DRAWER)).toHaveAttribute("inert", "");

    const landed: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      const where = await page.evaluate((selector) => {
        const el = document.activeElement;
        return el?.closest(selector) ? (el.textContent ?? el.tagName).trim().slice(0, 40) : null;
      }, DRAWER);
      if (where) landed.push(`Tab #${i + 1} → ${where}`);
    }

    expect(landed, "focus reached the closed drawer").toEqual([]);
  });

  test("opening moves the focus in, and Tab never leaves the dialog", async ({ page }) => {
    // The measurable consequence in the audit: with the drawer open, Tab
    // reached links the backdrop covers, so the focus ring was invisible
    // (SC 2.4.7) and the order stopped matching the page (SC 2.4.3).
    // `aria-modal` alone does not do this — it hides the background from
    // assistive technology and leaves the tab order untouched.
    await page.goto(localeUrl("pt", ""));
    await page.locator(MENU_TRIGGER).click();

    const drawer = page.locator(DRAWER);
    await expect(drawer).not.toHaveAttribute("inert", "");

    const inside = async () =>
      page.evaluate(
        (selector) => !!document.activeElement?.closest(selector),
        DRAWER,
      );

    expect(await inside(), "focus after opening the drawer").toBe(true);

    const escaped: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press("Tab");
      if (!(await inside())) escaped.push(i + 1);
    }
    expect(escaped, "Tab left the modal dialog").toEqual([]);

    // Shift+Tab has its own edge, and a trap that only holds one way is not a
    // trap: the first stop wraps backwards to the last.
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press("Shift+Tab");
      if (!(await inside())) escaped.push(-(i + 1));
    }
    expect(escaped, "Shift+Tab left the modal dialog").toEqual([]);
  });

  test("Escape closes the drawer and returns the focus to the button that opened it", async ({
    page,
  }) => {
    await page.goto(localeUrl("pt", ""));

    const trigger = page.locator(MENU_TRIGGER);
    const drawer = page.locator(DRAWER);

    await trigger.click();
    await expect(drawer).not.toHaveAttribute("inert", "");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");

    await expect(drawer).toHaveAttribute("inert", "");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Without this the focus falls to <body> under the now-inert drawer and the
    // next Tab restarts at the top of the document.
    await expect(trigger).toBeFocused();
  });

  test("the close button inside the drawer returns the focus the same way", async ({ page }) => {
    // Same contract, second exit. The X sits inside the subtree that goes
    // `inert` on close, so it is the exit that loses the focus if nobody
    // catches it.
    await page.goto(localeUrl("pt", ""));

    const trigger = page.locator(MENU_TRIGGER);
    await trigger.click();

    await page.locator(`${DRAWER} button`).first().click();

    await expect(page.locator(DRAWER)).toHaveAttribute("inert", "");
    await expect(trigger).toBeFocused();
  });
});

test.describe("Locale dropdown contrast (DS-COR-002, SC 1.4.3)", () => {
  // The selected item is `text-sm font-bold` — 14 px. WCAG 2.2 calls text
  // "large" at 24 px, or 18.66 px when bold, so this is normal text and the
  // floor is 4.5:1, not 3:1. `text-tuggi-primary` on `bg-blue-50/50` measured
  // 2.57:1 and shipped on every page of the site, because the header is global.
  const AA_NORMAL_TEXT = 4.5;

  for (const locale of LOCALES) {
    test(`${locale}: the selected language reads at AA against the wash behind it`, async ({
      page,
    }) => {
      await page.goto(localeUrl(locale, ""));
      await page.locator(LOCALE_TRIGGER).click();

      const selected = page.locator("[data-locale-selected]");
      await expect(selected, "exactly one language is marked selected").toHaveCount(1);
      await expect(selected).toBeVisible();

      const ratio = await measuredTextContrast(page, "[data-locale-selected]");
      expect(
        ratio,
        `DS-COR-002: brand cyan is a surface colour. As ink it takes the darkened pair — ` +
          `text-tuggi-primary-text (#007aa5), which is what the unselected sibling already ` +
          `uses on hover. Measured ${ratio.toFixed(2)}:1.`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }

  test("the selection is not communicated by colour alone (SC 1.4.1)", async ({ page }) => {
    // The 6 px dot next to the selected label is why the colour swap is only
    // about legibility and not about meaning. Removing it would turn a contrast
    // fix into a 1.4.1 failure, silently.
    await page.goto(localeUrl("pt", ""));
    await page.locator(LOCALE_TRIGGER).click();

    const marks = page.locator("[data-locale-selected] div.rounded-full");
    await expect(marks, "the selected language carries a non-colour mark").toHaveCount(1);
  });
});
