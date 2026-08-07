import type { Page } from "@playwright/test";

/**
 * WCAG 2.2 contrast, and the one place this suite computes it.
 *
 * Not a spec file: `testDir` collects `*.spec.ts`, so nothing here is a test.
 *
 * It exists because the formula was being retyped. Two of the copies are
 * unavoidable — `home-order.spec.ts` and `coverage-density.spec.ts` compute it
 * *inside* `page.evaluate`, where a Node import cannot reach — but the rest is
 * one decision with one owner, which is what DS-A11Y-001 needs if it is going
 * to be checked by more than one file.
 */

/** WCAG 2.2 relative luminance, on sRGB channels 0–255. */
export function luminance([r, g, b]: number[]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.2 contrast ratio. Both colours must already be opaque sRGB. */
export function contrast(ink: number[], background: number[]): number {
  const [a, b] = [luminance(ink), luminance(background)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/**
 * The contrast of an element's text against what is actually painted behind it.
 *
 * Both halves are measured in the browser, on a 1×1 canvas, and neither is
 * parsed out of a computed string. Two reasons, and both have already produced
 * a wrong number in this repo:
 *
 *   - Tailwind v4 declares colours in `oklch`, and Chrome hands
 *     `getComputedStyle()` back in whatever space it likes — `lab(…)`,
 *     `oklch(…)`. Reading three numbers out of that as if they were sRGB
 *     channels reports a ratio that does not exist, in either direction.
 *   - A semi-transparent background (`bg-blue-50/50`) is not the colour the eye
 *     receives. The stack below walks up the ancestors until an opaque layer,
 *     paints them bottom-up over white, and reads back the composite.
 *
 * Canvas accepts any colour the browser understands and returns the browser's
 * own sRGB, alpha included — which is the number the criterion is about.
 */
export async function measuredTextContrast(page: Page, selector: string): Promise<number> {
  const { ink, background } = await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) throw new Error(`No element matched ${sel}`);

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;

    const paint = (layers: string[]): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      for (const layer of layers) {
        ctx.fillStyle = layer;
        ctx.fillRect(0, 0, 1, 1);
      }
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };

    /** 0 for `transparent`, 255 for a solid layer — read, never parsed. */
    const alphaOf = (color: string) => paint([color])[3];

    // Bottom-up: the first opaque ancestor, then everything under this element
    // that is painted over it.
    const stack: string[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const layer = getComputedStyle(node).backgroundColor;
      const alpha = alphaOf(layer);
      if (alpha > 0) stack.unshift(layer);
      if (alpha === 255) break;
    }

    // White is the canvas of the document, and the fallback when nothing in the
    // ancestor chain is opaque.
    const background = paint(["#ffffff", ...stack]).slice(0, 3);
    const ink = paint(["#ffffff", ...stack, getComputedStyle(element).color]).slice(0, 3);

    return { ink, background };
  }, selector);

  return contrast(ink, background);
}
