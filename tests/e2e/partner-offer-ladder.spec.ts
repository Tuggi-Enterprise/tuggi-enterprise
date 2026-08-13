import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { LOCALES } from "../../src/i18n/locales";

/**
 * The ladder of the partner offer — criteria 6 and 23 to 27 of §9 of
 * `docs/design/spec-lp-parcerias-conversao-2026-08.md` (card #306), and the four
 * criteria the §0.6 delta of that same spec added for the paid band (card #316,
 * in the second block of the file).
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

/**
 * The scope of criteria 28 to 31 — `Partners.*` plus **all** of `Segments.*`,
 * not only its steps. The band of `BR-B2B-016` is a fact about the partnership,
 * so it reaches every surface that recruits a partner, and the key that carried
 * a banned absolute was `Segments.commercial.lead`: a namespace no page mounts
 * today and that the narrower scope of criterion 23 never looked at.
 */
function partnerCopy(locale: string): [string, string][] {
  const messages = messagesFor(locale);
  return [
    ...leaves(messages["Partners"] as Messages, "Partners."),
    ...leaves(messages["Segments"] as Messages, "Segments."),
  ];
}

/**
 * Every stem of "to hear", by language. Criterion 23 runs the union of all four
 * against every file on purpose — a verb that slips in from another language is
 * still a claim of listening — while criterion 28 reads a file with the stems of
 * its own language. One map, two readings, so a stem is added in one place.
 *
 * See the header on `escuch`; the Italian `sent-` is the same trap by another
 * road, and neither is reachable from `escut\w*` or `ascolt\w*`.
 */
const HEARING_STEMS: Record<string, string> = {
  pt: "ouv\\w*|escut\\w*",
  en: "hear\\w*|listen\\w*",
  es: "escuch\\w*|oye|oír|oíd\\w*",
  it: "ascolt\\w*|sent[eiao]\\w*|udit\\w*",
};

const HEARING = new RegExp(`\\b(${Object.values(HEARING_STEMS).join("|")})\\b`, "i");

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

    // Criterion 30 of the #316 delta widened these five to the scope of the
    // criteria below — all of `Segments.*` — and left criterion 23 where it is:
    // a pattern of words is language-blind about who the subject of the verb is,
    // and two segment cards depend on that difference. These five do not.
    for (const [family, pattern] of BANNED) {
      test(`BR-B2B-015: the ${locale} offer copy carries no claim of ${family}`, () => {
        const offenders = partnerCopy(locale)
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

/* ---------------------------------------------------------------------------
 * The paid band — criteria 28 to 31 of §9 of the same spec (card #316).
 *
 * `BR-B2B-016` says the offer to the establishment has two bands: for free Tuggi
 * says only the name of the place, for a charge the name and a description. The
 * page used to answer the question about cost with an absolute denial, and three
 * of its four clauses described what the paid band does — false, in the highest
 * weight question of the funnel, in four languages at once.
 *
 * `BR-B2B-015` item 4 replaced the absolute with a denial that names its own
 * scope, item 8 made the mention of the band obligatory wherever that denial is
 * made — and forbade describing it — and its first edge case is the structural
 * one: the scene and the denial of cost never share a promise, because together
 * they promise that the narrated story is free, which nobody decided.
 *
 * `BR-MONETIZACAO-056` is what survives the band intact and what the hero now
 * states from the negative: no state of the traveller changes what he reads, so
 * no plan hides the partner. It is an invariant, and the band never resolves in
 * reading time (`BR-B2B-016` item 4).
 *
 * All four count, and all four were run in both directions: nothing against the
 * copy of §5.10, and against the copy published before it every language answers.
 * A criterion that does not fail the known defect is not a criterion.
 * ------------------------------------------------------------------------- */

/** The scene, by language: the condition of criterion 23 or a verb of hearing. */
function sceneMark(locale: string): RegExp {
  return new RegExp(`${GUIDE_ON[locale]}|\\b(${HEARING_STEMS[locale]})\\b`, "i");
}

/** Cost, by language, as the merchant would read it — noun and verb alike. */
const COST_MARK: Record<string, RegExp> = {
  pt: /\b(cust\w*|cobra\w*|pag\w*|grátis|gratuit\w*|mensalidade|fatura\w*|taxa\w*|investiment\w*)\b/i,
  en: /\b(cost\w*|charg\w*|pay\w*|paid|free|fee|invoice\w*|investment\w*)\b/i,
  es: /\b(cuest\w*|cost\w*|cobra\w*|pag\w*|gratis|gratuit\w*|cuota\w*|factura\w*|tarifa\w*|inversión)\b/i,
  it: /\b(cost\w*|pag\w*|gratis|gratuit\w*|canone|fattur\w*|tariff\w*|investiment\w*)\b/i,
};

/**
 * A unit of rendering: the keys the reader takes in as one promise. Entries are
 * whole keys or prefixes, and every unit has to resolve to at least one key —
 * a unit emptied by a rename passes without asking anything.
 */
const RENDERING_UNITS: Record<string, string[]> = {
  hero: [
    "Partners.hero.eyebrow",
    "Partners.hero.title",
    "Partners.hero.subtitle",
    "Partners.cta.action",
  ],
  grid: ["Partners.grid."],
  mechanism: ["Segments.steps."],
  "faq-title": ["Partners.FAQ.title"],
  form: ["Partners.form.title", "Partners.form.body"],
  meta: ["Partners.seo.title", "Partners.seo.description"],
  "commercial-model": ["Segments.commercial."],
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((n) => [`faq-${n}`, [`Partners.FAQ.q${n}`, `Partners.FAQ.a${n}`]])
  ),
};

/**
 * The mention of the band, by language — criterion 29. The word for the charge
 * is not the one the rule uses: its natural translation carries recurrence in
 * two of the four languages, and recurrence is undecided.
 */
const PAID_BAND: Record<string, RegExp> = {
  pt: /\bparte paga\b/i,
  en: /\bpaid part\b/i,
  es: /\bes de pago\b/i,
  it: /\ba pagamento\b/i,
};

/** Where the single mention lives, and the only surface that reverses the risk. */
const PAID_BAND_KEY = "Partners.FAQ.a1";

/**
 * Criterion 30, by noun rather than by construction, and that is the whole
 * lesson: the previous shape of this guard read the Portuguese verb and ran
 * green over the Spanish sentence, which denies the same facts with other verbs.
 * A guard that answers in one language is worse than no guard.
 */
const ABSOLUTE_COST_DENIAL: Record<string, RegExp[]> = {
  pt: [
    /\bmensalidade\b/i,
    /\bfatura\w*/i,
    /taxa de adesão/i,
    /\binvestimento\b/i,
    /de graça/i,
    /\bgrátis\b/i,
    /gratuit\w*/i,
    /não (?:paga|compra|gasta) nada/i,
    /sem custo(?: nenhum)?/i,
    /sem taxa/i,
    /sem fatura/i,
    /nenhum investimento/i,
  ],
  en: [
    /monthly fee/i,
    /\binvoice\w*/i,
    /sign-?up fee/i,
    /setup fee/i,
    /\binvestment\b/i,
    /\bfree\b/i,
    /free of charge/i,
    /(?:you )?(?:pay|buy|spend) nothing/i,
    /no cost/i,
    /100% free/i,
    /no invoice/i,
    /no investment/i,
  ],
  es: [
    /\bmensualidad\w*/i,
    /\bfactura\w*/i,
    /cuota de alta/i,
    /\binversión\b/i,
    /\bgratis\b/i,
    /gratuit\w*/i,
    /no (?:pagas|compras|gastas) nada/i,
    /sin (?:ning[uú]n )?coste/i,
    /sin (?:ning[uú]n )?costo/i,
    /100% gratis/i,
    /sin cuota/i,
    /sin factura/i,
    /sin inversión/i,
  ],
  it: [
    /\bcanone\b/i,
    /\bfattur\w*/i,
    /quota di iscrizione/i,
    /\binvestimento\b/i,
    /\bgratis\b/i,
    /gratuit\w*/i,
    /non (?:paghi|compri|spendi) (?:nulla|niente)/i,
    /senza costi/i,
    /senza alcun costo/i,
    /100% gratuito/i,
    /senza fattura/i,
  ],
};

/**
 * Criterion 31. `BR-B2B-016` items 6 and 7: the band is mentioned and never
 * described, and what is not decided is not deduced from here — no price, no
 * currency, no recurrence, no commercial name.
 *
 * The one trap is Italian, and it is why the banned pattern names the plan: the
 * mention of criterion 29 is the two words on their own, and shortening the ban
 * to them fails the mention the rule makes obligatory. Lengthening the mention
 * to the banned pair publishes a commercial name. The two live side by side.
 */
const PRICE_AND_PLAN: Record<string, RegExp[]> = {
  pt: [/R\$/, /€/, /US\$/, /\/mês/i, /por mês/i, /plano pago/i, /pacote pago/i, /upgrade/i, /mensalidade/i],
  en: [/R\$/, /€/, /US\$/, /\/month/i, /per month/i, /paid plan/i, /paid package/i, /upgrade/i, /monthly fee/i],
  es: [/R\$/, /€/, /US\$/, /\/mes/i, /al mes/i, /plan de pago/i, /paquete de pago/i, /upgrade/i, /cuota mensual/i],
  it: [/R\$/, /€/, /US\$/, /\/mese/i, /al mese/i, /piano a pagamento/i, /pacchetto a pagamento/i, /upgrade/i, /canone/i],
};

function keysMatching(copy: [string, string][], patterns: RegExp[]): string[] {
  return copy
    .filter(([, value]) => patterns.some((pattern) => pattern.test(value)))
    .map(([key, value]) => {
      const hits = patterns.filter((pattern) => pattern.test(value)).map(String);
      return `${key} — ${hits.join(", ")}`;
    });
}

test.describe("BR-B2B-016 — the partnership has a paid band, and the page mentions it once", () => {
  for (const locale of LOCALES) {
    // Criterion 28. The scene and the denial of cost are each true on their
    // own; the conjunction is the promise nobody made.
    test(`BR-B2B-015 first edge case: no ${locale} unit carries the scene and cost at once`, () => {
      const copy = new Map(partnerCopy(locale));
      const scene = sceneMark(locale);
      const cost = COST_MARK[locale];

      const offenders: string[] = [];
      for (const [unit, members] of Object.entries(RENDERING_UNITS)) {
        const keys = [...copy.keys()].filter((key) =>
          members.some((member) => key === member || key.startsWith(member))
        );
        expect(keys.length, `${locale}: unit "${unit}" resolves to no key`).toBeGreaterThan(0);

        // The one named exception is the same as criterion 23's, and for the
        // same reason: there the one doing the hearing is the Tuggi team.
        const withScene = keys.filter(
          (key) => key !== HEARING_EXEMPT && scene.test(copy.get(key) as string)
        );
        const withCost = keys.filter((key) => cost.test(copy.get(key) as string));
        if (withScene.length > 0 && withCost.length > 0) {
          offenders.push(`${unit}: scene in ${withScene.join(", ")}; cost in ${withCost.join(", ")}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    // Criterion 29, and it is the only check of this spec where the absence is
    // the defect: omitting the band is as far outside the ceiling as describing
    // it, and a second mention becomes a description by accumulation.
    test(`BR-B2B-015 item 8: ${locale} mentions the paid band exactly once, in the cost answer`, () => {
      const mentions = partnerCopy(locale)
        .filter(([key]) => key.startsWith("Partners."))
        .filter(([, value]) => PAID_BAND[locale].test(value))
        .map(([key]) => key);
      expect(mentions).toEqual([PAID_BAND_KEY]);
    });

    // Criterion 30.
    test(`BR-B2B-015 items 4 and 5: no ${locale} absolute denial of cost survives`, () => {
      expect(keysMatching(partnerCopy(locale), ABSOLUTE_COST_DENIAL[locale])).toEqual([]);
    });

    // Criterion 31.
    test(`BR-B2B-016 items 6 and 7: ${locale} publishes no price, recurrence or plan name`, () => {
      expect(keysMatching(partnerCopy(locale), PRICE_AND_PLAN[locale])).toEqual([]);
    });
  }
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
