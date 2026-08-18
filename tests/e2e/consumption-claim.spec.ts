import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { publishedText } from "./support/published-text";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * BR-MONETIZACAO-077 — the ceiling of what any surface may claim about *when*
 *                      the balance is consumed. Items 7 to 10 forbid four
 *                      propositions outright: that consumption depends on
 *                      movement, that standing still is free, that a
 *                      user-triggered pause exists, and that being offline —
 *                      or "only when connected" — changes what is charged.
 * BR-MONETIZACAO-049 — why they became false on 2026-08-17: the meter's axis is
 *                      the guide session, not displacement. Standing still with
 *                      the guide on consumes.
 * DS-COPY-030 —        the form the copy takes instead: a consumption promise
 *                      names an **act of the user** (turn on, turn off), never a
 *                      state of the world that we measure.
 *
 * ---------------------------------------------------------------------------
 * Why this guard is a word sweep and not a list of sentences
 * ---------------------------------------------------------------------------
 *
 * "You only spend while you're moving" shipped in four languages and lived for
 * five days. A guard listing the four sentences that were wrong would not see
 * the fifth: the same promise survives translation, paraphrase and a change of
 * neighbour. So the ruler matches the **claim** — a consumption verb about the
 * hours the tourist bought, in the same sentence as a word for movement, for
 * rest or for connectivity — over every message file, in every locale.
 *
 * The tourist tests a state of the world for free (he parks, he flips airplane
 * mode) and concludes the product overcharges, not that the copy is stale. That
 * is why the ceiling is a rule and this is a test.
 *
 * ---------------------------------------------------------------------------
 * The three acceptions this ruler deliberately does not fire on
 * ---------------------------------------------------------------------------
 *
 * 1. **The carrier's charge, not ours.** `Drive.FAQ.a2` and
 *    `Drive.Features.feat1Desc` promise "no roaming charges" in four languages
 *    — that is the mobile operator billing data, and it is true. The clause is
 *    stripped before the ruler reads the sentence, the way
 *    `non-objective-sweep.spec.ts` strips the browser sense of "navegar":
 *    removing the acception keeps the rest of the sentence under the ruler,
 *    while excusing the whole string would stop reading a sentence that says
 *    "no charges" *and* names our balance.
 * 2. **Narration, not consumption.** `Home.Showcase.feat2Title` ("Still, it
 *    shows you around. Moving, it speaks.") is about when the app talks. It
 *    carries no consumption verb, so it stays — see §15.3 of
 *    docs/design/copy-paywall-revenuecat-2026-08.md, which conferred it.
 * 3. **The next trip.** The approved copy says the leftover hours wait for your
 *    next trip. BR-MONETIZACAO-077 item 7 does forbid naming the *trip* as the
 *    condition of consumption, so the trip family is judged **inside the
 *    clause**, not the sentence: "the hours only run during the trip" is one
 *    clause and goes red; "the time only runs with the guide on, and whatever
 *    is left waits for your next trip" is two and does not.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");
const LOCALES = ["pt", "en", "es", "it"] as const;

const PRICING_SECTION = '[data-section="drive-pricing"]';

/* ---------------------------------------------------------------------------
 * The rulers
 * ------------------------------------------------------------------------- */

/**
 * Spending our balance, in the four languages. Unambiguous on its own: no other
 * sense of these verbs is published by this site.
 */
const SPENDS =
  /\b(gast\w*|consom\w*|consum\w*|spend\w*|debit\w*|addebit\w*|descont\w*|desconta\w*|cobra\w*|cobran\w*|charg\w*|cargos?|cost[oi]s?|custos?)\b/i;

/**
 * The meter running. Ambiguous alone — "conta a história", "it runs alongside
 * your navigation", "te cuenta" — so these count as a consumption claim only
 * when the sentence also names what is being metered.
 */
const METERS = /\b(corre[mn]?|corren|runs?|running|scorr\w*|cont[ao]m?|cuenta[ns]?|conteggi\w*|counts?)\b/i;

/** What is metered: the credit the tourist bought. */
const CREDIT =
  /\b(saldo|cr[ée]dito|credit|horas?|hours?|ore|ora|minutos?|minutes?|minuti|tempo|time|tiempo)\b/i;

/**
 * A world state we measure — the three families BR-MONETIZACAO-077 names, in
 * the four published languages plus the two French forms, so a fifth locale
 * arrives already covered.
 *
 * Movement and driving (item 7), rest (item 8), connectivity (item 10). "Trip"
 * is not here: it is `TRIP_CONDITION` below, judged in a narrower unit.
 */
const WORLD_STATE =
  /\b(movimento|movimiento|movement|mouvement|moving|on the move|desloca\w*|velocidade|velocidad|velocit[àa]|speed|dirigindo|driving|conduciendo|guidando|ao volante|al volante|parad[oa]s?|quiet[oa]s?|ferm[oi]|fermat[ei]|stopp\w*|stop|detenid[oa]s?|arr[êe]t\w*|a p[ée]|a piedi|on foot|caminhando|caminando|camminando|walking|no hotel|no restaurante|no sem[áa]foro|traffic light|offline|hors ligne|conectad[oa]s?|connected|conness[oa]|avi[ãa]o|airplane|aereo|modo avi[óo]n)\b|\b(sem|sin|senza|no|without) (internet|conex[ãi][oó]n|conexi[óo]n|rete|se[ñn]al|sinal|segnale|signal)\b/i;

/** The trip named as the condition of consumption — item 7, in one clause. */
const TRIP_CONDITION = /\b(viagem|viaje|viaggio|trip|voyage)\b/i;

/**
 * The mobile operator's charge for data, in both word orders. Stripped from the
 * sentence before the ruler reads it — acception 1 above.
 */
const CARRIER_CHARGE = [
  /\b(gast\w*|consum\w*|spend\w*|cobra\w*|cobran\w*|charg\w*|cargos?|cost[oi]s?|custos?|zero|cero)\b[^.;!?]{0,40}?\b(roaming|itiner[âa]ncia|dados|datos|dati|data)\b/gi,
  /\b(roaming|itiner[âa]ncia|dados|datos|dati|data)\b[^.;!?]{0,40}?\b(charg\w*|cobran\w*|cobra\w*|cargos?|cost[oi]s?|custos?)\b/gi,
];

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
  return flatten(messagesFor(locale)).find(([key]) => key === dottedKey)?.[1];
}

/** ICU placeholders and inline markup are not prose: `{count, plural, ...}`
 *  publishes a control word the visitor never reads, and `<strong>` splits a
 *  sentence that a human reads whole. */
function prose(value: string): string {
  return value
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function stripCarrierCharge(sentence: string): string {
  return CARRIER_CHARGE.reduce((text, pattern) => text.replace(pattern, " "), sentence);
}

/**
 * A sentence ends at a full stop followed by whitespace, by an opening mark —
 * including the Spanish `¿`, which is the whole of what the `es` run failed on
 * — **or by a capital letter**, and that last case is not pedantry: the two
 * places this
 * ruler reads outside a message file put no space there. `publishedText`
 * clones the body detached, so `innerText` falls back to text-content
 * semantics and two sibling elements arrive as "…with the guide on.Does TUGGI
 * work offline?"; JSON does the same at `…on."},{"name":"…`. Splitting on
 * whitespace alone splices the end of one sentence onto the start of the next
 * and invents a claim neither of them makes — it cost this file four false
 * reds before it was written down.
 */
function sentences(value: string): string[] {
  return prose(value)
    .split(/(?<=[.!?…])(?=\s|["'“”«»¿¡]|\p{Lu})/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** A clause: what a comma, a dash or a semicolon separates. */
function clauses(sentence: string): string[] {
  return sentence
    .split(/[,;—–-]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

/** Does this text claim that our balance is consumed? */
function claimsConsumption(text: string): boolean {
  return SPENDS.test(text) || (METERS.test(text) && CREDIT.test(text));
}

/**
 * Every sentence of a message that ties a consumption claim to a state of the
 * world — the whole of what BR-MONETIZACAO-077 items 7 to 10 forbid.
 */
function forbiddenSentences(value: string): string[] {
  return sentences(value)
    .map(stripCarrierCharge)
    .filter(
      (sentence) =>
        (claimsConsumption(sentence) && WORLD_STATE.test(sentence)) ||
        clauses(sentence).some(
          (clause) => claimsConsumption(clause) && TRIP_CONDITION.test(clause),
        ),
    );
}

/** Every string value in a JSON tree — the prose a crawler reads out of the
 *  page's structured data. */
function stringsIn(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(stringsIn);
  if (node && typeof node === "object") return Object.values(node).flatMap(stringsIn);
  return [];
}

/* ---------------------------------------------------------------------------
 * 1. The sweep — every key, every locale
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-077 — no published string ties consumption to a state of the world", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-077 / DS-COPY-030: nothing in ${locale}.json says the balance depends on movement, rest or connectivity`, () => {
      const offenders = flatten(messagesFor(locale)).flatMap(([key, value]) =>
        forbiddenSentences(value).map((sentence) => `${key}: ${sentence}`),
      );

      expect(
        offenders,
        "BR-MONETIZACAO-049 debits by guide session since 2026-08-17: standing still with the " +
          "guide on consumes, and so does being offline. A surface that promises otherwise is " +
          "disproved by the product itself — the tourist parks, or flips airplane mode, and the " +
          "balance moves. DS-COPY-030: name the act (turn the guide on, turn it off), never the " +
          "state of the world.",
      ).toEqual([]);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 2. The headline pair, which is one claim in two keys
 * ------------------------------------------------------------------------- */

/**
 * `Drive.Pricing.title` and `Drive.Pricing.subtitle` render one under the other,
 * and the second borrows its subject from the first: under "you only spend
 * while you're moving", "stop whenever you like" meant stopping the car. Alone,
 * it is item 8 — that stopping is free — and no sweep for "movement" sees it.
 * So the pair is read joined, against the wider list: here even the ambiguous
 * stop words count, because there is no other thing in these two sentences for
 * them to be about.
 */
const STOP_ACT = /\b(pare|parar|para|stop|stops|fermat[ei]|fermarsi|detente|detener|pausa|pause)\b/i;

test.describe("BR-MONETIZACAO-077 item 8 — the pricing headline and its subtitle move together", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-077 / DS-COPY-030: the ${locale} headline pair names an act, not a state`, () => {
      const title = messageAt(locale, "Drive.Pricing.title");
      const subtitle = messageAt(locale, "Drive.Pricing.subtitle");
      expect(title, `Drive.Pricing.title is missing from ${locale}.json`).toBeTruthy();
      expect(subtitle, `Drive.Pricing.subtitle is missing from ${locale}.json`).toBeTruthy();

      const pair = prose(`${title} ${subtitle}`);

      expect(pair, "the headline pair names a state of the world").not.toMatch(WORLD_STATE);
      expect(
        pair,
        "the headline pair says stopping is what stops the spending — item 8, and item 9 if " +
          "the word is a pause. What stops it is turning the guide off.",
      ).not.toMatch(STOP_ACT);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 3. The positive control — the guard is not green because the page is empty
 * ------------------------------------------------------------------------- */

/**
 * A sweep for what may not be said passes on a deleted string. These four say
 * what BR-MONETIZACAO-077 item 1 and item 2 permit instead, and they are the
 * copy `design` wrote (DS-COPY-030, docs/design/copy-paywall-revenuecat-2026-08.md
 * §15.1 and §15.2) — transcribed, not paraphrased here.
 */
const GUIDE_ON: Record<string, { on: RegExp; off: RegExp }> = {
  pt: { on: /com o guia ligado/i, off: /desligue o guia/i },
  en: { on: /with the guide on/i, off: /turn the guide off/i },
  es: { on: /con la guía encendida/i, off: /apaga la guía/i },
  it: { on: /con la guida accesa/i, off: /spegni la guida/i },
};

test.describe("BR-MONETIZACAO-077 items 1 and 2 — what the copy says instead", () => {
  for (const locale of LOCALES) {
    test(`DS-COPY-030: ${locale} names the guide being on, and turning it off as what stops it`, () => {
      const { on, off } = GUIDE_ON[locale];

      for (const key of ["Drive.Pricing.title", "Drive.FAQ.a1", "Drive.PlansExplainer.p2"]) {
        expect(messageAt(locale, key), `${key} no longer names the condition in ${locale}`).toMatch(
          on,
        );
      }
      expect(
        messageAt(locale, "Drive.Pricing.subtitle"),
        `Drive.Pricing.subtitle no longer names the act that stops the spending in ${locale}`,
      ).toMatch(off);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 4. What /drive actually serves — the rendered half
 * ------------------------------------------------------------------------- */

test.describe("BR-MONETIZACAO-077 — /drive publishes the guide-on promise in four languages", () => {
  for (const locale of LOCALES) {
    test(`BR-MONETIZACAO-077 / DS-COPY-030: /${locale}/drive serves the four rewritten strings`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);
      expect(response?.status()).toBe(200);

      // Not page.content(): next-intl ships every source string of the locale
      // inside the RSC payload, so the raw HTML contains the sentence this
      // guard is asserting is gone — green when the copy is wrong and red when
      // it is right. See support/published-text.ts.
      const served = await publishedText(page);

      for (const key of [
        "Drive.Pricing.title",
        "Drive.Pricing.subtitle",
        "Drive.FAQ.a1",
        "Drive.PlansExplainer.p2",
      ]) {
        expect(served, `${key} is not served on /${locale}/drive`).toContain(messageAt(locale, key)!);
      }

      // The structured data is swept parsed, not as text: JSON puts no space
      // after the full stop that ends an answer, so a raw sweep would splice
      // the end of one answer onto the beginning of the next question and
      // invent a sentence neither of them says. Ruler on the values, not on
      // the serialization.
      const structured = await page.locator('script[type="application/ld+json"]').allTextContents();

      const offenders = [
        ...served
          .split("\n")
          .filter((line) => !line.trimStart().startsWith("{"))
          .flatMap((line) => forbiddenSentences(line)),
        ...structured
          .flatMap((json) => stringsIn(JSON.parse(json)))
          .flatMap((value) => forbiddenSentences(value)),
      ];

      expect(
        offenders,
        "The whole page — title, meta description, JSON-LD and body — has to agree with " +
          "BR-MONETIZACAO-049. The metadata is the half a visitor reads in a search result, " +
          "and the JSON-LD is the half an assistant quotes.",
      ).toEqual([]);
    });

    test(`BR-MONETIZACAO-077 item 8: the ${locale} pricing headline reads as one claim`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);
      expect(response?.status()).toBe(200);

      // textContent, not toHaveAccessibleName: the accessible name collapses
      // whitespace between inline children, so a missing space between two
      // spans reads correct there and wrong on screen. What the visitor reads
      // is the text node.
      const headline = await page.locator(`${PRICING_SECTION} h2`).textContent();
      const subtitle = await page.locator(`${PRICING_SECTION} h2 + p`).textContent();

      expect(headline?.trim()).toBe(messageAt(locale, "Drive.Pricing.title"));
      expect(subtitle?.trim()).toBe(messageAt(locale, "Drive.Pricing.subtitle"));

      const pair = `${headline} ${subtitle}`;
      expect(pair, "the rendered headline pair names a state of the world").not.toMatch(WORLD_STATE);
      expect(pair, "the rendered headline pair says stopping is what stops it").not.toMatch(
        STOP_ACT,
      );
    });
  }
});
