import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { publishedText } from "./support/published-text";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * BR-MONETIZACAO-048 — the paid catalogue is three passes of hours (10, 25, 45),
 *                      each named by its hour count and carrying a usage
 *                      caption. No SKU is named by days, and the annual
 *                      subscription is out of the 1.6 catalogue.
 * BR-MONETIZACAO-050 — hours bought do not expire (App Store Review Guideline
 *                      3.1.1 forbids expiring purchased credit).
 * BR-MONETIZACAO-052 — hours from different passes add up, with no cap.
 * BR-MONETIZACAO-061 — the three passes are Consumables, one-time purchases
 *                      that do not renew; the word "plano" is not used for
 *                      them.
 * BR-MONETIZACAO-062 item 3 — no public capture surface announces access in
 *                      days, weeks or months.
 *
 * ---------------------------------------------------------------------------
 * What this file is for
 * ---------------------------------------------------------------------------
 *
 * The site sold "Passe 7 Dias", "Passe 30 Dias" and an annual plan, in four
 * languages, across the pricing section, the two FAQs, the explainer, the
 * page metadata, the header, the footer, `/llms.txt` and the structured data a
 * crawler reads. #312 replaced all of it with hours.
 *
 * Rewriting those keys is not what keeps them rewritten. The catalogue lives in
 * a rule and the copy lives in twelve places, so the ruler below matches the
 * **claim**, not the key: a numeral bound to a day/week/month unit, or the
 * annual product by name, anywhere the site publishes prose. A list of the
 * sentences that were wrong would not see the thirteenth.
 *
 * ---------------------------------------------------------------------------
 * Three scopes this deliberately does not reach
 * ---------------------------------------------------------------------------
 *
 * 1. **`Legal.*`** — the Terms still describe the 7/30-day passes and the
 *    auto-renewing annual subscription, and that is not a leftover. They have
 *    two readers: whoever buys after 1.6 and whoever already bought before it.
 *    Rewriting a contract that describes what existing customers agreed to is
 *    `produto`/legal's call and has its own card; #312 was scoped out of it by
 *    the operator. `Legal.Terms.s6Item3` (the 7-day Right of Withdrawal) is not
 *    even about the catalogue — it is the Brazilian CDC, law, not product.
 * 2. **`Coupon.*`** — a time coupon grants `until` and is still measured in
 *    days (BR-MONETIZACAO-047). It is a different concession, not this
 *    catalogue.
 * 3. **The store**. Passes priced by day are not deleted from the stores and
 *    stay current for versions below 1.6 (BR-MONETIZACAO-048, 2nd edge case).
 *    What this guard is about is the *site*, which speaks to whoever installs
 *    today.
 *
 * ---------------------------------------------------------------------------
 * And no price, while #297 is open
 * ---------------------------------------------------------------------------
 *
 * The three Consumables do not exist in either store yet, so the page publishes
 * no amount at all: the store note carries the price information on its own.
 * A number here would name a price nobody can be charged, in a section whose
 * whole job is to be trusted about what things cost.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");
const LOCALES = ["pt", "en", "es", "it"] as const;

/** Published prose that is not a message file: the AI-crawler summary and the
 *  `SoftwareApplication.featureList` a search engine reads as fact. */
const PROSE_FILES = ["src/app/llms.txt/route.ts", "src/lib/app-meta.ts"];

/** Namespaces the sweep does not reach, each with the reason above. */
const OUT_OF_SCOPE = ["Legal.", "Coupon."];

const PRICING_SECTION = '[data-section="drive-pricing"]';

/* ---------------------------------------------------------------------------
 * The rulers
 * ------------------------------------------------------------------------- */

/**
 * A numeral bound to a calendar unit — "7 dias", "30-day", "un mes".
 *
 * Bound, not merely present: the unit has to follow the numeral. That is what
 * keeps "não dias no calendário" (the explainer saying the opposite of this
 * claim, on purpose) and "histórias todo dia" (a frequency, no numeral) out of
 * it, while "45 dias" would be caught in any of the four languages.
 */
const ACCESS_IN_DAYS =
  /\b\d+\s?[-\s]?(dias?|d[ií]as?|days?|giorni|giorno|semanas?|weeks?|settimane?|mes(?:es)?|months?|mesi)\b/i;

/** The annual product, by name, in the four languages. */
const ANNUAL_PRODUCT =
  /\b(anual(?:mente)?|annual(?:ly)?|annuale|anuales?|assinatura anual|piano annuale|plan anual)\b/i;

/**
 * The word "plano" for a pass — BR-MONETIZACAO-061's first edge case. Passes do
 * not renew, and "plan" imports the anxiety of an automatic renewal into a
 * product that has none. Key and component names may keep it (`PlansHero`,
 * `navPlans`); this is about what the tourist reads.
 */
const PLAN_WORD = /\b(planos?|plan(?:es|s)?|piani?|piano)\b/i;

/** Where "plan" may not be read: the whole pass surface. */
const PLAN_FREE_PREFIXES = ["Drive.", "Header.", "Footer.", "Metadata.drive"];

/**
 * A published amount of money: a currency mark, or a bare decimal with two
 * places (9,90 / 2.99). Hours are integers, so "10 horas" cannot trip it.
 */
const PRICE = /(R\$|US\$|\bUSD\b|\bBRL\b|\bEUR\b|€|£|\$\s?\d)|\b\d+[.,]\d{2}\b/;

/** The catalogue, as BR-MONETIZACAO-048 lists it. */
const HOURS = [10, 25, 45] as const;

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

function publicMessages(locale: string): [string, string][] {
  return flatten(messagesFor(locale)).filter(
    ([key]) => !OUT_OF_SCOPE.some((prefix) => key.startsWith(prefix)),
  );
}

function messageAt(locale: string, dottedKey: string): string | undefined {
  return flatten(messagesFor(locale)).find(([key]) => key === dottedKey)?.[1];
}

/** Source with comments stripped: a sweep that reads the explanation of the
 *  defect it looks for goes red on the explanation. */
function proseWithoutComments(file: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/* ---------------------------------------------------------------------------
 * 1. The catalogue the copy names — hours, not days
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-048 — the site names the three hour passes and nothing else", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-048: ${locale}.json names the passes 10, 25 and 45 hours`, () => {
      const titles = HOURS.map(
        (hours, index) => [hours, messageAt(locale, `Drive.Pricing.pass${index + 1}Title`)] as const,
      );

      for (const [hours, title] of titles) {
        expect(title, `Drive.Pricing.pass*Title for ${hours}h is missing from ${locale}.json`,
        ).toBeDefined();
        // The name of a pass is its hour count, and the unit is spelled out —
        // a bare "10" is a number the tourist cannot size.
        expect(title!, `the ${hours}h pass is not named by its hours in ${locale}`).toMatch(
          new RegExp(`\\b${hours}\\s?(horas?|hours?|ore)\\b`, "i"),
        );
      }

      // ...and the usage caption next to it, which BR-MONETIZACAO-048 calls the
      // whole bridge of comprehension, not decoration.
      for (const index of [1, 2, 3]) {
        const caption = messageAt(locale, `Drive.Pricing.pass${index}Desc`);
        expect(caption, `pass${index}Desc is missing from ${locale}.json`).toBeTruthy();
        expect(caption!.trim().length, `pass${index}Desc is empty in ${locale}`).toBeGreaterThan(3);
      }
    });

    test(`BR-MONETIZACAO-062 item 3: no public string in ${locale}.json sells access by the day`, () => {
      const offenders = publicMessages(locale)
        .filter(([, value]) => ACCESS_IN_DAYS.test(value))
        .map(([key, value]) => `${key}: ${value}`);

      expect(
        offenders,
        "The unit of what is granted is the hour of use (BR-MONETIZACAO-047 and 048). " +
          '"7 dias", "30 dias" and "24h de teste" name products the catalogue stopped ' +
          "having on 2026-08-12.",
      ).toEqual([]);
    });

    test(`BR-MONETIZACAO-048: ${locale}.json no longer offers the annual subscription`, () => {
      const offenders = publicMessages(locale)
        .filter(([, value]) => ANNUAL_PRODUCT.test(value))
        .map(([key, value]) => `${key}: ${value}`);

      expect(
        offenders,
        "The annual subscription left the 1.6 catalogue (operator, 2026-08-12). In 1.6 " +
          "`unlimited` comes from a coupon, a CMS grant or a transfer — never from a " +
          "purchase — so a page offering it sells something the store will not deliver.",
      ).toEqual([]);
    });

    test(`BR-MONETIZACAO-061: ${locale}.json calls no pass a "plan"`, () => {
      const offenders = publicMessages(locale)
        .filter(([key]) => PLAN_FREE_PREFIXES.some((prefix) => key.startsWith(prefix)))
        .filter(([, value]) => PLAN_WORD.test(value))
        .map(([key, value]) => `${key}: ${value}`);

      expect(
        offenders,
        'Passes are Consumables and do not renew (BR-MONETIZACAO-061). "Plano" imports the ' +
          "anxiety of an automatic renewal into a product that has none — the name of the " +
          "section is Passes.",
      ).toEqual([]);
    });
  }

  test("BR-MONETIZACAO-062 item 3: /llms.txt and the app feature list sell hours too", () => {
    const offenders: string[] = [];

    for (const file of PROSE_FILES) {
      proseWithoutComments(file)
        .split("\n")
        .forEach((line, index) => {
          if (ACCESS_IN_DAYS.test(line) || ANNUAL_PRODUCT.test(line)) {
            offenders.push(`${file}:${index + 1}: ${line.trim()}`);
          }
        });
    }

    expect(
      offenders,
      "/llms.txt is read by an AI crawler as fact and app-meta.ts feeds " +
        "SoftwareApplication.featureList — neither is i18n, and both published the " +
        "day-priced catalogue on their own.",
    ).toEqual([]);
  });

  test("BR-MONETIZACAO-048: no surface names a professional plan", () => {
    // "Tuggi Pro" is the epic's own specification error: the operator does not
    // recognise the product, and the catalogue is closed at three.
    const offenders: string[] = [];
    for (const locale of LOCALES) {
      for (const [key, value] of flatten(messagesFor(locale))) {
        if (/tuggi\s*pro\b/i.test(value)) offenders.push(`${locale}:${key}: ${value}`);
      }
    }
    for (const file of PROSE_FILES) {
      if (/tuggi\s*pro\b/i.test(proseWithoutComments(file))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * 2. What the hours promise — they add up, and they do not expire
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-050 and 052 — the two promises the hour model makes", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-052 / BR-MONETIZACAO-061: the note under the cards states both in ${locale}`, () => {
      const note = messageAt(locale, "Drive.Pricing.passesNote");
      expect(note, `Drive.Pricing.passesNote is missing from ${locale}.json`).toBeTruthy();

      // One-time payment (061) and hours that add up (052) — the two facts the
      // nine repeated card bullets used to carry between them.
      expect(note!, "the note does not say the purchase is one-time").toMatch(
        /(pagamento (único|unico)|one-?time|pago único)/i,
      );
      expect(note!, "the note does not say hours from different passes add up").toMatch(
        /(som[ae]m|add up|se suman|si sommano)/i,
      );
    });

    test(`BR-MONETIZACAO-050: ${locale} says somewhere the hours do not expire`, () => {
      // 3.1.1 forbids expiring purchased credit, so "does not expire" is a
      // property of the product, not a marketing line — and it is the single
      // sentence that replaces every validity window the page used to print.
      const claims = publicMessages(locale)
        .filter(([, value]) => /(n[ãa]o expiram|never expire|no caducan|non scadono)/i.test(value))
        .map(([key]) => key);

      expect(
        claims.length,
        "Nowhere on the site says the purchased hours do not expire. It is the whole " +
          "difference between this catalogue and the one it replaces.",
      ).toBeGreaterThan(0);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 3. No price, while #297 is open
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-048 — the page publishes no amount, and says where the amount is", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-048: no pricing string in ${locale}.json carries a price`, () => {
      const offenders = flatten(messagesFor(locale))
        .filter(([key]) => key.startsWith("Drive.Pricing."))
        .filter(([, value]) => PRICE.test(value))
        .map(([key, value]) => `${key}: ${value}`);

      expect(
        offenders,
        "The three Consumables do not exist in either store yet (#297). A number here " +
          "names a price nobody can be charged; the store note carries the price " +
          "information on its own.",
      ).toEqual([]);
    });

    test(`BR-MONETIZACAO-048: the store note in ${locale} points at the store for the price`, () => {
      const note = messageAt(locale, "Drive.Pricing.storeNote");
      expect(note, `Drive.Pricing.storeNote is missing from ${locale}.json`).toBeTruthy();
      expect(note!, "the store note names neither store").toMatch(/App Store/);
      expect(note!, "the store note names neither store").toMatch(/Google Play/);
      expect(note!, "the store note carries a price of its own").not.toMatch(PRICE);
    });
  }

  test("BR-MONETIZACAO-048: the component itself hard-codes no amount", () => {
    const component = fs
      .readFileSync(path.join(REPO_ROOT, "src/components/blocks/DrivePricing.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    expect(component, "the pricing component reads a price map again").not.toMatch(
      /useGeoPricing|formatPrice/,
    );
  });
});

/* ---------------------------------------------------------------------------
 * 4. The rendered half — what /drive actually serves, in four languages
 * ------------------------------------------------------------------------- */

/** Every key the section renders, in the order the visitor meets them. */
const SECTION_KEYS = [
  "kicker",
  "title",
  "subtitle",
  "anchor",
  "pass1Title",
  "pass1Desc",
  "pass1Action",
  "pass2Title",
  "pass2Desc",
  "pass2Action",
  "pass3Title",
  "pass3Desc",
  "pass3Action",
  "recommended",
  "passesNote",
  "storeNote",
  "freeTitle",
  "freePrice",
  "freeAction",
] as const;

test.describe("BR-MONETIZACAO-048 — /drive serves the hour catalogue in four languages", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-048 / 052 / 061: /${locale}/drive publishes the three hour passes`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);
      expect(response?.status()).toBe(200);

      // Not page.content(): next-intl ships every source string of every page
      // inside the RSC payload, so the raw HTML still contains "Passe 7 Dias"
      // no matter what this section renders. See support/published-text.ts.
      const served = await publishedText(page);

      for (const key of SECTION_KEYS) {
        const message = messageAt(locale, `Drive.Pricing.${key}`)!;
        expect(served, `Drive.Pricing.${key} is not served on /${locale}/drive`).toContain(message);
        // A key missing from a message file does not break the next-intl
        // build — it publishes the key name, in production.
        expect(served, `Drive.Pricing.${key} is served as its own name`).not.toContain(
          `Drive.Pricing.${key}`,
        );
      }

      const section = await page.locator(PRICING_SECTION).innerText();
      expect(section, "the pricing section still sells access by the day").not.toMatch(
        ACCESS_IN_DAYS,
      );
      expect(section, "the pricing section still offers the annual subscription").not.toMatch(
        ANNUAL_PRODUCT,
      );
      expect(section, "the pricing section publishes an amount while #297 is open").not.toMatch(
        PRICE,
      );
    });

    test(`BR-MONETIZACAO-062 item 3: nothing on /${locale}/drive announces access in days`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);
      expect(response?.status()).toBe(200);

      const served = await publishedText(page);
      const offenders = served
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => ACCESS_IN_DAYS.test(line) || ANNUAL_PRODUCT.test(line));

      expect(
        offenders,
        "The whole page — title, meta description, JSON-LD and body — has to agree with " +
          "the catalogue. The metadata is the half a visitor reads in a search result " +
          "before any of the copy.",
      ).toEqual([]);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 5. The headline, whole, at the reflow width
 * ------------------------------------------------------------------------- */

/**
 * 320 px is the ruler, not 360: it is WCAG 2.2 SC 1.4.10's reflow width, and
 * satisfying it satisfies 360 as well. Both are asserted because 360 is the
 * acceptance criterion written on the card and 320 is the standard's.
 *
 * What this catches is not a missing translation — it is a `truncate`, a
 * `line-clamp-*`, a `whitespace-nowrap` or a fixed height arriving in the
 * header block later, in a locale nobody previews. The headline is the longest
 * string in the section in three of the four languages.
 */
test.describe("WCAG 2.2 SC 1.4.10 — the headline reflows whole", () => {
  for (const locale of LOCALES) {
    for (const width of [320, 360]) {
      test(`BR-MONETIZACAO-048: /${locale}/drive shows the headline whole at ${width} px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        const response = await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);
        expect(response?.status()).toBe(200);

        const heading = page.locator(`${PRICING_SECTION} h2`);
        await expect(heading, "the section has exactly one h2").toHaveCount(1);
        await expect(heading).toHaveText(messageAt(locale, "Drive.Pricing.title")!);

        const box = await heading.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            scrollHeight: node.scrollHeight,
            clientHeight: node.clientHeight,
            lineClamp: style.getPropertyValue("-webkit-line-clamp"),
            whiteSpace: style.whiteSpace,
            overflow: style.overflow,
          };
        });

        expect(box.scrollWidth, "the headline overflows its box horizontally").toBe(box.clientWidth);
        expect(box.scrollHeight, "the headline is cut vertically").toBe(box.clientHeight);
        expect(box.lineClamp, "the headline is line-clamped").toMatch(/^(none|)$/);
        expect(box.whiteSpace, "the headline cannot wrap").toBe("normal");
        expect(box.overflow, "the headline hides its own overflow").toBe("visible");

        // The subtitle is the second half of the headline and carries the
        // promise that the hours never expire — it is not decoration.
        const subtitle = page.locator(PRICING_SECTION).getByText(
          messageAt(locale, "Drive.Pricing.subtitle")!,
          { exact: true },
        );
        await expect(subtitle).toBeVisible();

        const doc = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(doc.scrollWidth, "the page scrolls horizontally at this width").toBe(doc.innerWidth);
      });
    }
  }

  for (const locale of LOCALES) {
    test(`WCAG 2.2 SC 1.3.1: the eyebrow on /${locale}/drive is not a heading`, async ({ page }) => {
      const response = await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);
      expect(response?.status()).toBe(200);

      const kicker = messageAt(locale, "Drive.Pricing.kicker")!;
      const headings = await page
        .locator(`${PRICING_SECTION} :is(h1,h2,h3,h4,h5,h6)`)
        .allInnerTexts();

      expect(
        headings.map((text) => text.trim()),
        "The section name is an eyebrow, not a heading: the sentence that converts is the " +
          "h2, and a section has one.",
      ).not.toContain(kicker);
      // The three pass names are the h3s, so the outline of the section reads
      // as the catalogue rather than as a label above it.
      expect(headings.map((text) => text.trim())).toContain(
        messageAt(locale, "Drive.Pricing.pass2Title")!,
      );
    });
  }
});
