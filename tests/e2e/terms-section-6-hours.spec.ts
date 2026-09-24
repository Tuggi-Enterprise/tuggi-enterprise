import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { publishedText } from "./support/published-text";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * BR-MONETIZACAO-050 — hours bought do not expire.
 * BR-MONETIZACAO-077 (items 1, 2) / BR-MONETIZACAO-049 — the balance runs
 *                     while the guide is on, and turning the guide off is
 *                     what stops consumption. Never "only while moving".
 * BR-MONETIZACAO-078 / BR-AUDIO-021 — the guide session ends after 15
 *                     minutes without a signal.
 * BR-MONETIZACAO-061 / BR-MONETIZACAO-004 — passes are one-time, no
 *                     auto-renewal; the monthly subscription renews, charges
 *                     monthly and cancels in the store.
 * BR-MONETIZACAO-072 item 3 / BR-COMUNICACAO-010 item 8 — no subscription
 *                     price anywhere in the Terms.
 * BR-MONETIZACAO-066 item 1 — the 7/30-day passes are described as closed to
 *                     new purchases, and the Annual Pass is gone from
 *                     `Legal.Terms` in every locale.
 *
 * Card `Tuggi-Enterprise/tuggi-app#368`. Source of the rewrite:
 * `docs/design/specs/termos-secao-6-horas.md`.
 *
 * `publishedText()`, never `page.content()` — see the docstring on that
 * helper: next-intl inlines every locale's messages into the RSC payload, so
 * raw HTML is green when the copy is wrong.
 *
 * The claim-content assertions below read `src/messages/*.json` directly and
 * anchor on the `Legal.Terms.s6Item*` keys, not on a Portuguese substring —
 * each ruler is a single cross-language regex, the same style
 * `hour-catalogue.spec.ts` already uses for this catalogue. Only the
 * `<strong>` rendering check drives a real page, because that is the one
 * thing a JSON read cannot prove.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");
const LOCALES = ["pt", "en", "es", "it"] as const;

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));
}

function flatten(messages: Messages, prefix = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const dotted = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[dotted, value] as [string, string]] : flatten(value, dotted);
  });
}

function legalTerms(locale: string): [string, string][] {
  return flatten(messagesFor(locale)).filter(([key]) => key.startsWith("Legal.Terms."));
}

function s6Item(locale: string, item: number): string {
  const key = `Legal.Terms.s6Item${item}`;
  const found = flatten(messagesFor(locale)).find(([k]) => k === key)?.[1];
  expect(found, `${key} is missing from ${locale}.json`).toBeTruthy();
  return found!;
}

function localeUrl(locale: string, pagePath: string): string {
  const slug = localizedPathname(locale, pagePath);
  return slug === "/" ? `/${locale}` : `/${locale}${slug}`;
}

/* ---------------------------------------------------------------------------
 * The rulers — one cross-language regex per promise, matching the four
 * translations of the sentence carrying it.
 * ------------------------------------------------------------------------- */

const HOURS_DO_NOT_EXPIRE = /não expiram|do not expire|no caducan|non scadono/i;

const BALANCE_RUNS_WHILE_GUIDE_ON =
  /corre enquanto o guia está ligado|runs while the guide is on|corre mientras la guía está encendida|scorre mentre la guida è attiva/i;

const TURNING_GUIDE_OFF_STOPS_CONSUMPTION =
  /desligar o guia é o que para o consumo|turning the guide off is what stops it|apagar la guía es lo que detiene el consumo|spegnere la guida è ciò che ferma il consumo/i;

/** BR-COMUNICACAO-010 item 3 — proibido: gate por movimento. */
const MOVEMENT_GATE = /\bmovimento\b|\bmoving\b|\bmovement\b|\bmovimiento\b|\bin movimento\b/i;

/** BR-COMUNICACAO-010 item 3 — proibido: controle de pausa. */
const PAUSE_CLAIM = /\bpausa\b|\bpause\b|\bpausar\b/i;

/** BR-COMUNICACAO-010 item 3 — proibido: "offline não gasta". */
const OFFLINE_CLAIM = /\boffline\b/i;

/** BR-COMUNICACAO-010 item 3 — proibido: cobrança em blocos/faixas. */
const BILLING_BLOCK_CLAIM =
  /\bblocos?\b|\bfaixas?\b|\bpacotes?\b|\barredonda(?:mos|do)?\b|\bblocks?\b|\bround(?:ed|s)?\s+up\b|\bbloques?\b|\bblocchi\b/i;

const FIFTEEN_MINUTES = /15\s*(minutos|minutes|minuti)/i;

const SESSION_ENDS_ON_SILENCE =
  /encerram a sessão de guia|end the guide session|cierran la sesión de guía|chiudono la sessione di guida/i;

const ONE_TIME_NO_AUTO_RENEW =
  /compra única e não possui renovação automática|one-time purchase and does not auto-renew|compra única y no tiene renovación automática|acquisto una tantum e non si rinnova automaticamente/i;

const SUBSCRIPTION_RENEWS_AUTOMATICALLY =
  /renova automaticamente|renews automatically|se renueva automáticamente|si rinnova automaticamente/i;

const SUBSCRIPTION_CHARGED_MONTHLY =
  /cobrada a cada mês|charged every month|se cobra cada mes|viene addebitato ogni mese/i;

const SUBSCRIPTION_CANCELS_IN_STORE =
  /cancelada na loja|cancelled in the store|se cancela en la tienda|si annulla nello store/i;

/** Any published amount of money — same ruler as hour-catalogue.spec.ts. */
const PRICE = /(R\$|US\$|\bUSD\b|\bBRL\b|\bEUR\b|€|£|\$\s?\d)|\b\d+[.,]\d{2}\b/;

/** The annual product, by name, in the four languages — same list the spec's
 *  "Pronto quando" item 3 names. */
const ANNUAL_PRODUCT =
  /\b(anual(?:mente)?|annual(?:ly)?|annuale|anuales?|assinatura anual|piano annuale|plan anual|passe anual|annual pass|pase anual|pass annuali|plano anual|annual plan)\b/i;

const SEVEN_PRESENT = /\b7\b/;
const THIRTY_PRESENT = /\b30\b/;
const DAY_WORD = /\b(dias?|days?|d[ií]as?|giorni|giorno)\b/i;

const PASSES_CLOSED_TO_NEW_PURCHASES =
  /não estão mais à venda|no longer available for purchase|ya no están a la venta|non sono più in vendita/i;

/* ---------------------------------------------------------------------------
 * BR-MONETIZACAO-050
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`BR-MONETIZACAO-050: ${locale}.json's Legal.Terms.s6Item1 affirms hours do not expire`, () => {
    expect(s6Item(locale, 1)).toMatch(HOURS_DO_NOT_EXPIRE);
  });
}

/* ---------------------------------------------------------------------------
 * BR-MONETIZACAO-077 (items 1, 2) / BR-MONETIZACAO-049 — positive, plus the
 * negative guard against BR-COMUNICACAO-010 item 3's named formulations.
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`BR-MONETIZACAO-077/049: ${locale}.json's Legal.Terms.s6Item2 says the balance runs while the guide is on and stops when it is turned off`, () => {
    const item = s6Item(locale, 2);
    expect(item).toMatch(BALANCE_RUNS_WHILE_GUIDE_ON);
    expect(item).toMatch(TURNING_GUIDE_OFF_STOPS_CONSUMPTION);
  });

  test(`BR-COMUNICACAO-010 item 3: ${locale}.json's Legal.Terms never gates consumption on movement, pause, offline state or billing blocks`, () => {
    const wholeSection = legalTerms(locale)
      .map(([, value]) => value)
      .join("\n");
    expect(wholeSection, "movement-gated consumption claim").not.toMatch(MOVEMENT_GATE);
    expect(wholeSection, "pause control claim").not.toMatch(PAUSE_CLAIM);
    expect(wholeSection, "offline-gated consumption claim").not.toMatch(OFFLINE_CLAIM);
    expect(wholeSection, "billing-block claim").not.toMatch(BILLING_BLOCK_CLAIM);
  });
}

/* ---------------------------------------------------------------------------
 * BR-MONETIZACAO-078
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`BR-MONETIZACAO-078: ${locale}.json's Legal.Terms.s6Item2 describes the session ending after 15 minutes without signal`, () => {
    const item = s6Item(locale, 2);
    expect(item).toMatch(FIFTEEN_MINUTES);
    expect(item).toMatch(SESSION_ENDS_ON_SILENCE);
  });
}

/* ---------------------------------------------------------------------------
 * BR-MONETIZACAO-061 + 004
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`BR-MONETIZACAO-061: ${locale}.json's Legal.Terms.s6Item1 says passes are a one-time purchase without auto-renewal`, () => {
    expect(s6Item(locale, 1)).toMatch(ONE_TIME_NO_AUTO_RENEW);
  });

  test(`BR-MONETIZACAO-004: ${locale}.json's Legal.Terms.s6Item3 says the monthly subscription renews automatically, charges monthly and cancels in the store`, () => {
    const item = s6Item(locale, 3);
    expect(item).toMatch(SUBSCRIPTION_RENEWS_AUTOMATICALLY);
    expect(item).toMatch(SUBSCRIPTION_CHARGED_MONTHLY);
    expect(item).toMatch(SUBSCRIPTION_CANCELS_IN_STORE);
  });
}

/* ---------------------------------------------------------------------------
 * BR-MONETIZACAO-072 item 3 / BR-COMUNICACAO-010 item 8 — negative
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`BR-MONETIZACAO-072 item 3 / BR-COMUNICACAO-010 item 8: ${locale}.json's Legal.Terms names no subscription price in any market`, () => {
    const offenders = legalTerms(locale).filter(([, value]) => PRICE.test(value));
    expect(offenders, offenders.map(([key, value]) => `${key}: ${value}`).join("\n")).toEqual([]);
  });
}

/* ---------------------------------------------------------------------------
 * BR-MONETIZACAO-066 item 1
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`BR-MONETIZACAO-066 item 1: ${locale}.json's Legal.Terms.s6Item5 describes the 7/30-day passes as closed to new purchases`, () => {
    const item = s6Item(locale, 5);
    expect(item).toMatch(SEVEN_PRESENT);
    expect(item).toMatch(THIRTY_PRESENT);
    expect(item).toMatch(DAY_WORD);
    expect(item).toMatch(PASSES_CLOSED_TO_NEW_PURCHASES);
  });

  test(`BR-MONETIZACAO-066 item 1: ${locale}.json's Legal.Terms no longer names the Annual Pass`, () => {
    const offenders = legalTerms(locale).filter(([, value]) => ANNUAL_PRODUCT.test(value));
    expect(offenders, offenders.map(([key, value]) => `${key}: ${value}`).join("\n")).toEqual([]);
  });
}

/* ---------------------------------------------------------------------------
 * Rendering — the defect `dev` just fixed on this same page.
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`/${locale}/trust-center/terms-of-use renders section 6 with no <strong> tag escaped as literal text`, async ({
    page,
  }) => {
    const response = await page.goto(localeUrl(locale, "/trust-center/terms-of-use"));
    expect(response?.status()).toBe(200);

    const published = await publishedText(page);
    expect(published, `raw <strong> markup leaked into the ${locale} page`).not.toContain("<strong>");
    expect(published, `raw </strong> markup leaked into the ${locale} page`).not.toContain("</strong>");
  });
}
