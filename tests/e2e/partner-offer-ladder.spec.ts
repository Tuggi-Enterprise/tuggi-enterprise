import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { LOCALES } from "../../src/i18n/locales";

/**
 * The ladder of the partner offer — criteria 6 and 23 to 27 of §9 of
 * `docs/design/spec-lp-parcerias-conversao-2026-08.md` (card #306).
 *
 * ---------------------------------------------------------------------------
 * What a ladder is, and why it is worth five tests
 * ---------------------------------------------------------------------------
 *
 * Two rules of `monetizacao` sit one step apart and the page has to keep them
 * apart. **`BR-MONETIZACAO-056`** is an invariant: reading the name and the
 * description of any point of interest is free in every state — no quota, no
 * preview, no paywall. So *every* Tuggi traveller finds and reads the partner's
 * place, and that is the floor of what this page sells (`BR-B2B-015` item 1).
 * **`BR-MONETIZACAO-055`** is the step above it: the session that fires
 * automatically as the traveller goes past belongs to the paid tiers, so a
 * traveller on the free tier does **not** get narration at the partner's door.
 * `BR-B2B-015` item 2 turns that into a prohibition in letter — nothing may
 * state that every traveller who passes by hears.
 *
 * Collapsing the two steps is not a wording slip, it is the difference between
 * a claim the product keeps and one it does not, and the sentence reads better
 * when it is right: the promise opens on the half that covers a hundred per
 * cent of the base. The four checks below are what stops the two halves from
 * merging back — by counting, because what a count guards is what does not
 * regress.
 *
 * ---------------------------------------------------------------------------
 * Scope, and the trap inside the pattern
 * ---------------------------------------------------------------------------
 *
 * The set under test is the copy this spec writes: `Partners.*` plus
 * `Segments.steps.*`. Three published strings outside it carry a verb of
 * hearing on purpose and were each given a written verdict in §0.5.1 of the
 * spec — two segment cards that describe the traveller's *time* and *wish*
 * rather than his right, and a strip title addressed to the traveller himself
 * on a key shared with the home page. Widening this scope to all of
 * `Segments.*` would reopen three decisions that were already taken.
 *
 * **`escut\w*` does not match the Spanish `escucha`.** A pattern missing
 * `escuch` runs green in all four languages with the defect published in one of
 * them, which is the worst shape a guard can take: it answers the question
 * without asking it. Both stems are below, and this sentence is why.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Messages;
}

function leaves(node: Messages, prefix: string): [string, string][] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[`${prefix}${key}`, value] as [string, string]]
      : leaves(value, `${prefix}${key}.`)
  );
}

function at(messages: Messages, dotted: string): string {
  const value = dotted
    .split(".")
    .reduce<string | Messages | undefined>(
      (node, part) => (typeof node === "object" && node ? node[part] : undefined),
      messages
    );
  expect(typeof value, `${dotted} is a string`).toBe("string");
  return value as string;
}

/** The keys this card writes — spec §9, preamble of criteria 23 to 27. */
function offerCopy(locale: string): [string, string][] {
  const messages = messagesFor(locale);
  return [
    ...leaves(messages["Partners"] as Messages, "Partners."),
    ...leaves((messages["Segments"] as Messages)["steps"] as Messages, "Segments.steps."),
  ];
}

/** Every stem of "to hear" in the four languages. See the header on `escuch`. */
const HEARING = /\b(ouv\w*|escut\w*|escuch\w*|hear\w*|listen\w*|ascolt\w*|udit\w*)\b/i;

/** The mark that says the traveller has a paid session running. */
const GUIDE_ON: Record<string, string> = {
  pt: "guia ligado",
  en: "guide on",
  es: "guía encendida",
  it: "guida accesa",
};

/** The free half of the ladder, as it is worded in the subtitle. */
const FINDS_AND_READS: Record<string, string> = {
  pt: "encontra e lê",
  en: "finds and reads",
  es: "encuentra y lee",
  it: "trova e legge",
};

/**
 * The single named exception of criterion 23: the questions **we** hear most,
 * where the one doing the hearing is the Tuggi team and not the traveller. A
 * second exception is not added to this constant — the sentence is rewritten.
 */
const HEARING_EXEMPT = "Partners.FAQ.title";

function sentences(value: string): string[] {
  return value
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

test.describe("BR-MONETIZACAO-055 and 056 — the offer is a ladder, not a promise of universal listening", () => {
  for (const locale of LOCALES) {
    // Criterion 23.
    test(`BR-B2B-015 item 2: every ${locale} sentence that says "hear" says the condition too`, () => {
      const mark = GUIDE_ON[locale];
      const offenders = offerCopy(locale)
        .filter(([key]) => key !== HEARING_EXEMPT)
        .flatMap(([key, value]) =>
          sentences(value)
            .filter((sentence) => HEARING.test(sentence) && !sentence.includes(mark))
            .map((sentence) => `${key}: ${sentence}`)
        );
      expect(offenders).toEqual([]);
    });

    // Criterion 24. The ladder, as a comparison of two integers: whoever
    // inverts the order turns the promise into a caveat.
    test(`BR-MONETIZACAO-056: the free half opens the ${locale} subtitle, before the condition`, () => {
      const subtitle = at(messagesFor(locale), "Partners.hero.subtitle");
      const floor = subtitle.indexOf(FINDS_AND_READS[locale]);
      const condition = subtitle.indexOf(GUIDE_ON[locale]);

      expect(floor, `${locale}: the subtitle does not carry the free half`).toBeGreaterThanOrEqual(
        0
      );
      expect(condition, `${locale}: the subtitle does not carry the condition`).toBeGreaterThan(-1);
      expect(floor, `${locale}: the condition comes before the promise`).toBeLessThan(condition);
    });

    // Criterion 25. Three of these are wordings that came out or were ruled
    // out with an owner in §2.1 of the spec; two never existed and are guarded
    // so they cannot arrive. Each family cites the rule, never the string —
    // partner-claims.spec.ts reads src/ as raw text and this file's habit of
    // quoting is how a comment reintroduces what a commit removed.
    const BANNED: [string, RegExp][] = [
      // BR-B2B-015 item 5: false today — partner registration completes inside
      // the app, with an app account.
      ["installation", /instalar nada|nada que instalar|nothing to install|no installation|niente da installare/i],
      // BR-B2B-015 item 6: the offer asks the merchant for two things, and both
      // are named rather than denied.
      ["no change to the operation", /nada muda|não muda|no cambia nada|nothing changes|non cambia (nulla|niente)/i],
      // BR-B2B-015 item 5 with BR-B2B-005 and BR-B2B-009: perpetuity nobody
      // decided, and commercial terms that belong to the human operator.
      ["perpetuity and contract terms", /para sempre|forever|siempre gratis|per sempre|fidelidad|exclusiv|cancele quando|cancel anytime/i],
      // BR-B2B-015 item 2: the trigger radius varies with speed, so any
      // distance is a figure with nothing behind it.
      ["a unit of distance", /metros|meters|metri|\bkm\b/i],
      // BR-B2B-015 items 2 and 7: audience and outcome are not quantified,
      // and that holds even on the day the number exists.
      ["a figure of audience or outcome", /turistas por mês|travellers per month|%/i],
    ];

    for (const [family, pattern] of BANNED) {
      test(`BR-B2B-015: the ${locale} offer copy carries no claim of ${family}`, () => {
        const offenders = offerCopy(locale)
          .filter(([, value]) => pattern.test(value))
          .map(([key, value]) => `${key}: ${value}`);
        expect(offenders).toEqual([]);
      });
    }

    // Criterion 26. Measured by what could carry a figure rather than by the
    // figure itself: a count of travellers can only reach this page through an
    // ICU slot, so the closed list of slots is the guard — including on the day
    // a constant of PRODUCT_FACTS stops being null.
    test(`BR-B2B-015 item 2: the ${locale} offer copy interpolates four names and no other`, () => {
      const found = new Set(
        offerCopy(locale).flatMap(([, value]) => value.match(/\{[a-zA-Z]+\}/g) ?? [])
      );
      expect([...found].sort()).toEqual([
        "{contentLanguages}",
        "{email}",
        "{partnerTriageHours}",
        "{place}",
      ]);
    });

    // Criterion 6, and it is the guard that keeps a caveat from becoming a
    // headline again: the step that carries the promise used to be the longest
    // block of text on the page and was made entirely of conditions.
    test(`spec §4: no ${locale} step of the mechanism passes sixty words`, () => {
      const messages = messagesFor(locale);
      const long = [1, 2, 3, 4]
        .map((n) => [n, at(messages, `Segments.steps.s${n}Body`).split(/\s+/).length] as const)
        .filter(([, words]) => words > 60)
        .map(([n, words]) => `s${n}Body: ${words} words`);
      expect(long).toEqual([]);
    });
  }

  test("the one waiver of criterion 23 is still load-bearing", () => {
    // The same discipline the voucher waiver of partners-hub.spec.ts follows: a
    // waiver that no longer covers anything is a hole waiting for the next
    // sentence. It is language-specific — two of the four titles reach the idea
    // without the verb — so one live locale is what keeps it honest.
    const alive = LOCALES.filter((locale) =>
      HEARING.test(at(messagesFor(locale), HEARING_EXEMPT))
    );
    expect(alive.length, `${HEARING_EXEMPT} no longer needs its waiver`).toBeGreaterThan(0);
  });
});

test.describe("BR-B2B-010 item 7 — half 1 is legible on the page that states half 2", () => {
  for (const locale of LOCALES) {
    test(`/${locale} serves the independence of the QR Code, outside the mechanism`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}${localizedPathname(locale, "/partners")}`);
      expect(response?.status()).toBe(200);

      const independence = at(messagesFor(locale), "Partners.FAQ.a4");

      // Scoped to the block, never page.content(): next-intl ships every
      // message of every namespace in the RSC payload, so a match against the
      // whole document proves nothing about what this page renders.
      const objections = await page.locator('[data-block="faq"]').textContent();
      expect(objections, `${locale}: the objection block does not carry FAQ.a4`).toContain(
        independence
      );

      // "Outside block 4" is the half of the criterion that is easy to lose:
      // the answer moved out of the step precisely so the merchant meets it
      // where he asks the question.
      const mechanism = await page.locator('[data-block="partnership-steps"]').textContent();
      expect(mechanism).not.toContain(independence);
    });
  }
});
