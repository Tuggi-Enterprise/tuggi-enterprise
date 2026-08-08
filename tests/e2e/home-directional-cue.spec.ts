import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Card #218 — the home says that TUGGI names the place before it narrates.
 *
 * BR-AUDIO-014 item 1 is the behaviour underneath: a POI reached by trigger
 * point plays **the directional cue and then the narration**. That cue is a
 * product fact with three shipped halves — the `sampleN-dir.mp3` files, the
 * chaining `AudioSampleCard` does on one press (#213), and the `directional`
 * chip that names it — and after `bf7d5f1` no surface of the site *said* it.
 * The two sentences that did left with the `feat1` block and with the hero
 * pill; §6.4 of docs/design/spec-repaginacao-site-2026-08.md assumed item 2 of
 * the page would carry the meaning, and item 2 says the stories play by
 * themselves, which is the trigger and not the announcement.
 *
 * So what is guarded here is a claim the site has to keep making, and the guard
 * has three parts because the claim has three ways to die:
 *
 *  1. the sentence loses the cue and keeps the rest (a copy edit);
 *  2. the key survives and the block that renders it does not — which is
 *     exactly how the claim died the first time, with no test going red;
 *  3. a second key starts saying it too, and the next edit fixes one of them.
 *
 * **The order matters and is asserted.** The cue *precedes* the narration; a
 * sentence that mentions both in the other order describes a different product.
 *
 * What is deliberately **not** asserted is the form *"à sua esquerda: X"*. It
 * only ever existed inside a phone mock-up, and promoting it to body copy would
 * be a new promise about what the app announces — which belongs to `produto`,
 * not here (card #218, "o que não volta").
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["pt", "en", "es", "it"] as const;

/** The key the card makes the single owner of the claim. */
const OWNER = "Home.Showcase.feat2Body";

/**
 * The two halves of the claim, per language.
 *
 * Anchored on the copy on purpose, and it is the one case where that is right:
 * the subject of this file *is* a sentence, so a ruler that avoided naming it
 * would be asserting nothing. `names` is the cue and `narrates` is what follows
 * it — only `names` is required to be unique, because "tells the story" is said
 * legitimately by the hero and by `Home.Context.p1`.
 */
const CLAIM: Record<(typeof LOCALES)[number], { names: RegExp; narrates: RegExp }> = {
  pt: { names: /diz o nome do lugar/i, narrates: /conta a hist[óo]ria/i },
  en: { names: /says the name of the place/i, narrates: /tells the story/i },
  es: { names: /dice el nombre del lugar/i, narrates: /cuenta la historia/i },
  it: { names: /dice il nome del luogo/i, narrates: /racconta la storia/i },
};

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "src/messages", `${locale}.json`), "utf8"),
  ) as Messages;
}

function flatten(node: Messages, prefix = "", out = new Map<string, string>()): Map<string, string> {
  for (const [key, value] of Object.entries(node)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(dotted, value);
    else flatten(value, dotted, out);
  }
  return out;
}

function messageAt(locale: string, dotted: string): string {
  const value = flatten(messagesFor(locale)).get(dotted);
  expect(typeof value, `${dotted} (${locale})`).toBe("string");
  return value as string;
}

/** innerText collapses runs of whitespace differently than the source file does. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

test.describe("BR-AUDIO-014 item 1 — the home affirms the cue that names the place", () => {
  for (const locale of LOCALES) {
    test(`BR-AUDIO-014 item 1: ${OWNER} in ${locale} says the name comes before the story`, () => {
      const value = messageAt(locale, OWNER);
      const { names, narrates } = CLAIM[locale];

      expect(value, "the cue is not affirmed").toMatch(names);
      expect(value, "the narration that follows it is not affirmed").toMatch(narrates);

      // Cue first. `search` on both halves, not a single regex with `.*`
      // between them, so the failure says which half moved.
      expect(
        value.search(names),
        "the story is announced before the place is named",
      ).toBeLessThan(value.search(narrates));
    });
  }

  for (const locale of LOCALES) {
    test(`card #218: /${locale} serves the sentence as text a visitor reads`, async ({ page }) => {
      await page.goto(`/${locale}`);
      // Visible text, never `page.content()`: the next-intl payload ships the
      // whole message file inside the HTML of every page, so a `grep` over the
      // markup stays green after the block that renders this is deleted —
      // which is the regression this test exists for.
      const rendered = normalize(await page.locator("body").innerText());
      expect(rendered, `/${locale} does not render ${OWNER}`).toContain(
        normalize(messageAt(locale, OWNER)),
      );
    });
  }

  for (const locale of LOCALES) {
    test(`CLAUDE.md §6: in ${locale} the cue is claimed by ${OWNER} and by nothing else`, () => {
      const owners = [...flatten(messagesFor(locale))]
        .filter(([, value]) => CLAIM[locale].names.test(value))
        .map(([key]) => key);

      expect(
        owners,
        "Two keys stating the same product fact is the shape that let it go stale " +
          "the first time: `feat1Body` said it, the hero pill said it, and removing " +
          "one block removed the claim from a page that still had the other.",
      ).toEqual([OWNER]);
    });
  }
});
