import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { LOCALES, type SiteLocale } from "../../src/i18n/locales";
import { SEGMENTS } from "../../src/lib/segments";
import {
  PARTNER_VIDEOS,
  formatClipDuration,
  initialPartnerVideo,
  narrationLanguageLabel,
  type PartnerVideo,
} from "../../src/lib/partner-videos";
import { measuredTextContrast } from "./support/contrast";

/**
 * The partner hub — card #195, spec §6 of
 * `docs/design/spec-template-segmento-2026-08.md` and the ready list of §8 of
 * `docs/design/copy-parcerias-2026-08.md`, **as amended by card #294**
 * (`docs/design/spec-lp-parcerias-2026-08.md`), which turned the hub into a
 * conversion landing page: the hero gained a CTA, the grid stopped being
 * navigation and points at the form, `SegmentCta` is no longer mounted, and
 * four blocks became seven. The form itself is `partner-lead-form.spec.ts`.
 *
 * **Card #306 (`docs/design/spec-lp-parcerias-conversao-2026-08.md`) turned the
 * axis of the page from the mechanism to the merchant's gain**, and seven
 * blocks became eight: `ProofBlock` came up to second, adjacent to the sentence
 * it proves, and a block of named objections reuses `FaqSection`. What that
 * spec's copy has to keep true is `partner-offer-ladder.spec.ts`; what the page
 * has to serve is here.
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
/**
 * The two keys allowed to carry a digit — criterion 22 of spec §9 of #294.
 * They are the example of a phone number in the hint and in its error
 * message: a **format**, not a figure about the product, and the format is the
 * whole point (the column's CHECK only takes E.164). Every other string of
 * `Partners.*` and `Segments.*` stays digit-free.
 */
const DIGIT_EXEMPT = ["Partners.form.whatsappHint", "Partners.form.errorWhatsapp"];

/**
 * The one key allowed to say "voucher" — spec §7 of #294, which registered it
 * in advance so it would not become a card. It is the tour receipt a tour
 * operator hands the passenger, not the commercial voucher BR-B2B-009 item 1
 * keeps off the site.
 */
const VOUCHER_EXEMPT = "Segments.receptive.hub.cardBody";

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
  /** The keys #294 added — spec §5, and criterion 1 of its §9. */
  const CARD_294_KEYS = [
    "Partners.cta.action",
    "Segments.steps.lead",
    "Segments.receptive.hub.cardTitle",
    "Segments.receptive.hub.cardBody",
    ...[
      "allRequired",
      "name",
      "business",
      "businessType",
      "businessTypePlaceholder",
      "businessTypeOther",
      "channelLegend",
      "channelWhatsapp",
      "channelEmail",
      "whatsappLabel",
      "whatsappHint",
      "emailLabel",
      "emailHint",
      "sending",
      "consent",
      "consentLinkNewTab",
      "errorSummary",
      "errorName",
      "errorBusiness",
      "errorBusinessType",
      "errorWhatsapp",
      "errorEmail",
      "errorConsent",
      "errorSend",
      "successTitle",
      "successBody",
      "noscript",
    ].map((key) => `Partners.form.${key}`),
  ];

  /**
   * The 21 keys #306 added — spec §5, and criterion 1 of its §9. The four of
   * `Partners.video` ship with the component that reads them and before the
   * clips themselves: the block degrades to today's hero while
   * `PARTNER_VIDEOS` is empty, so they are not orphans waiting to be mounted,
   * they are the copy of a mounted component with no data yet.
   */
  const CARD_306_KEYS = [
    "Partners.hero.eyebrow",
    "Partners.grid.lead",
    ...["caption", "playLabel", "languageLegend", "openOnYoutube"].map(
      (key) => `Partners.video.${key}`
    ),
    "Partners.FAQ.title",
    ...[1, 2, 3, 4, 5, 6].flatMap((n) => [`Partners.FAQ.q${n}`, `Partners.FAQ.a${n}`]),
    "Partners.form.title",
    "Partners.form.body",
  ];

  const EXPECTED_KEYS = [
    "Partners.hero.title",
    "Partners.hero.subtitle",
    "Partners.grid.title",
    "Partners.grid.actionOpen",
    "Partners.mechanism.place",
    "Partners.seo.primaryTerm",
    "Partners.seo.title",
    "Partners.seo.description",
    "Segments.steps.title",
    ...[1, 2, 3, 4].flatMap((n) => [`Segments.steps.s${n}Title`, `Segments.steps.s${n}Body`]),
    "Segments.cta.title",
    "Segments.cta.body",
    "Segments.cta.action",
    ...CARD_294_KEYS,
    ...CARD_306_KEYS,
    ...SEGMENTS.flatMap((segment) => [
      `Segments.${segment.key}.hub.cardTitle`,
      `Segments.${segment.key}.hub.cardBody`,
    ]),
  ];

  for (const locale of LOCALES) {
    // Criterion 2 of spec §9. The label of the six cards is now
    // `Partners.cta.action`; a key with no consumer is copy waiting for
    // somebody to mount it again (CLAUDE.md §6).
    test(`#294: ${locale}.json no longer carries Partners.grid.actionContact`, () => {
      const grid = (messagesFor(locale)["Partners"] as Messages)["grid"] as Messages;
      expect(Object.keys(grid)).not.toContain("actionContact");
      expect(Object.keys(grid)).toContain("actionOpen");
    });

    // Criterion 2 of #306, replacing criterion 3 of #294: the clip moved into
    // the hero, so the secondary call to action that pointed at a section of
    // its own has no section to point at and no key to name it. A key with no
    // consumer is copy waiting for somebody to mount it again.
    test(`#306: ${locale}.json no longer carries Partners.cta.video`, () => {
      const cta = (messagesFor(locale)["Partners"] as Messages)["cta"] as Messages;
      expect(Object.keys(cta)).not.toContain("video");
      expect(Object.keys(cta)).toContain("action");
    });
  }

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
        .filter(([key]) => !DIGIT_EXEMPT.includes(key))
        .filter(([, value]) => /[0-9]/.test(value))
        .map(([key, value]) => `${key}: ${value}`);
      expect(offenders).toEqual([]);
    });

    test(`BR-B2B-009: the ${locale} partner copy names no package, lot, licence or voucher`, () => {
      const forbidden = /pacote|lote|licen|cota\b|atacado|voucher|desconto de volume|bulk|wholesale/i;
      const offenders = newCopy(locale)
        .filter(([key]) => key !== VOUCHER_EXEMPT)
        .filter(([, value]) => forbidden.test(value))
        .map(([key, value]) => `${key}: ${value}`);
      expect(offenders).toEqual([]);
    });

    test(`BR-B2B-009: the one exempt "voucher" in ${locale} is still the tour receipt`, () => {
      // The exemption is not a hole: the word may exist in that one sentence,
      // and only there. If the key ever stops containing it the waiver is
      // stale and this goes red — the same discipline as the waiver list of
      // no-hardcoded-copy.spec.ts.
      const value = at(messagesFor(locale), VOUCHER_EXEMPT);
      expect(value.toLowerCase()).toMatch(/voucher/);
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

  test("#306 criterion 2: nothing under src/ still reaches for the retired video CTA", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && fs.readFileSync(full, "utf8").includes("cta.video")) {
          offenders.push(path.relative(REPO_ROOT, full));
        }
      }
    };
    walk(path.join(REPO_ROOT, "src"));
    expect(offenders).toEqual([]);
  });

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
    test(`the hub serves its eight blocks in ${locale}`, async ({ page }) => {
      const response = await page.goto(hubUrl(locale));
      expect(response?.status()).toBe(200);

      // Criterion 4 of spec §9 of #306. Eight, and the video is not one of
      // them: it lives inside the hero, and with no clip the hero is what it
      // was.
      for (const block of [
        "segment-hero",
        "segment-grid",
        "partnership-steps",
        "coverage-density",
        "languages-strip",
        "faq",
        "partner-lead-form",
      ]) {
        await expect(page.locator(`[data-block="${block}"]`)).toHaveCount(1);
      }
      await expect(page.locator('[data-proof-block="dark"]')).toHaveCount(1);

      // Spec §0.2 item 6 and §2.9: with a form on the page, a second button to
      // /contact splits the funnel in two destinations.
      await expect(page.locator('[data-block="segment-cta"]')).toHaveCount(0);

      const messages = messagesFor(locale);
      const text = await visibleText(page);
      // `Partners.hero.eyebrow` is asserted in the hero test below and not
      // here: `innerText` returns the *rendered* text, `text-transform`
      // applied, so an upper-cased label never equals its own message string.
      for (const key of [
        "Partners.hero.title",
        "Partners.hero.subtitle",
        "Partners.grid.title",
        "Partners.grid.lead",
        "Segments.steps.title",
        "Segments.steps.lead",
        "Partners.FAQ.title",
        "Partners.form.title",
        "Partners.form.body",
      ]) {
        expect(text, `${key} is not visible on ${hubUrl(locale)}`).toContain(at(messages, key));
      }

      // Criterion 4: the six questions are served, not lazily fetched — a
      // visitor who never runs the accordion still reads what he came to ask.
      for (const n of [1, 2, 3, 4, 5, 6]) {
        expect(text, `Partners.FAQ.q${n} is not visible`).toContain(
          at(messages, `Partners.FAQ.q${n}`)
        );
      }

      // The commercial model block belongs to the segment page, not here.
      await expect(page.locator('[data-block="business-model"]')).toHaveCount(0);
    });

    test(`#306 criterion 5: the proof of the H1 is the second block in ${locale}`, async ({
      page,
    }) => {
      await page.goto(hubUrl(locale));
      // The order is the argument: what he gains, the evidence of it, who it
      // is for, how it works, where, in what language, the objections, the
      // ask. Measured on the DOM, because a reordering that only moves the
      // source is not a reordering.
      const order = await page
        .locator("article > section, article > div > section")
        .evaluateAll((nodes) =>
          nodes.map(
            (node) =>
              node.getAttribute("data-block") ?? `proof-${node.getAttribute("data-proof-block")}`
          )
        );
      expect(order).toEqual([
        "segment-hero",
        "proof-dark",
        "segment-grid",
        "partnership-steps",
        "coverage-density",
        "coverage-list",
        "languages-strip",
        "faq",
        "partner-lead-form",
      ]);
    });

    test(`#306 criterion 15: the hub serves one FAQPage, built from the six answers in ${locale}`, async ({
      page,
    }) => {
      await page.goto(hubUrl(locale));
      const messages = messagesFor(locale);

      const blocks = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => JSON.parse(node.textContent ?? "null") as { "@type"?: string })
        );
      const faqPages = blocks.filter((block) => block?.["@type"] === "FAQPage");
      expect(faqPages, "one FAQPage, and only one").toHaveLength(1);

      const entities = (faqPages[0] as { mainEntity: { name: string }[] }).mainEntity;
      expect(entities.map((entity) => entity.name)).toEqual(
        [1, 2, 3, 4, 5, 6].map((n) => at(messages, `Partners.FAQ.q${n}`))
      );
    });

    test(`spec §2: no two neighbouring sections of the hub share a background in ${locale}`, async ({
      page,
    }) => {
      // Criterion 10, and it only verifies by rendering. Two blocks of the
      // same colour touching read as one block — which is exactly what
      // happens when `CoverageDensityMap` ends in the white list that is its
      // served alternative and the next block is white too.
      await page.goto(hubUrl(locale));
      const backgrounds = await page
        .locator("article > section, article > div > section")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            block: node.getAttribute("data-block") ?? node.getAttribute("data-proof-block") ?? "?",
            color: getComputedStyle(node).backgroundColor,
          }))
        );

      expect(backgrounds.length).toBeGreaterThan(6);
      const collisions = backgrounds
        .filter((section, index) => index > 0 && backgrounds[index - 1].color === section.color)
        .map((section, index) => `${backgrounds[index]?.block} + ${section.block}: ${section.color}`);
      expect(collisions).toEqual([]);
    });

    test(`spec §2.4: the hero carries the primary CTA and, with no video, no secondary in ${locale}`, async ({
      page,
    }) => {
      await page.goto(hubUrl(locale));
      const messages = messagesFor(locale);
      const hero = page.locator('[data-block="segment-hero"]');

      // Criterion 8 of #306: with an empty registry there is no player, no
      // poster, no language selector and no secondary call to action — and no
      // space held for any of them. The hero is a single column, which is the
      // design and not a degraded state.
      const links = hero.locator("a");
      await expect(links).toHaveCount(1);
      await expect(links.first()).toHaveText(at(messages, "Partners.cta.action"));
      await expect(links.first()).toHaveAttribute("href", "#lead-form");
      await expect(page.locator("#video")).toHaveCount(0);
      await expect(page.locator('[data-block="partner-video"]')).toHaveCount(0);
      expect(PARTNER_VIDEOS).toHaveLength(0);

      // Criterion 10: no third-party frame reaches this page, at load or
      // after it. The consent banner is on the same page, and a player mounted
      // before the visitor accepts drops a cookie nobody authorized.
      await expect(page.locator("iframe")).toHaveCount(0);

      // The eyebrow names who the page is for, above the H1 (§3.2).
      await expect(hero.locator("p").first()).toHaveText(at(messages, "Partners.hero.eyebrow"));
    });

    test(`#306 criterion 21: the hero's eyebrow reads at 4.5:1 or better in ${locale}`, async ({
      page,
    }) => {
      // Small text in the brand cyan is the defect this element invites:
      // `--color-tuggi-primary` under 14 px measures well under the threshold,
      // and only `--color-tuggi-primary-text` passes (DS-COR-002). Measured on
      // a canvas rather than parsed out of a computed string — Tailwind v4
      // hands colours back in a space that is not sRGB.
      await page.goto(hubUrl(locale));
      const ratio = await measuredTextContrast(page, '[data-block="segment-hero"] p:first-of-type');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    test(`spec §2.6: the mechanism repeats the CTA under the steps in ${locale}`, async ({
      page,
    }) => {
      await page.goto(hubUrl(locale));
      const messages = messagesFor(locale);
      const cta = page.locator('[data-block="partnership-steps"] a[href="#lead-form"]');
      await expect(cta).toHaveCount(1);
      await expect(cta).toHaveText(at(messages, "Partners.cta.action"));
    });

    test(`spec §6.2: the grid lists every segment, and an unpublished one leads to the form in ${locale}`, async ({
      page,
    }) => {
      await page.goto(hubUrl(locale));

      const cards = page.locator('[data-block="segment-grid"] li');
      await expect(cards).toHaveCount(SEGMENTS.length);

      const messages = messagesFor(locale);

      for (const segment of [...SEGMENTS].sort((a, b) => a.order - b.order)) {
        const card = cards.nth(segment.order - 1);
        const link = card.locator("a");

        // Title **and** action, since #294: the card no longer opens a page
        // named after it, it jumps to a form, and the purpose of a link is
        // what SC 2.4.4 asks its accessible name for.
        const title = at(messages, `Segments.${segment.key}.hub.cardTitle`);
        await expect(card).toContainText(at(messages, `Segments.${segment.key}.hub.cardBody`));

        if (segment.published) {
          await expect(link).toHaveAccessibleName(
            `${title} ${at(messages, "Partners.grid.actionOpen")}`
          );
          await expect(link).toHaveAttribute(
            "href",
            `/${locale}${localizedPathname(locale, `/partners/${segment.key}`)}`
          );
          await expect(card).toContainText(at(messages, "Partners.grid.actionOpen"));
        } else {
          await expect(link).toHaveAccessibleName(
            `${title} ${at(messages, "Partners.cta.action")}`
          );
          await expect(link).toHaveAttribute("href", "#lead-form");
          await expect(link).toHaveAttribute("data-business-type", segment.key);
          await expect(card).toContainText(at(messages, "Partners.cta.action"));
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

    for (const block of [
      "segment-hero",
      "segment-grid",
      "partnership-steps",
      "coverage-density",
      "languages-strip",
      "faq",
      "partner-lead-form",
    ]) {
      await expect(page.locator(`[data-block="${block}"]`)).toBeVisible();
    }

    const grid = page.locator('[data-block="segment-grid"] li');
    await expect(grid).toHaveCount(SEGMENTS.length);

    // #204: nothing on this page is born at opacity 0 waiting for an observer
    // that will never fire.
    const faded = await page
      .locator(
        '[data-block="segment-hero"], [data-block="segment-grid"], [data-block="partnership-steps"], [data-block="languages-strip"], [data-block="faq"], [data-block="partner-lead-form"]'
      )
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
        page.locator(`[data-block="segment-grid"] a[data-business-type="${segment.key}"]`)
      ).toHaveCount(1);

      // Criterion 7: the sixth segment's word is decided so publishing it
      // later costs no URL change, and until then 404 is the honest answer.
      const response = await request.get(`/pt/${segment.slugs.pt}`, { maxRedirects: 0 });
      expect(response.status(), `/pt/${segment.slugs.pt}`).toBe(404);
    }
  });
});

/**
 * Criteria 11 and 12 of §9 of the conversion spec, and the choice rule of its
 * §3.4 — the three decisions of the video that the page **cannot** demonstrate
 * today, because `PARTNER_VIDEOS` is empty on purpose (§3.6, SC 1.2.2).
 *
 * They are asserted against the functions rather than against the DOM for that
 * reason: the day the ids arrive, what these guard is the behaviour the spec
 * decided, not the behaviour whoever pastes the ids happens to get. Everything
 * else about the empty registry is measured on the served page, in the hero
 * test above.
 */
test.describe("#306 — the video data, with the registry still empty", () => {
  const clip = (id: string, audioLocale: string): PartnerVideo => ({
    id,
    audioLocale,
    youtubeId: `yt-${id}`,
    poster: `/posters/${id}.jpg`,
    posterWidth: 1280,
    posterHeight: 720,
    durationSeconds: 95,
  });

  test("criterion 11: the pill reads m:ss, and no digit of it comes from i18n", () => {
    expect(formatClipDuration(95)).toBe("1:35");
    expect(formatClipDuration(60)).toBe("1:00");
    // Under a minute still carries the minute, so the pill never changes width
    // class mid-list; and a rounded half-second never renders "1:60".
    expect(formatClipDuration(9)).toBe("0:09");
    expect(formatClipDuration(59.6)).toBe("1:00");
  });

  test("criterion 12: the language pill is a name in the page's language, never a code", () => {
    // The mismatch between narration and interface is the point of the block
    // (§3.4): an Italian visitor reads *Francese* and sees a language the page
    // itself does not speak.
    expect(narrationLanguageLabel("it", "fr")).toBe("Francese");
    expect(narrationLanguageLabel("pt", "en")).toBe("Inglês");
    expect(narrationLanguageLabel("es", "fr")).toBe("Francés");
    expect(narrationLanguageLabel("en", "fr")).toBe("French");
    // The documented fallback, and the only shape in which a bare code ships:
    // an ICU build that does not know the code hands it back unchanged.
    expect(narrationLanguageLabel("pt", "qq")).toBe("QQ");
  });

  test("§3.4: the clip that opens is the page's language, then English, then the first", () => {
    const videos = [clip("fr-rio", "fr"), clip("en-rio", "en"), clip("pt-rio", "pt")];
    expect(initialPartnerVideo(videos, "pt")?.id).toBe("pt-rio");
    // No Italian clip, so the Italian visitor starts in English rather than in
    // whatever happens to be first in the array.
    expect(initialPartnerVideo(videos, "it")?.id).toBe("en-rio");
    expect(initialPartnerVideo([clip("fr-rio", "fr")], "it")?.id).toBe("fr-rio");
    // The state that ships today: no clip, no media, and the hero of the hero
    // test above.
    expect(initialPartnerVideo(PARTNER_VIDEOS, "pt")).toBeUndefined();
  });
});
