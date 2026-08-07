import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { contrast } from "./support/contrast";

/**
 * Card #193, component 4.4 — TriggerComparison, spec §4 of
 * docs/design/spec-repaginacao-site-2026-08.md.
 *
 * What the block replaced is the reason these assertions exist. /technology
 * used to stage a console (`lat, lng`, `heading`, `speed`, `Audio.play()`,
 * `200 OK`) and the home carried two orphan simulators, one of them repainting
 * at 20 frames per second forever. The four properties the replacement has to
 * keep are the four this file measures: nothing loops, everything is served,
 * the two columns stay a comparison at 360 px, and no sentence in it promises
 * routing.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const COMPONENT = path.join(SRC, "components/blocks/TriggerComparison.tsx");
const LOCALES = ["pt", "en", "es", "it"] as const;

function messagesFor(locale: string): Record<string, string> {
  const file = path.join(SRC, "messages", `${locale}.json`);
  const all = JSON.parse(fs.readFileSync(file, "utf8")) as {
    Technology: { Comparison: Record<string, string> };
  };
  return all.Technology.Comparison;
}

/** The component's source with its comments removed — see the note in §"loop". */
function componentCode(): string {
  return fs
    .readFileSync(COMPONENT, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

test.describe("spec §4.1 — what the block replaced is gone", () => {
  for (const orphan of ["TechEngine", "TriggerSimulator", "InteractiveSimulator"]) {
    test(`CLAUDE.md §6: ${orphan}.tsx no longer exists`, () => {
      expect(fs.existsSync(path.join(SRC, `components/blocks/${orphan}.tsx`))).toBe(false);
    });
  }

  test("CLAUDE.md §6: no i18n block is left behind without a component", () => {
    for (const locale of LOCALES) {
      const all = JSON.parse(
        fs.readFileSync(path.join(SRC, "messages", `${locale}.json`), "utf8"),
      ) as Record<string, Record<string, unknown>>;
      expect(all.Technology.Engine, `${locale}: Technology.Engine`).toBeUndefined();
      expect(all.Home.Simulator, `${locale}: Home.Simulator`).toBeUndefined();
    }
  });
});

test.describe("spec §4.2 and §4.6 — a drawing, not a simulation", () => {
  /**
   * Comments are stripped before matching: this file's own prose names
   * `setInterval` in the component's header, and a scan that reads its
   * subject's explanation goes red on the explanation.
   */
  test("spec §4.6: the component runs no loop and ships no client bundle", () => {
    const code = componentCode();
    for (const forbidden of [
      "use client",
      "setInterval",
      "setTimeout",
      "requestAnimationFrame",
      "useState",
      "useEffect",
      "framer-motion",
    ]) {
      expect(code, `TriggerComparison.tsx contains ${forbidden}`).not.toContain(forbidden);
    }
  });

  /**
   * The two drawings are one comparison only if they are drawn at one scale.
   * Two viewBoxes, or a second set of place coordinates, and the reader is
   * comparing two pictures instead of two decisions — which is the whole
   * content of this block.
   */
  test("spec §4.2: both drawings share one coordinate space", () => {
    const code = componentCode();
    expect(code.match(/viewBox=/g)?.length).toBe(2);
    expect(code.match(/viewBox=\{VIEW_BOX\}/g)?.length).toBe(2);
    expect(code.match(/const PLACES = \[/g)?.length).toBe(1);
  });
});

test.describe("BR-MAPA-005 / DS-COPY-003 — the copy promises no routing", () => {
  /**
   * "Direction of movement" and "line of sight" describe how the trigger
   * chooses. A route, an ETA or a recalculation would be the product saying it
   * navigates, which BR-MAPA-005 decided it does not — in any of the four
   * languages, because a claim only has to be true in the one the visitor
   * reads.
   */
  const ROUTING_TERMS = [
    /\broteiriza/i,
    /\brotas?\b/i,
    /\broteiros?\b/i,
    /\brouting\b/i,
    /\broutes?\b/i,
    /\brutas?\b/i,
    /\bpercors[oi]\b/i,
    /\bitinerari/i,
    /\bturn-by-turn\b/i,
    /\bETA\b/,
    /\brec[aá]lculo\b|\brecalcul/i,
    /\bnaveg[aá]\w*/i,
    /\bnavigat\w*/i,
  ];

  for (const locale of LOCALES) {
    test(`BR-MAPA-005: ${locale} states the trigger without naming a route`, () => {
      const offenders = Object.entries(messagesFor(locale)).flatMap(([key, value]) =>
        ROUTING_TERMS.filter((term) => term.test(value)).map(
          (term) => `Technology.Comparison.${key} matches ${term}: "${value}"`,
        ),
      );
      expect(offenders).toEqual([]);
    });
  }
});

test.describe("spec §4.3 and §4.7 — served, in four languages, without JavaScript", () => {
  for (const locale of LOCALES) {
    test(`DS-COPY-001: /${locale}/technology serves both labels and both sentences with JS off`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      const messages = messagesFor(locale);

      const response = await page.goto(`/${locale}${localizedPathname(locale, "/technology")}`);
      expect(response?.status()).toBe(200);

      for (const key of ["title", "subtitle", "radiusLabel", "radiusBody", "coneLabel", "coneBody"]) {
        await expect(
          page.getByText(messages[key], { exact: false }).first(),
          `${locale}: ${key}`,
        ).toBeVisible();
      }

      // The drawings are the state the previous simulator only reached after
      // hydration. They are aria-hidden because the sentences next to them say
      // what they say (DS-A11Y-004) — so they are asserted by presence, not by
      // an accessible name.
      const drawings = page.locator("section svg[aria-hidden='true'] circle");
      expect(await drawings.count()).toBeGreaterThan(0);

      await context.close();
    });
  }
});

test.describe("spec §4.4 — the contrast survives 360 px", () => {
  /**
   * The article that holds one column, located by its own label. Scoped to
   * `section article`: the page wraps everything in an <article> of its own,
   * which contains both headings and would match the filter too.
   */
  function column(page: import("@playwright/test").Page, label: string) {
    return page
      .locator("section article")
      .filter({ has: page.getByRole("heading", { name: label }) });
  }

  test("DS-LAYOUT-001: at 360 px the columns stack, in reading order, with a separator", async ({
    page,
  }) => {
    const messages = messagesFor("it"); // the longest of the four locales (DS-COPY-001)
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/it${localizedPathname("it", "/technology")}`);

    const radius = column(page, messages.radiusLabel);
    const cone = column(page, messages.coneLabel);
    const radiusBox = (await radius.boundingBox())!;
    const coneBox = (await cone.boundingBox())!;

    // Stacked, and in the order the spec fixed: what the industry does first,
    // the conclusion last.
    expect(coneBox.y).toBeGreaterThan(radiusBox.y + radiusBox.height - 1);

    // Without the rule between them, two stacked columns read as a list of two
    // features rather than as a contrast (spec §4.4).
    const separator = await cone.evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(parseFloat(separator)).toBeGreaterThan(0);

    for (const box of [radiusBox, coneBox]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
    }
  });

  /**
   * Card #212, item 1. The two <article>s were already the same width — the
   * grid gives them that, and the assertion below has always passed — while
   * the *drawings* inside them were not: `md:pl-12` on column B came out of
   * B's own box, so the same viewBox rendered 8-15% narrower there and the two
   * <h3> landed 34.3 px out of line. Same coordinate space is the block's whole
   * argument, so the drawing is what gets measured, not its container.
   */
  test("spec §4.2: side by side, the two drawings render at the same size", async ({ page }) => {
    await page.goto(`/it${localizedPathname("it", "/technology")}`);

    const drawings = page.locator("section article svg[aria-hidden='true']");
    const headings = page.locator("section article h3");
    await expect(drawings).toHaveCount(2);
    await expect(headings).toHaveCount(2);

    for (const width of [768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const [radius, cone] = [
        (await drawings.nth(0).boundingBox())!,
        (await drawings.nth(1).boundingBox())!,
      ];
      const [radiusLabel, coneLabel] = [
        (await headings.nth(0).boundingBox())!,
        (await headings.nth(1).boundingBox())!,
      ];

      expect(Math.abs(cone.width - radius.width), `@${width}px: drawing width`).toBeLessThanOrEqual(1);
      expect(Math.abs(coneLabel.y - radiusLabel.y), `@${width}px: label baseline`).toBeLessThanOrEqual(2);
    }
  });

  test("spec §4.3: side by side, the two columns keep the same height", async ({ page }) => {
    const messages = messagesFor("it");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/it${localizedPathname("it", "/technology")}`);

    const radiusBox = (await column(page, messages.radiusLabel).boundingBox())!;
    const coneBox = (await column(page, messages.coneLabel).boundingBox())!;

    // Same row...
    expect(Math.abs(coneBox.y - radiusBox.y)).toBeLessThan(2);
    // ...and the same height, from the grid and not from a min-height
    // (DS-A11Y-005): a comparison whose halves do not line up stops being one.
    expect(Math.abs(coneBox.height - radiusBox.height)).toBeLessThan(2);
  });
});

/* -------------------------------------------------------------------------- */

type Shape = {
  column: "radius" | "cone";
  part: string;
  stroke: number[] | null;
  fill: number[] | null;
};

/**
 * Every named shape of both drawings, with its ink already composited over the
 * section's own background.
 *
 * The compositing happens in a 1×1 canvas rather than by parsing the computed
 * value, and that is not indirection: Tailwind v4 declares the neutral scale in
 * `oklch`, Chrome hands `getComputedStyle().stroke` back as `lab(48.08 -2.03
 * -16.58)`, and a check that reads `rgb(r, g, b)` out of that string gets three
 * numbers that are not channels — it would report a contrast that is not real,
 * in either direction. Canvas gives the browser's own sRGB, alpha included,
 * which is what the eye receives.
 */
async function shapesOf(page: import("@playwright/test").Page): Promise<{
  background: number[];
  shapes: Shape[];
}> {
  return page.evaluate(() => {
    const srgb = (color: string, background: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };

    const columns = [...document.querySelectorAll("section article")].filter((article) =>
      article.querySelector("svg[aria-hidden='true']"),
    );
    const background = getComputedStyle(columns[0].closest("section")!).backgroundColor;

    return {
      background: srgb(background, "rgb(255, 255, 255)"),
      shapes: columns.flatMap((article, index) =>
        [...article.querySelectorAll("[data-part]")].map((shape) => {
          const style = getComputedStyle(shape);
          return {
            column: index === 0 ? ("radius" as const) : ("cone" as const),
            part: shape.getAttribute("data-part") ?? "",
            stroke: style.stroke === "none" ? null : srgb(style.stroke, background),
            fill: style.fill === "none" ? null : srgb(style.fill, background),
          };
        }),
      ),
    };
  });
}

/**
 * Spec §4.2 and §4.6, card #212 item 2 — the drawing has to argue what the
 * caption argues.
 *
 * It argued the opposite: the cone was `--color-tuggi-primary`, 2.70:1 on
 * white, against a neutral radius at 5.98:1 sitting on a filled disc. The
 * column labelled "what the industry does" was the strongest object on the
 * page, and the five identical places — the premise of the whole comparison —
 * were legible in one column only (`fill-slate-300`, 1.49:1).
 *
 * The ruler here is deliberately relative, because that is what the spec sets:
 * an absolute floor would have passed the version that shipped.
 */
test.describe("spec §4.2 and §4.6 — the drawing says what the caption says", () => {
  const MINIMUM = 3; // SC 1.4.11, graphical object. Not 4.5:1 — that is text.

  test("SC 1.4.11: the cone outweighs the radius, and no mark falls under 3:1", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/en${localizedPathname("en", "/technology")}`);

    const { background, shapes } = await shapesOf(page);
    // Named locators over an aria-hidden drawing: if the geometry is ever
    // rewritten and the names go with it, this goes red rather than green
    // against nothing.
    expect(shapes.map((shape) => `${shape.column}.${shape.part}`)).toEqual(
      expect.arrayContaining([
        "radius.reach",
        "radius.place",
        "radius.traveller",
        "cone.reach",
        "cone.cone",
        "cone.sight",
        "cone.place",
        "cone.highlight",
      ]),
    );

    const find = (column: string, part: string) =>
      shapes.find((shape) => shape.column === column && shape.part === part)!;

    const cone = contrast(find("cone", "cone").stroke!, background);
    const radius = contrast(find("radius", "reach").stroke!, background);

    // The comparison reads the right way round only if our mark is the strong
    // one. This is the assertion the shipped version failed: 2.70 against 5.98.
    expect(cone, `cone ${cone.toFixed(2)}:1 vs radius ${radius.toFixed(2)}:1`).toBeGreaterThan(radius);
    expect(cone).toBeGreaterThanOrEqual(MINIMUM);

    // And nothing that carries meaning drops out of sight while we are at it.
    // The wedge's fill is an area, not a mark, and is not in this list: it is
    // `--color-tuggi-primary/15` on purpose.
    for (const shape of shapes) {
      if (shape.stroke) {
        const ratio = contrast(shape.stroke, background);
        expect(ratio, `${shape.column}.${shape.part} stroke: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(MINIMUM);
      }
    }
    for (const place of shapes.filter((shape) => shape.part === "place")) {
      const ratio = contrast(place.fill!, background);
      expect(ratio, `${place.column}.place fill: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(MINIMUM);
    }
  });

  /**
   * "Same traveller, same five places, same reach" is the sentence the file's
   * header opens with, and it was true of the coordinates and false of the ink:
   * the reach was drawn at 5.98:1 in A and 1.23:1 in B, the places at 5.46:1
   * against 1.49:1. What differs between the columns is what the trigger
   * *decides*, never what it is deciding about.
   */
  test("spec §4.2: the shared coordinate space is drawn with the same ink in both columns", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/en${localizedPathname("en", "/technology")}`);

    const { shapes } = await shapesOf(page);
    for (const part of ["reach", "place"] as const) {
      const [a, b] = ["radius", "cone"].map(
        (column) => shapes.find((shape) => shape.column === column && shape.part === part)!,
      );
      expect(a, `radius.${part}`).toBeDefined();
      expect(b, `cone.${part}`).toBeDefined();
      expect(b.stroke, `${part}: stroke`).toEqual(a.stroke);
      expect(b.fill, `${part}: fill`).toEqual(a.fill);
    }
  });
});
