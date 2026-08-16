import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { publishedText } from "./support/published-text";
import { localizedPathname } from "../../src/i18n/pathnames";
import { resolvePricing } from "../../src/lib/pricing";

/**
 * BR-MONETIZACAO-069 — a price is published only where it is a base price we
 *                      set ourselves: BRL, USD and EUR. Everywhere else the
 *                      surface sends the visitor to the store **without a
 *                      number** — no conversion, no estimate, no rounding, no
 *                      "from" price borrowed from another market. No surface of
 *                      ours recomputes a local price by exchange rate.
 * BR-MONETIZACAO-007 — inside the three base markets the published number is a
 *                      reference and has to match what the store charges. A
 *                      site price different from the store price is a defect,
 *                      not a tolerance.
 * BR-MONETIZACAO-048 — the table itself: 10 h, 25 h and 45 h at R$ 9,90 /
 *                      19,90 / 29,90 and 2.99 / 5.99 / 9.99 in USD and EUR.
 *
 * ---------------------------------------------------------------------------
 * What this file is for
 * ---------------------------------------------------------------------------
 *
 * Until 2026-08-16 `src/lib/pricing.ts` held 18 countries and a cascade — exact
 * country → Latin America → the US tier — and thirteen of those amounts had
 * never been checked against either store. Two silent fallbacks fed it: the geo
 * route answered with the United States when Vercel's header was absent, and
 * `useGeoPricing` resolved a failed fetch to the same tier. Both were harmless
 * while #312 held the number back. With the price on the page they turn "I do
 * not know where you are" into a published offer — which binds the supplier
 * (CDC art. 30) and is the exact pattern BR-MONETIZACAO-069 forbids.
 *
 * So the guards below are written in two directions, and the second is the one
 * that matters:
 *
 *   1. In a base market, the three amounts of the rule appear, formatted for
 *      the page locale. The table in this file is written out independently of
 *      `pricing.ts`, so changing a number on either side goes red.
 *   2. **Outside a base market, and on every failure path, no digit of money
 *      reaches the page at all.** Country absent, country unknown, /api/geo
 *      returning 500, the fetch rejecting, a 200 carrying something that is not
 *      the expected shape — each one is asserted, because each one was a
 *      separate way of arriving at 2.99.
 *
 * `publishedText()`, never `page.content()`: next-intl ships every source
 * string of the page inside the RSC payload, so the raw HTML contains
 * `storeNoteWithPrice` no matter which note the section renders.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");
const LOCALES = ["pt", "en", "es", "it"] as const;
const PRICING_SECTION = '[data-section="drive-pricing"]';
const PRICE_SLOT = `${PRICING_SECTION} [data-price-slot]`;

/**
 * The three passes at the three base prices — BR-MONETIZACAO-048, transcribed
 * here on purpose. This is the second copy of the table, and that is the point:
 * a guard that imported the numbers from `pricing.ts` would agree with any
 * value that file happens to hold.
 */
const BASE_MARKETS = {
  BR: { currency: "BRL", amounts: [9.9, 19.9, 29.9] },
  US: { currency: "USD", amounts: [2.99, 5.99, 9.99] },
  EU: { currency: "EUR", amounts: [2.99, 5.99, 9.99] },
} as const;

/** The euro area, ECB (checked 2026-08-16): 21 member states, Bulgaria since
 *  2026-01-01. Every one of them publishes the EUR row above. */
const EURO_AREA = [
  "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR",
  "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
] as const;

/**
 * Territories that must never show a number. The first eight are the ones the
 * old map priced by hand and no one ever checked against a store; UY and AR
 * were priced in USD without being the US; GB, CA and AU are conversions of the
 * store and were called base markets by BR-MONETIZACAO-048 until 2026-08-16;
 * CH, NO, SE, PL and DK are in Europe and do not pay in euros — which is why
 * the euro area is a written list and not a continent.
 */
const NOT_BASE_MARKETS = [
  "MX", "CL", "CO", "PE", "BO", "DO", "CR", "PY",
  "UY", "AR", "GB", "CA", "AU", "CH", "NO", "SE", "PL", "DK",
  "JP", "IN", "ZA", "AE", "TR", "NZ",
] as const;

/** A published amount of money: a currency mark, or a bare decimal with two
 *  places. The hour counts are integers, so "10 horas" cannot trip it. */
const PRICE = /(R\$|US\$|\bUSD\b|\bBRL\b|\bEUR\b|€|£|\$\s?\d)|\b\d+[.,]\d{2}\b/;

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const dotted = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[dotted, value] as [string, string]]
      : flatten(value, dotted);
  });
}

function messageAt(locale: string, dottedKey: string): string {
  const messages = JSON.parse(
    fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"),
  ) as Messages;
  const found = flatten(messages).find(([key]) => key === dottedKey)?.[1];
  expect(found, `${dottedKey} is missing from ${locale}.json`).toBeTruthy();
  return found!;
}

/** Non-breaking and narrow spaces differ between the ICU of Node and the one of
 *  the browser; the amount does not. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function expectedPrice(amount: number, currency: string, locale: string): string {
  return normalize(
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount),
  );
}

const drive = (locale: string) => `/${locale}${localizedPathname(locale, "/drive")}`;

/** Answer /api/geo with a country, before anything on the page asks. */
async function geoAnswers(page: Page, country: string | null): Promise<void> {
  await page.route("**/api/geo", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ country }),
    }),
  );
}

/* ---------------------------------------------------------------------------
 * 1. The table — three zones, and the rest is `null`
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-069 / 048 — the price table is three base markets and nothing else", () => {
  test("BR-MONETIZACAO-048: Brazil, the United States and the euro area carry the table's amounts", () => {
    for (const [country, expected] of [
      ["BR", BASE_MARKETS.BR],
      ["US", BASE_MARKETS.US],
      ...EURO_AREA.map((country) => [country, BASE_MARKETS.EU] as const),
    ] as const) {
      const pricing = resolvePricing(country);
      expect(pricing, `${country} resolves to no price`).not.toBeNull();
      expect(pricing!.currency, `${country} is priced in the wrong currency`).toBe(
        expected.currency,
      );
      expect(
        [pricing!.prices["10h"], pricing!.prices["25h"], pricing!.prices["45h"]],
        `${country} does not charge what BR-MONETIZACAO-048 says it charges`,
      ).toEqual([...expected.amounts]);
    }
  });

  test("BR-MONETIZACAO-069: no other territory has a price, and absence is not an error", () => {
    const offenders = NOT_BASE_MARKETS.filter((country) => resolvePricing(country) !== null);
    expect(
      offenders,
      "A territory outside the three base markets has a number again. The cascade " +
        "'exact country → region → the US tier' is the pattern the rule names and " +
        "forbids: absence is the rule there, not a gap to fill.",
    ).toEqual([]);
  });

  test("BR-MONETIZACAO-069: not knowing the country is never a market", () => {
    for (const unknown of [null, undefined, "", "  ", "XX", "ZZ", "Brazil", "usa", "eur"]) {
      expect(resolvePricing(unknown), `"${unknown}" resolved to a price`).toBeNull();
    }
    // ...and a lower-case header is still Brazil: the guard above must not be
    // green because the lookup is case-sensitive.
    expect(resolvePricing("br")?.currency).toBe("BRL");
    expect(resolvePricing(" it ")?.currency).toBe("EUR");
  });

  test("BR-MONETIZACAO-069: the geo route names no country of its own", () => {
    const source = fs
      .readFileSync(path.join(REPO_ROOT, "src/app/api/geo/route.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    expect(
      source.match(/"[A-Z]{2}"|'[A-Z]{2}'/g) ?? [],
      "The route answered `|| \"US\"` when Vercel's header was absent, and local dev, a " +
        "proxy that strips headers and any request that did not go through the edge all " +
        "took that branch. A country literal in this file is a fallback market.",
    ).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
 * 2. The copy of the two states
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-069 — one sentence for the priced state, one for the rest", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-069: ${locale}.json has both store notes and the slot label`, () => {
      const withPrice = messageAt(locale, "Drive.Pricing.storeNoteWithPrice");
      const noPrice = messageAt(locale, "Drive.Pricing.storeNoteNoPrice");
      const slot = messageAt(locale, "Drive.Pricing.priceInStore");

      // The two notes have to say different things about the same object: one
      // backs the number on the screen, the other explains that the amount
      // belongs to each store's country.
      expect(withPrice, "the two store notes are the same sentence").not.toBe(noPrice);
      for (const note of [withPrice, noPrice, slot]) {
        expect(note, "a store note publishes an amount of its own").not.toMatch(PRICE);
      }
      expect(
        slot.length,
        "the empty-slot label is a sentence, not a label: it has to fit one line at 320 px",
      ).toBeLessThan(30);
    });

    test(`DS-COPY-013: the two store notes in ${locale} are punctuated like a person wrote them`, () => {
      for (const key of ["storeNoteWithPrice", "storeNoteNoPrice"] as const) {
        const note = messageAt(locale, `Drive.Pricing.${key}`);
        const asides = note.match(/[—–;:(]/g) ?? [];
        expect(asides, `${key} in ${locale} carries more than one aside mark`).toHaveLength(0);

        const longest = Math.max(
          ...note.split(/[,;:—–().!?]/).map((chunk) => chunk.trim().length),
        );
        expect(longest, `${key} in ${locale} runs longer than 90 characters without a pause`)
          .toBeLessThanOrEqual(90);
      }
    });
  }
});

/* ---------------------------------------------------------------------------
 * 3. Rendered: the priced state, in the three base markets
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-069 / 007 — a base market publishes the three amounts", () => {
  for (const [country, market] of [
    ["BR", BASE_MARKETS.BR],
    ["US", BASE_MARKETS.US],
    ["IT", BASE_MARKETS.EU],
  ] as const) {
    for (const locale of LOCALES) {
      test(`BR-MONETIZACAO-048: /${locale}/drive from ${country} shows ${market.currency} ${market.amounts.join(" / ")}`, async ({
        page,
      }) => {
        await geoAnswers(page, country);
        const response = await page.goto(drive(locale));
        expect(response?.status()).toBe(200);

        const slots = page.locator(PRICE_SLOT);
        await expect(slots).toHaveCount(3);

        for (const [index, amount] of market.amounts.entries()) {
          const expected = expectedPrice(amount, market.currency, locale);
          await expect
            .poll(
              async () => normalize(await slots.nth(index).innerText()),
              {
                message:
                  `card ${index + 1} does not publish ${expected}. The amount comes from ` +
                  "BR-MONETIZACAO-048 and has to match what the store charges in this " +
                  "base market (BR-MONETIZACAO-007).",
              },
            )
            .toBe(expected);
        }

        // The note that backs the number, not the one that explains its absence.
        const served = await publishedText(page);
        expect(served, "the priced state serves the no-price note").toContain(
          messageAt(locale, "Drive.Pricing.storeNoteWithPrice"),
        );
        expect(served, "the priced state also serves the no-price note").not.toContain(
          messageAt(locale, "Drive.Pricing.storeNoteNoPrice"),
        );
      });
    }
  }

  test("DS-COR-002: the amount uses the same token as the free card, never the brand blue", async ({
    page,
  }) => {
    await geoAnswers(page, "BR");
    await page.goto(drive("pt"));
    const amount = page.locator(`${PRICE_SLOT} span`).first();
    await expect(amount).toHaveText(/9/);

    const colors = await page.evaluate(
      ({ slotSelector, section }) => {
        const price = document.querySelector(`${slotSelector} span`)!;
        // `freePrice` on the Explorar card: the token the price is meant to
        // reuse, measured at 18.72:1 on white. `text-tuggi-primary` is #00a8e8
        // and measures 2.70:1 — it fails SC 1.4.3 and is the mistake this
        // assertion exists to catch.
        // The *last* one: the three amounts share the token and come first in
        // the DOM, so `find` would compare the price against itself and pass
        // whatever colour it had.
        const free = [...document.querySelectorAll(`${section} span`)]
          .filter((node) => node.className.includes("text-xl font-extrabold"))
          .at(-1)!;
        return {
          price: getComputedStyle(price).color,
          free: getComputedStyle(free).color,
          className: price.className,
        };
      },
      { slotSelector: PRICE_SLOT, section: PRICING_SECTION },
    );

    expect(colors.className, "the amount is painted in the brand blue").not.toContain(
      "text-tuggi-primary",
    );
    expect(colors.className).toContain("text-tuggi-dark");
    expect(colors.price, "the amount and the free card's price no longer share a token").toBe(
      colors.free,
    );
  });

  test("the amount sits between the caption and the CTA, in DOM order", async ({ page }) => {
    await geoAnswers(page, "BR");
    await page.goto(drive("pt"));

    const order = await page.evaluate((section) => {
      const card = document.querySelector(`${section} [data-price-slot]`)!.parentElement!;
      return [...card.children].map((node) =>
        node.hasAttribute("data-price-slot") ? "price" : node.tagName.toLowerCase(),
      );
    }, PRICING_SECTION);

    // The hour count stays the big element and the price is second: it is the
    // hour count that tells the three cards apart. Reading order is DOM order.
    expect(order.indexOf("h3")).toBeLessThan(order.indexOf("p"));
    expect(order.indexOf("p")).toBeLessThan(order.indexOf("price"));
    expect(order.indexOf("price")).toBeLessThan(order.length - 1);
  });
});

/* ---------------------------------------------------------------------------
 * 4. Rendered: everywhere else, and every way of failing
 * ------------------------------------------------------------------------- */

/** The ways the page can fail to learn where the visitor is. Each one existed
 *  as a separate path to the US tier before #372. */
const FAILURE_PATHS: [string, (page: Page) => Promise<void>][] = [
  [
    "the header is absent (the local build sends no x-vercel-ip-country)",
    async () => {},
  ],
  ["the country is null", async (page) => geoAnswers(page, null)],
  [
    "/api/geo answers 500",
    async (page) => {
      await page.route("**/api/geo", (route) => route.fulfill({ status: 500, body: "boom" }));
    },
  ],
  [
    "the fetch rejects",
    async (page) => {
      await page.route("**/api/geo", (route) => route.abort("failed"));
    },
  ],
  [
    "the answer is not JSON",
    async (page) => {
      await page.route("**/api/geo", (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "<html>nope</html>" }),
      );
    },
  ],
  [
    "the answer has the wrong shape",
    async (page) => {
      await page.route("**/api/geo", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ country: 55 }),
        }),
      );
    },
  ],
];

async function expectNoNumber(page: Page, locale: string): Promise<void> {
  const label = messageAt(locale, "Drive.Pricing.priceInStore");
  const slots = page.locator(PRICE_SLOT);
  await expect(slots).toHaveCount(3);
  for (const index of [0, 1, 2]) {
    await expect(slots.nth(index)).toHaveText(label);
  }

  const section = await page.locator(PRICING_SECTION).innerText();
  expect(section, "an amount reached a visitor with no base market").not.toMatch(PRICE);

  const served = await publishedText(page);
  expect(served, "the store note claims a price is on the screen").toContain(
    messageAt(locale, "Drive.Pricing.storeNoteNoPrice"),
  );
  expect(served, "both store notes are on the page at once").not.toContain(
    messageAt(locale, "Drive.Pricing.storeNoteWithPrice"),
  );
}

test.describe("BR-MONETIZACAO-069 — no error path ends in a number", () => {
  for (const [name, arrange] of FAILURE_PATHS) {
    test(`BR-MONETIZACAO-069: /en/drive publishes no amount when ${name}`, async ({ page }) => {
      await arrange(page);
      const response = await page.goto(drive("en"));
      expect(response?.status()).toBe(200);
      await expectNoNumber(page, "en");
    });
  }

  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-069: /${locale}/drive publishes no amount outside the base markets`, async ({
      page,
    }) => {
      // One country per family of the old map: a hand-written LatAm price, a
      // store conversion that BR-MONETIZACAO-048 used to call a base market,
      // and a European currency that is not the euro.
      for (const country of ["MX", "GB", "CH"]) {
        await page.unrouteAll();
        await geoAnswers(page, country);
        const response = await page.goto(drive(locale));
        expect(response?.status(), `${country} did not render`).toBe(200);
        await expectNoNumber(page, locale);
      }
    });
  }

  test("WCAG 2.2 SC 4.1.3: the slot announces nothing, because it never waits", async ({
    page,
  }) => {
    await page.goto(drive("pt"));
    // The resting state is the no-price state, so there is no waiting state to
    // communicate and the amount that arrives is content — which Understanding
    // SC 4.1.3 excludes. A live region would announce the same change three
    // times for something the visitor never asked for.
    await expect(page.locator(`${PRICING_SECTION} [aria-live]`)).toHaveCount(0);
    await expect(page.locator(`${PRICING_SECTION} [aria-busy]`)).toHaveCount(0);
  });
});

/* ---------------------------------------------------------------------------
 * 5. The slot is the same height in both states — no shift, no skeleton
 * ------------------------------------------------------------------------- */

/** `offsetHeight`, not `getBoundingClientRect()`: the middle card carries
 *  `lg:scale-105`, so its painted box is 29 px at 1280 in *both* states. The
 *  layout height is what must not move. */
async function slotHeights(page: Page): Promise<number[]> {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].map((node) => (node as HTMLElement).offsetHeight),
    PRICE_SLOT,
  );
}

test.describe("the price slot reserves the same 28 px in both states", () => {
  for (const width of [320, 390, 1280]) {
    for (const locale of LOCALES) {
      test(`BR-MONETIZACAO-069: /${locale}/drive keeps the slot at 28 px at ${width} px, priced or not`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });

        // State B first: it is what the server renders and what a visitor with
        // JS off keeps forever.
        await geoAnswers(page, "MX");
        await page.goto(drive(locale));
        await expect(page.locator(PRICE_SLOT).first()).toHaveText(
          messageAt(locale, "Drive.Pricing.priceInStore"),
        );
        const resting = await slotHeights(page);

        await page.unrouteAll();
        await geoAnswers(page, "BR");
        await page.goto(drive(locale));
        await expect(page.locator(PRICE_SLOT).first()).toHaveText(/9/);
        const priced = await slotHeights(page);

        expect(resting, "the section stopped rendering three slots").toHaveLength(3);
        expect(
          priced,
          "the slot changes height when the amount arrives — that is the layout shift the " +
            "reserved box exists to prevent",
        ).toEqual(resting);
        expect(
          resting,
          "the reserved height is no longer 28 px, so `priceInStore` wraps in some locale " +
            "or the amount is a different size than the design measured",
        ).toEqual([28, 28, 28]);

        const doc = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(doc.scrollWidth, "the page scrolls horizontally at this width").toBe(
          doc.innerWidth,
        );
      });
    }
  }
});
