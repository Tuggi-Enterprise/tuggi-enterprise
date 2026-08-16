import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { publishedText } from "./support/published-text";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * BR-MONETIZACAO-058 item 2 — the welcome grant is activated by the user, in
 *                             the app. It is not given by the download, the
 *                             sign-up or the first launch.
 * BR-MONETIZACAO-062 item 2 — no public capture surface announces free access
 *                             as an automatic benefit of any of those.
 * BR-MONETIZACAO-062 item 3 — and none announces access in days, weeks or
 *                             months.
 *
 * ---------------------------------------------------------------------------
 * Why this file exists
 * ---------------------------------------------------------------------------
 *
 * The site published, for months, a grant the product never made: the free
 * card's first bullet promised a fixed stretch of unlimited audio "when you
 * download". It was false in the installed 1.5.x (where the grant exists but
 * the user has to accept it at a CTA) and it stays false after 1.6 (where the
 * quantity changes as well). Card #309 replaced it in six keys and four
 * languages.
 *
 * Correcting the six keys is not what stops it from coming back — the sentence
 * had already been rewritten once. What stops it is a ruler over the whole
 * message file: the promise may reappear in a seventh key, or in the FAQ, or
 * in /llms.txt, and a list of the six sentences that were wrong would not see
 * it. So the sweep below matches the **affirmation**, not the key.
 *
 * ---------------------------------------------------------------------------
 * The ruler
 * ---------------------------------------------------------------------------
 *
 * 1. **Nowhere**, in any published sentence: a download / install / sign-up
 *    trigger in the same sentence as a quantity of access (unlimited, or a
 *    numeral bound to hours or days). Adjacency inside one sentence is the
 *    whole ruler — it is what makes "free to download" legal and "24 hours of
 *    unlimited audio when you download" illegal.
 *
 * 2. **In the free-tier keys specifically**: no unlimited word at all, and no
 *    numeral bound to a time unit. The welcome grant carries no quantity on
 *    purpose — 1.5.x grants 24 running hours, 1.6 grants 5 hours of use, and
 *    any sentence naming either is false for half the installed base until the
 *    last 1.5.x device updates. There is no OTA, so that is measured in months.
 *
 * 3. **Rendered**: the six sentences reach the four pages, resolved, in the
 *    four languages. A key that is missing from a message file does not break
 *    the next-intl build — it publishes the key name, in production.
 *
 * False positives the ruler must not fire on, all present in the tree today:
 *
 *   - **"24 horas úteis"** in the enterprise contact SLA, and the App Store's
 *     24-hour renewal window in the Terms — neither is access, and neither
 *     sits next to a download word.
 *   - **The paid passes** ("unlimited stories" on a pass card): a quantity of
 *     access bought, not granted, and not attached to a download.
 *   - **"histórias por dia"**: a frequency with no numeral in front of it. The
 *     count itself is BR-MONETIZACAO-057's to publish, and it is deliberately
 *     absent from the copy.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");
const LOCALES = ["pt", "en", "es", "it"] as const;

/** The six sentences #309 rewrote, in the order a visitor meets them. */
const FREE_TIER_KEYS = [
  "Drive.Pricing.free1",
  "Drive.Pricing.free2",
  "Drive.Pricing.free3",
  "Drive.PlansHero.subtitle",
  "Drive.Sticky.text",
  "Drive.PlansExplainer.p1",
  "Metadata.driveDescription",
] as const;

/**
 * `driveDescription` is the one free-tier key that also describes what is for
 * sale, so a numeral bound to a time unit is legitimate there the day the hour
 * catalogue lands (#312). The unlimited half of rule 2 still applies to it.
 */
const SELLS_AS_WELL = new Set(["Metadata.driveDescription"]);

/**
 * Published prose that is not a message file: the AI-readable summary and the
 * app feature list. Comments are stripped before the sweep — a sweep that reads
 * the explanation of a defect goes red on the explanation.
 */
const PROSE_FILES = ["src/app/llms.txt/route.ts", "src/lib/app-meta.ts"];

/**
 * There is no known gap left. One line of /llms.txt used to sell the passes by
 * day and was carried here as a named exemption while #312 was open; #312
 * rewrote it into hours, so the exemption was deleted rather than left behind
 * as a dead permission — which is what its own comment asked for. The sweep
 * below now covers both prose files whole.
 */

// Stems, not words: the four languages conjugate the trigger ("você baixa",
// "lo scarichi", "la descargas") and a word list catches the infinitive only.
// 134 strings in the tree match this today, which is what keeps rule 1 from
// being green because it matches nothing.
const TRIGGER = /(baix\w*|download|descarg\w*|scaric\w*|instal\w*)/i;
const QUANTITY =
  /(ilimitad\w*|unlimited|illimitat\w*|\d+\s?(h\b|horas?\b|hours?\b|ore\b|ora\b)|\d+[\s-]?(dias?|days?|d[ií]as?|giorni)\b)/i;
const UNLIMITED = /(ilimitad\w*|unlimited|illimitat\w*)/i;
const TIMED = /\d+\s?[-\s]?(h\b|horas?\b|hours?\b|ore\b|ora\b|dias?\b|days?\b|d[ií]as?\b|giorni\b|semanas?\b|weeks?\b|settimane?\b|mes(es)?\b|months?\b|mesi\b)/i;

/** Sentence, not string: adjacency is the ruler and a paragraph is not adjacency. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));
}

function flatten(messages: Messages, prefix = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const dotted = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[dotted, value] as [string, string]]
      : flatten(value, dotted);
  });
}

function messageAt(locale: string, dottedKey: string): string | undefined {
  const found = flatten(messagesFor(locale)).find(([key]) => key === dottedKey);
  return found?.[1];
}

function proseWithoutComments(file: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/* ---------------------------------------------------------------------------
 * 1. The sweep — no access granted by downloading, in any sentence the site
 *    publishes
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-062 item 2 — the download grants nothing, and no sentence says it does", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-062 item 2 / BR-MONETIZACAO-058 item 2: ${locale}.json never puts a grant next to a download`, () => {
      const offenders = flatten(messagesFor(locale))
        .flatMap(([key, value]) => sentences(value).map((sentence) => ({ key, sentence })))
        .filter(({ sentence }) => TRIGGER.test(sentence) && QUANTITY.test(sentence))
        .map(({ key, sentence }) => `${key}: ${sentence.trim()}`);

      expect(
        offenders,
        "A sentence promises a quantity of access in the same breath as the download. " +
          "The welcome grant is activated by the user inside the app (BR-MONETIZACAO-058 " +
          "item 2); nothing is given for downloading.",
      ).toEqual([]);
    });
  }

  test("BR-MONETIZACAO-062 item 2: /llms.txt and the app feature list say it no differently", () => {
    const offenders: string[] = [];

    for (const file of PROSE_FILES) {
      proseWithoutComments(file)
        .split("\n")
        .forEach((line, index) => {
          for (const sentence of sentences(line)) {
            if (TRIGGER.test(sentence) && QUANTITY.test(sentence)) {
              offenders.push(`${file}:${index + 1}: ${sentence.trim()}`);
            }
          }
        });
    }

    expect(offenders).toEqual([]);
  });

  // The third test of this describe was the KNOWN_GAP assertion, and it died
  // with the gap. What replaces it is not a second ruler here — item 3 is swept
  // whole, over the message files *and* these two prose files, by
  // `tests/e2e/hour-catalogue.spec.ts` (#312). Repeating it in this file would
  // be CLAUDE.md §6's "segunda implementação da mesma decisão".
});

/* ---------------------------------------------------------------------------
 * 2. The free-tier keys — no quantity, in any language
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-058 — the welcome grant is published without a quantity", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-058 items 1 and 2: the free-tier copy in ${locale} names no amount of access`, () => {
      const unlimited: string[] = [];
      const timed: string[] = [];

      for (const key of FREE_TIER_KEYS) {
        const message = messageAt(locale, key);
        expect(message, `${key} is missing from ${locale}.json`).toBeDefined();

        if (UNLIMITED.test(message!)) unlimited.push(`${key}: ${message}`);
        if (!SELLS_AS_WELL.has(key) && TIMED.test(message!)) timed.push(`${key}: ${message}`);
      }

      expect(
        unlimited,
        "The free tier is not unlimited in either version of the app: 1.5.x grants a stretch " +
          "of running hours after the user accepts it, 1.6 grants 5 hours of use " +
          "(BR-MONETIZACAO-058 item 1), and outside the grant the free tier is a few stories " +
          "a day (BR-MONETIZACAO-057).",
      ).toEqual([]);

      expect(
        timed,
        "The grant carries no quantity in public copy on purpose. 1.5.x and 1.6 grant " +
          "different amounts, there is no OTA, and both versions are in the field for months " +
          "— a sentence naming either one is false for half the installed base.",
      ).toEqual([]);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 3. The rendered half — the six sentences reach /drive in four languages
 * ------------------------------------------------------------------------- */

test.describe("DS-COPY — the corrected sentences are what /drive serves", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-062 item 2: /${locale}/drive serves the six free-tier sentences and no key name`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);
      expect(response?.status()).toBe(200);

      const served = await publishedText(page);

      for (const key of FREE_TIER_KEYS) {
        const message = messageAt(locale, key)!;
        expect(served, `${key} is not served on /${locale}/drive`).toContain(message);
        // next-intl publishes the key name when the key is gone. It does not
        // break the build, and nothing else in this file would notice.
        expect(served, `${key} is served as its own name`).not.toContain(key);
      }

      expect(served, "the page still promises audio for downloading").not.toMatch(
        /24\s?(h|horas|hours|ore)\b/i,
      );
    });
  }
});
