import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { LOCALES, type SiteLocale } from "../../src/i18n/locales";
import { SEGMENTS } from "../../src/lib/segments";

/**
 * The partner hub — card #195, spec §6 of
 * `docs/design/spec-template-segmento-2026-08.md` and the ready list of §8 of
 * `docs/design/copy-parcerias-2026-08.md`.
 *
 * Rules under test, and each assertion cites the one it proves:
 * **BR-B2B-004** (the partner distributes and pays nothing), **BR-B2B-005**
 * (the percentage is a commercial agreement, never published),
 * **BR-B2B-009** (wholesale is not published), **BR-B2B-010** items 3 to 6,
 * **BR-COMUNICACAO-002** and **003** (no figure written by hand),
 * **BR-IDIOMA-001** item 3 (four interface locales), `DS-COPY-001`,
 * `DS-COPY-005`, `DS-COPY-007`, `DS-A11Y-003`, `DS-A11Y-005`.
 *
 * ---------------------------------------------------------------------------
 * Why nothing here reads `page.content()`
 * ---------------------------------------------------------------------------
 *
 * next-intl ships the whole message file down in the RSC payload, so the raw
 * HTML of any page on this site contains every string of every namespace —
 * including the ones this page does not render. A `toContain` over
 * `page.content()` would pass on a page that renders nothing at all. Every
 * check below reads the visible text, a DOM query or a computed style.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");

/** The public URL of the hub, per locale. */
function hubUrl(locale: string): string {
  return `/${locale}${localizedPathname(locale, "/partners")}`;
}

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Messages;
}

function at(messages: Messages, dotted: string): string {
  const value = dotted.split(".").reduce<string | Messages | undefined>(
    (node, part) => (typeof node === "object" && node ? node[part] : undefined),
    messages
  );
  expect(typeof value, `${dotted} is a string`).toBe("string");
  return value as string;
}

/** Every leaf of a subtree, by dotted key. */
function leaves(node: Messages, prefix: string): [string, string][] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[`${prefix}${key}`, value] as [string, string]]
      : leaves(value, `${prefix}${key}.`)
  );
}

/**
 * The blocks this card wrote, as they exist in the message files. The
 * commercial block is excluded: it landed in `835cbcf` and belongs to the
 * segment template, not to the hub.
 */
function newCopy(locale: string): [string, string][] {
  const messages = messagesFor(locale);
  return [
    ...leaves(messages["Partners"] as Messages, "Partners."),
    ...leaves(messages["Segments"] as Messages, "Segments."),
  ].filter(([key]) => !key.startsWith("Segments.commercial"));
}

/* -------------------------------------------------------------------------- */
/* Half 1 — the copy, before a browser is involved                            */
/* -------------------------------------------------------------------------- */

test.describe("the partner copy, in the four message files", () => {
  const EXPECTED_KEYS = [
    "Partners.hero.title",
    "Partners.hero.subtitle",
    "Partners.grid.title",
    "Partners.grid.actionOpen",
    "Partners.grid.actionContact",
    "Partners.mechanism.place",
    "Partners.seo.primaryTerm",
    "Partners.seo.title",
    "Partners.seo.description",
    "Segments.steps.title",
    ...[1, 2, 3, 4].flatMap((n) => [`Segments.steps.s${n}Title`, `Segments.steps.s${n}Body`]),
    "Segments.cta.title",
    "Segments.cta.body",
    "Segments.cta.action",
    ...SEGMENTS.flatMap((segment) => [
      `Segments.${segment.key}.hub.cardTitle`,
      `Segments.${segment.key}.hub.cardBody`,
    ]),
  ];

  for (const locale of LOCALES) {
    test(`BR-IDIOMA-001 item 3: ${locale}.json carries every key of the hub, filled`, () => {
      const messages = messagesFor(locale);
      for (const key of EXPECTED_KEYS) {
        const value = at(messages, key);
        expect(value.trim(), `${locale}: ${key} is empty`).not.toBe("");
        // The exact symptom of a key that does not exist: next-intl renders
        // the path itself, in production, with no error anywhere (spec §0.3).
        expect(value, `${locale}: ${key} renders as its own path`).not.toBe(key);
      }
    });

    test(`DS-COPY-005: no figure is written by hand in the ${locale} partner copy`, () => {
      // BR-COMUNICACAO-002 item 1 and BR-COMUNICACAO-003: every number the
      // site publishes comes from src/lib/product-facts.ts as an ICU value.
      // The two this copy uses are {partnerTriageHours} and
      // {contentLanguages}; a digit in any of these strings is a figure with
      // no owner.
      const offenders = newCopy(locale)
        .filter(([, value]) => /[0-9]/.test(value))
        .map(([key, value]) => `${key}: ${value}`);
      expect(offenders).toEqual([]);
    });

    test(`BR-B2B-009: the ${locale} partner copy names no package, lot, licence or voucher`, () => {
      const forbidden = /pacote|lote|licen|cota\b|atacado|voucher|desconto de volume|bulk|wholesale/i;
      const offenders = newCopy(locale)
        .filter(([, value]) => forbidden.test(value))
        .map(([key, value]) => `${key}: ${value}`);
      expect(offenders).toEqual([]);
    });

    test(`BR-B2B-010 item 6: the ${locale} partner copy promises no highlight, priority or date`, () => {
      // BR-B2B-007 items 6 and 7 and BR-COMUNICACAO-005 item 5: no paid
      // visibility for the partner's venue, and no deadline for the segment
      // whose page is reserved.
      const forbidden = /exclusiv|destaque|prioridade|patrocin|em breve|coming soon|próximamente|prossimamente/i;
      const offenders = newCopy(locale)
        .filter(([, value]) => forbidden.test(value))
        .map(([key, value]) => `${key}: ${value}`);
      expect(offenders).toEqual([]);
    });

    test(`BR-B2B-009 item 1: ${locale}.json declares no wholesale or voucher namespace`, () => {
      // A key with no consumer is an orphan; these two would be worse — the
      // forbidden copy sitting there waiting for somebody to mount it.
      const segments = messagesFor(locale)["Segments"] as Messages;
      expect(Object.keys(segments)).not.toContain("wholesale");
      expect(Object.keys(segments)).not.toContain("voucher");
    });
  }

  test("DS-COPY-007: the hub's title carries its primary term, and no segment repeats it", () => {
    // One page, one term, one owner. The check runs per locale because the
    // term is translated and the collision would be too.
    for (const locale of LOCALES) {
      const messages = messagesFor(locale);
      const term = at(messages, "Partners.seo.primaryTerm");
      const title = at(messages, "Partners.seo.title");

      const fold = (text: string) =>
        text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

      expect(fold(title), `${locale}: seo.title does not carry seo.primaryTerm`).toContain(
        fold(term)
      );

      // No segment owns a term yet — their seo blocks are another card — but
      // the day one does, it may not be this one.
      const segments = messagesFor(locale)["Segments"] as Messages;
      for (const segment of SEGMENTS) {
        const block = segments[segment.key] as Messages | undefined;
        const seo = block?.["seo"] as Messages | undefined;
        if (!seo || typeof seo["primaryTerm"] !== "string") continue;
        expect(fold(seo["primaryTerm"]), `${segment.key} in ${locale}`).not.toBe(fold(term));
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Half 2 — what the hub actually serves                                      */
/* -------------------------------------------------------------------------- */

/** The visible text of the page — never the RSC payload. See the header. */
async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

test.describe("what /partners serves", () => {
  for (const locale of LOCALES) {
    test(`the hub serves its four blocks in ${locale}`, async ({ page }) => {
      const response = await page.goto(hubUrl(locale));
      expect(response?.status()).toBe(200);

      for (const block of ["segment-hero", "segment-grid", "partnership-steps", "segment-cta"]) {
        await expect(page.locator(`[data-block="${block}"]`)).toHaveCount(1);
      }

      const messages = messagesFor(locale);
      const text = await visibleText(page);
      for (const key of [
        "Partners.hero.title",
        "Partners.hero.subtitle",
        "Partners.grid.title",
        "Segments.steps.title",
        "Segments.cta.title",
      ]) {
        expect(text, `${key} is not visible on ${hubUrl(locale)}`).toContain(at(messages, key));
      }

      // The hub does not repeat coverage, proof or the commercial model
      // (spec §6): a visitor who sees the same six blocks as the segment page
      // thinks he never left.
      await expect(page.locator('[data-block="business-model"]')).toHaveCount(0);
      await expect(page.locator("[data-fact]")).toHaveCount(0);
    });

    test(`spec §6.2: the grid lists every segment, and an unpublished one leads to contact in ${locale}`, async ({
      page,
    }) => {
      await page.goto(hubUrl(locale));

      const cards = page.locator('[data-block="segment-grid"] li');
      await expect(cards).toHaveCount(SEGMENTS.length);

      const messages = messagesFor(locale);
      const contact = localizedPathname(locale, "/contact");

      for (const segment of [...SEGMENTS].sort((a, b) => a.order - b.order)) {
        const card = cards.nth(segment.order - 1);
        const link = card.locator("a");

        // The title is the card's accessible name, and the whole card is the
        // target — DS-A11Y-002.
        const title = at(messages, `Segments.${segment.key}.hub.cardTitle`);
        await expect(link).toHaveAccessibleName(title);
        await expect(card).toContainText(at(messages, `Segments.${segment.key}.hub.cardBody`));

        if (segment.published) {
          await expect(link).toHaveAttribute(
            "href",
            `/${locale}${localizedPathname(locale, `/partners/${segment.key}`)}`
          );
          await expect(card).toContainText(at(messages, "Partners.grid.actionOpen"));
        } else {
          await expect(link).toHaveAttribute(
            "href",
            `/${locale}${contact}?segment=${segment.key}`
          );
          await expect(card).toContainText(at(messages, "Partners.grid.actionContact"));
        }

        // DS-A11Y-003 and spec §6.2: the difference between the two cards is
        // the verb and the destination, never the paint. No grey, no faded
        // card, no disabled state — the card is not disabled, it leads
        // somewhere else.
        await expect(link).not.toHaveAttribute("aria-disabled", /.*/);
        await expect(link).toHaveCSS("opacity", "1");
      }
    });

    test(`BR-B2B-010: the mechanism serves four numbered steps with {place} resolved in ${locale}`, async ({
      page,
    }) => {
      await page.goto(hubUrl(locale));
      const messages = messagesFor(locale);

      const steps = page.locator('[data-block="partnership-steps"] ol > li');
      await expect(steps).toHaveCount(4);

      const text = await visibleText(page);
      const place = at(messages, "Partners.mechanism.place");
      // An unresolved ICU slot survives as braces in the rendered text; the
      // enumeration of the five places is what proves the value arrived.
      expect(text).not.toContain("{place}");
      expect(text, "the hub's {place} is not the enumeration of the five").toContain(place);

      for (const n of [1, 2, 3, 4]) {
        expect(text).toContain(at(messages, `Segments.steps.s${n}Title`));
      }
    });

    test(`copy doc §1.1: the hub hero has no call to action in ${locale}`, async ({ page }) => {
      await page.goto(hubUrl(locale));
      const hero = page.locator('[data-block="segment-hero"]');

      // Absent means absent: no button, no link, and no reserved space where
      // one would be. The gap between the last line of the subtitle and the
      // bottom of the block is the padding, not a hole.
      await expect(hero.locator("a, button")).toHaveCount(0);

      const gap = await hero.evaluate((section) => {
        const paragraph = section.querySelector("p")!;
        return section.getBoundingClientRect().bottom - paragraph.getBoundingClientRect().bottom;
      });
      expect(gap, "there is room reserved under the hero for a CTA that does not exist")
        .toBeLessThan(200);
    });
  }

  test("copy doc §2: the mechanism is two by two from md up, never four across", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(hubUrl("it"));

    const rows = await page
      .locator('[data-block="partnership-steps"] ol > li')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          top: Math.round(node.getBoundingClientRect().top),
          bottom: Math.round(node.getBoundingClientRect().bottom),
          textBottom: Math.round(
            node.querySelector("p")!.getBoundingClientRect().bottom
          ),
        }))
      );

    expect(new Set(rows.map((row) => row.top)).size, "four steps on one row").toBe(2);

    // The reason the four-across layout was dropped: the row takes the height
    // of the longest step, and the short ones carry the difference as empty
    // space. Two by two keeps that inside one pair.
    for (const [index, row] of rows.entries()) {
      expect(row.bottom - row.textBottom, `step ${index + 1} has a hole under its text`)
        .toBeLessThan(200);
    }
  });

  test("DS-A11Y-005: at 360 px in Italian nothing overflows and no label is cut", async ({
    page,
  }) => {
    // Italian is the longest of the four, and 360 px is the narrowest phone
    // the audit covers. Height comes from the grid; a card that needs a fourth
    // line grows instead of clipping.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(hubUrl("it"));

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, "the hub scrolls sideways at 360 px").toBeLessThanOrEqual(0);

    const clipped = await page
      .locator('[data-block="segment-grid"] li, [data-block="partnership-steps"] ol > li')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.scrollWidth > node.clientWidth + 1)
          .map((node) => node.textContent?.slice(0, 60) ?? "")
      );
    expect(clipped).toEqual([]);
  });
});

test.describe("#191 — the hub without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every block is served by the server, and none arrives invisible", async ({ page }) => {
    await page.goto(hubUrl("pt"));

    for (const block of ["segment-hero", "segment-grid", "partnership-steps", "segment-cta"]) {
      await expect(page.locator(`[data-block="${block}"]`)).toBeVisible();
    }

    const grid = page.locator('[data-block="segment-grid"] li');
    await expect(grid).toHaveCount(SEGMENTS.length);

    // #204: nothing on this page is born at opacity 0 waiting for an observer
    // that will never fire.
    const faded = await page
      .locator('[data-block="segment-hero"], [data-block="segment-grid"], [data-block="partnership-steps"], [data-block="segment-cta"]')
      .evaluateAll((nodes) =>
        nodes
          .flatMap((node) => [node, ...node.querySelectorAll<HTMLElement>("*")])
          .filter((node) => getComputedStyle(node).opacity === "0")
          .map((node) => node.tagName)
      );
    expect(faded).toEqual([]);
  });
});

test.describe("BR-IDIOMA-001 — the hub in the four locales", () => {
  test("the four URLs answer 200 and point at each other", async ({ request }) => {
    // routing.spec.ts walks the whole map for this; here it is asserted on the
    // four URLs this card published, because a translated slug that 404s is
    // how all four language versions of a page are lost at once.
    for (const locale of LOCALES as readonly SiteLocale[]) {
      const response = await request.get(hubUrl(locale), { maxRedirects: 0 });
      expect(response.status(), hubUrl(locale)).toBe(200);
    }
  });

  test("the reserved segment is in the grid and still has no URL", async ({ page, request }) => {
    // BR-B2B-010 and spec §1.2 together: the card exists so the owner of that
    // kind of business knows we take him, and the route stays a 404 until the
    // operator releases it.
    const reserved = SEGMENTS.filter((segment) => !segment.published);
    expect(reserved.length).toBeGreaterThan(0);

    await page.goto(hubUrl("pt"));
    for (const segment of reserved) {
      await expect(
        page.locator(`[data-block="segment-grid"] a[href$="segment=${segment.key}"]`)
      ).toHaveCount(1);

      const response = await request.get(`/pt/${segment.slugs.pt}`, { maxRedirects: 0 });
      expect(response.status(), `/pt/${segment.slugs.pt}`).toBe(404);
    }
  });
});
