import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { publishedText } from "./support/published-text";
import { localizedPathname } from "../../src/i18n/pathnames";
import { parseEditorialDocument } from "../../src/lib/editorial-mdx";

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
 * And the price, which came back on 2026-08-16 — but only in three markets
 * ---------------------------------------------------------------------------
 *
 * #312 shipped this section with no amount at all, while #297 was open. #372
 * put the number back in the three base markets of BR-MONETIZACAO-069 (BRL, USD
 * and EUR) and nowhere else. What stays true here is that **no amount is born
 * in a message file**: the numbers live in `src/lib/pricing.ts`, under the rule,
 * and the copy points at the store. The rendered half of that promise — which
 * market publishes a number and which one may not — is
 * tests/e2e/base-market-price.spec.ts.
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
 * 3. No amount is born in the copy, and both store notes point at the store
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-069 — the amount lives in the price table, never in a string", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-069: no pricing string in ${locale}.json carries a price`, () => {
      const offenders = flatten(messagesFor(locale))
        .filter(([key]) => key.startsWith("Drive.Pricing."))
        .filter(([, value]) => PRICE.test(value))
        .map(([key, value]) => `${key}: ${value}`);

      expect(
        offenders,
        "A price typed into a translation is a number the price table does not know " +
          "about: it survives a market it does not belong to, it is never formatted by " +
          "Intl, and it drifts from BR-MONETIZACAO-048 the day the table changes. The " +
          "amounts come from src/lib/pricing.ts and only there.",
      ).toEqual([]);
    });

    for (const key of ["storeNoteWithPrice", "storeNoteNoPrice"] as const) {
      test(`BR-MONETIZACAO-069: ${key} in ${locale} points at the store for the price`, () => {
        const note = messageAt(locale, `Drive.Pricing.${key}`);
        expect(note, `Drive.Pricing.${key} is missing from ${locale}.json`).toBeTruthy();
        expect(note!, "the store note names neither store").toMatch(/App Store/);
        expect(note!, "the store note names neither store").toMatch(/Google Play/);
        expect(note!, "the store note carries a price of its own").not.toMatch(PRICE);
      });
    }

    test(`BR-MONETIZACAO-069: Drive.Pricing.storeNote is gone from ${locale}.json`, () => {
      // It was written for a page with no price at all and contradicts the
      // priced state ("each pass shows its price in the store", under a
      // printed price). Two states, two sentences — and a key nothing renders
      // is copy that lies about what the page says.
      expect(
        messageAt(locale, "Drive.Pricing.storeNote"),
        "storeNote was replaced by storeNoteWithPrice and storeNoteNoPrice (#372)",
      ).toBeUndefined();
    });
  }

  test("BR-MONETIZACAO-069: the component itself hard-codes no amount", () => {
    // The assertion this replaces said the component reads no price map at all
    // — true while #312 held the number back, a lie the moment #372 put it
    // back. What has to stay true is narrower and is the actual promise: the
    // component prints what the table gives it, and invents no number of its
    // own. Which *markets* may show one is base-market-price.spec.ts.
    const component = fs
      .readFileSync(path.join(REPO_ROOT, "src/components/blocks/DrivePricing.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    // `PRICE` is the ruler for prose and would fire on this file's own
    // furniture — `min-h-[1.75rem]` and the framer durations are decimals with
    // two places and neither is money. In code the ruler is a currency mark or
    // one of the six amounts of BR-MONETIZACAO-048, typed out.
    expect(component, "a currency mark is typed into the pricing component").not.toMatch(
      /R\$|US\$|\bUSD\b|\bBRL\b|\bEUR\b|€|£|\$\s?\d/,
    );
    expect(component, "an amount of the price table is typed into the component").not.toMatch(
      /\b(?:9[.,]90?|19[.,]90?|29[.,]90?|2[.,]99|5[.,]99|9[.,]99)\b/,
    );
    expect(
      component,
      "the component builds a price string by hand instead of formatting it with Intl " +
        "— that breaks `en` (R$9.90) and `es`/`it` (9,90 BRL), and the screen reader " +
        "loses the currency",
    ).toMatch(/formatPrice\(/);
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
  // The resting state, which is what a local build serves: no
  // `x-vercel-ip-country` header means no base market, so the slot says
  // `priceInStore` and the note is the no-price one. `storeNoteWithPrice` is
  // deliberately absent from this list — it is served only in a base market,
  // and base-market-price.spec.ts is where that is asserted.
  "priceInStore",
  "passesNote",
  "storeNoteNoPrice",
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
      // BR-MONETIZACAO-069: this build answers /api/geo with no country, so
      // the visitor is in no base market and no amount may be published. If a
      // fallback market ever comes back, this is where it surfaces.
      expect(
        section,
        "the pricing section publishes an amount outside the three base markets",
      ).not.toMatch(PRICE);
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

/* ---------------------------------------------------------------------------
 * 6. The editorial content — DS-COPY-048, and the dispensation it declares
 * ------------------------------------------------------------------------- */

/**
 * The guards above sweep `src/messages/*.json`, and until 2026-08-30 that was
 * every public string of the site. It no longer is: the editorial section of
 * `/updates` publishes prose from `src/content/updates/**\/*.mdx`, which is not
 * i18n and which this sweep did not reach.
 *
 * That absence produced two defects at once, and they pull in opposite
 * directions:
 *
 *   1. **A hole.** Article #7, written in a hurry a year from now, can sell a
 *      "7-day pass" and nothing goes red.
 *   2. **A false positive waiting to happen.** Article #1 *has* to name the
 *      day-priced model in order to explain that it ended. Extending the sweep
 *      without a way out reproves the piece for telling the truth.
 *
 * The way out is the shape `DS-COPY-016` already fixed and `DS-COPY-048` now
 * states: **the guard separates offering from mentioning by declaration, never
 * by counting.** The frontmatter carries `waiver: [{ rule, reason }]`, per
 * file. A waiver with no reason is refused by the parser (it breaks the build);
 * a waiver that matches nothing in its own file is refused here, which is the
 * same hinge `no-hardcoded-copy.spec.ts` uses to stop a dispensation from
 * outliving the string that justified it.
 *
 * **`PRICE` has no dispensation.** A price on this site is born in
 * `src/lib/pricing.ts`, under BR-MONETIZACAO-069, and no article has a reason
 * to type one — the article reads `<ArticlePriceTable>`, which asks
 * `resolvePricing`.
 */
const CONTENT_DIR = path.join(REPO_ROOT, "src/content/updates");

/** The rules an article may declare a dispensation from, and the ruler of each. */
const CONTENT_RULES: { rule: string; ruler: RegExp; waivable: boolean }[] = [
  { rule: "ACCESS_IN_DAYS", ruler: ACCESS_IN_DAYS, waivable: true },
  { rule: "ANNUAL_PRODUCT", ruler: ANNUAL_PRODUCT, waivable: true },
  { rule: "PLAN_WORD", ruler: PLAN_WORD, waivable: true },
  { rule: "PRICE", ruler: PRICE, waivable: false },
];

function editorialFiles(): { file: string; raw: string }[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR).flatMap((id) => {
    const dir = path.join(CONTENT_DIR, id);
    if (!fs.statSync(dir).isDirectory()) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".mdx"))
      .map((name) => ({
        file: path.relative(REPO_ROOT, path.join(dir, name)),
        raw: fs.readFileSync(path.join(dir, name), "utf8"),
      }));
  });
}

/** The rules a file declares a dispensation from. */
function waivedRules(raw: string, file: string): string[] {
  const declared = parseEditorialDocument(raw, file).frontmatter.waiver;
  if (!Array.isArray(declared)) return [];
  return (declared as { rule?: string }[]).map((entry) => entry.rule ?? "");
}

test.describe("DS-COPY-048 — the catalogue guard reaches the editorial content", () => {
  test("DS-COPY-048: there is editorial content to sweep", () => {
    // A sweep over an empty directory is green and says nothing. If the section
    // is ever emptied this goes red and whoever emptied it decides on purpose.
    expect(editorialFiles().length).toBeGreaterThan(0);
  });

  for (const { rule, ruler, waivable } of CONTENT_RULES) {
    test(`BR-MONETIZACAO-062 / 061 / 069: no .mdx trips ${rule} without declaring it`, () => {
      const offenders: string[] = [];

      for (const { file, raw } of editorialFiles()) {
        if (waivable && waivedRules(raw, file).includes(rule)) continue;
        raw.split("\n").forEach((line, index) => {
          if (ruler.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        });
      }

      expect(
        offenders,
        waivable
          ? `An article that has to NAME the product may declare \`waiver: [{ rule: ${rule}, reason: … }]\` ` +
              "in its frontmatter. One that is OFFERING it may not — the difference is the declaration, " +
              "not the frequency (DS-COPY-048)."
          : "A price typed into an article is a number the price table does not know about: it survives " +
              "a market it does not belong to and is never formatted by Intl. The amounts come from " +
              "src/lib/pricing.ts and only there (BR-MONETIZACAO-069).",
      ).toEqual([]);
    });
  }

  test("DS-COPY-048: a dispensation that matches nothing in its own file is stale", () => {
    // The other direction, and the one that rots quietly: the sentence that
    // justified the waiver is rewritten, the waiver stays, and the next article
    // inherits a hole nobody granted.
    const stale: string[] = [];

    for (const { file, raw } of editorialFiles()) {
      for (const rule of waivedRules(raw, file)) {
        const known = CONTENT_RULES.find((candidate) => candidate.rule === rule);
        if (!known) {
          stale.push(`${file}: waives "${rule}", which is not a rule this guard has`);
          continue;
        }
        if (!known.waivable) {
          stale.push(`${file}: waives ${rule}, which has no dispensation`);
          continue;
        }
        if (!known.ruler.test(raw)) {
          stale.push(`${file}: waives ${rule} and no line in the file trips it`);
        }
      }
    }

    expect(stale).toEqual([]);
  });
});
