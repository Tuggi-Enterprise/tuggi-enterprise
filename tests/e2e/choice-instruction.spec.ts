import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "../../src/i18n/locales";

/**
 * DS-COPY-014 and BR-COMUNICACAO-006 item 6 — an instruction that tells the
 * reader to choose describes the criterion; if it transcribes the label, the
 * label it names is one the destination surface actually renders.
 *
 * ---------------------------------------------------------------------------
 * What happened
 * ---------------------------------------------------------------------------
 *
 * Three keys — `Legal.Accessibility.s3Item1`, `Legal.Privacy.s6P3` and
 * `Legal.Terms.s4Text` — sent the visitor to `/contact` to pick an option
 * called "Suporte / Acessibilidade", "Suporte" or "Turista / Suporte". The
 * triage has three cards and none of them is called that
 * (`Contact.Triage.card{1,2,3}Title`). **12 published values**, four locales,
 * measured on 2026-08-14 (card #325). None of the three sentences was born
 * wrong: the card labels were renamed afterwards and nothing held the two ends
 * together.
 *
 * The Spanish one shows why a per-locale grep finds a quarter of the defect:
 * `Legal.Terms.s4Text` in `es` told the reader to pick "Turista / **Suporte**"
 * — the Portuguese word inside the Spanish sentence.
 *
 * ---------------------------------------------------------------------------
 * Why the labels come off the page and not out of a constant
 * ---------------------------------------------------------------------------
 *
 * Comparing the sentence against `Contact.Triage.card3Title` read from the same
 * message file would only prove that two copies of the catalogue agree — which
 * they always do, since it is one file. The distance that breaks is between the
 * **key** and the **rendered control**, so this guard loads `/{locale}/contact`
 * and reads the label off the button the visitor clicks. Rename the card and
 * any sentence still transcribing the old name goes red, in every locale.
 *
 * The detector is deliberately narrow: a choice verb, then within 40 characters
 * either a quoted string or a label attached to the word "option". Both shapes
 * appear in the 12 values this card removed — eight quoted, four not — and they
 * are replayed below as a positive control, because with the catalogue fixed
 * the sweep finds nothing and a broken regex would look exactly the same.
 */

const MESSAGES_DIR = path.resolve(__dirname, "../../src/messages");

/** The verbs that turn a sentence into an instruction to pick something. */
const CHOICE_VERB =
  /selecionand|escolhend|selecting|choosing|seleccionand|eligiend|selezionand|scegliend/gi;

/** How far after the verb a transcribed label still belongs to the instruction. */
const WINDOW = 40;

/** `selecionando a opção "Turista / Suporte"` — the label between quotes. */
const QUOTED = /["“«]([^"”»]{1,60})["”»]/g;

/** `la opción de Soporte`, `l'opzione Supporto` — the label after the noun. */
const CAPITALISED = "[A-ZÀ-Ý][^\\W\\d_]*";
const RUN = `${CAPITALISED}(?:\\s*/\\s*${CAPITALISED}|\\s+${CAPITALISED})*`;
const AFTER_NOUN = new RegExp(
  `(?:opção|opción|opzione|option)s?\\s+(?:de\\s+|di\\s+|del\\s+|della\\s+)?(${RUN})`,
  "gu",
);

/** `the Support option` — English puts the label first. */
const BEFORE_NOUN = new RegExp(`(${RUN})\\s+option\\b`, "gu");

type Messages = { [key: string]: string | Messages };

type Transcription = { key: string; label: string };

function messagesFor(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Messages;
}

function flatValues(messages: Messages, prefix = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "string"
      ? ([[`${prefix}${key}`, value]] as [string, string][])
      : flatValues(value, `${prefix}${key}.`),
  );
}

/** Every label a value transcribes right after telling the reader to choose. */
function labelsTranscribedIn(value: string): string[] {
  const found: string[] = [];
  for (const verb of value.matchAll(CHOICE_VERB)) {
    const after = (verb.index ?? 0) + verb[0].length;
    const window = value.slice(after, after + WINDOW);
    for (const shape of [QUOTED, AFTER_NOUN, BEFORE_NOUN]) {
      for (const hit of window.matchAll(shape)) {
        const label = hit[1]?.trim();
        if (label) found.push(label);
      }
    }
  }
  return found;
}

function transcriptionsFor(locale: string): Transcription[] {
  return flatValues(messagesFor(locale)).flatMap(([key, value]) =>
    labelsTranscribedIn(value).map((label) => ({ key, label })),
  );
}

/** Rendered and written labels differ in casing and spacing, never in words. */
const normalise = (label: string) => label.replace(/\s+/g, " ").trim().toLocaleLowerCase();

/* ---------------------------------------------------------------------------
 * The guard — against what /contact renders
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`DS-COPY-014: ${locale} — no published instruction names a choice label /contact does not render`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/contact`);

    // Structural locator on purpose: the three triage cards are the only
    // headings inside a button on this page. Anchoring on the copy would make
    // the guard depend on the very string it is checking.
    const rendered = await page.locator("button h2").allInnerTexts();

    expect(
      rendered.length,
      `${locale}/contact renders no choice control — the guard would be vacuously green.`,
    ).toBeGreaterThanOrEqual(3);

    const offered = new Set(rendered.map(normalise));

    const offenders = transcriptionsFor(locale).filter(
      (hit) => !offered.has(normalise(hit.label)),
    );

    expect(
      offenders.map((hit) => `${locale}.json ${hit.key} → "${hit.label}"`),
      `DS-COPY-014: the instruction transcribes a label the contact page does not offer ` +
        `(it renders ${rendered.map((label) => `"${label}"`).join(", ")}). ` +
        `Describe the criterion instead — a transcribed label goes stale in silence when the card is renamed (#325).`,
    ).toEqual([]);

    // The other direction: transcribing a label that *is* rendered is allowed,
    // and has to stay allowed, or the guard degenerates into "never quote".
    // Built from the rendered text, so it also proves the acceptance path reads
    // the page rather than the catalogue.
    const faithful = `selecionando a opção "${rendered[0]}"`;
    expect(
      labelsTranscribedIn(faithful).filter((label) => !offered.has(normalise(label))),
      "A sentence quoting a label the page really renders must be accepted.",
    ).toEqual([]);
  });
}

/* ---------------------------------------------------------------------------
 * Positive control — the 12 values #325 removed
 * ------------------------------------------------------------------------- */

/**
 * The instruction fragment of each of the 12 published values as they stood at
 * `fd3d9ec`, with the ghost label the detector has to pull out of it. Eight
 * quoted, four bare — if a future edit narrows the detector to one of the two
 * shapes, this list says so.
 */
const REMOVED_BY_325: { where: string; sentence: string; ghost: string }[] = [
  // Legal.Accessibility.s3Item1
  { where: "pt s3Item1", sentence: 'de Contato, selecionando a opção "Suporte / Acessibilidade".', ghost: "Suporte / Acessibilidade" },
  { where: "en s3Item1", sentence: 'Contact page, selecting the "Support / Accessibility" option.', ghost: "Support / Accessibility" },
  { where: "es s3Item1", sentence: 'de Contacto, seleccionando la opción "Soporte / Accesibilidad".', ghost: "Soporte / Accesibilidad" },
  { where: "it s3Item1", sentence: "pagina Contatti, selezionando l'opzione \"Supporto / Accessibilità\".", ghost: "Supporto / Accessibilità" },
  // Legal.Privacy.s6P3
  { where: "pt s6P3", sentence: ", selecionando a opção de Suporte.", ghost: "Suporte" },
  { where: "en s6P3", sentence: " page, by selecting the Support option.", ghost: "Support" },
  { where: "es s6P3", sentence: ", seleccionando la opción de Soporte.", ghost: "Soporte" },
  { where: "it s6P3", sentence: ", selezionando l'opzione Supporto.", ghost: "Supporto" },
  // Legal.Terms.s4Text
  { where: "pt s4Text", sentence: 'de Contato (selecionando a opção "Turista / Suporte").', ghost: "Turista / Suporte" },
  { where: "en s4Text", sentence: 'Contact page (selecting the "Tourist / Support" option).', ghost: "Tourist / Support" },
  { where: "es s4Text", sentence: 'de Contacto (seleccionando la opción "Turista / Suporte").', ghost: "Turista / Suporte" },
  { where: "it s4Text", sentence: "pagina Contatti (selezionando l'opzione \"Turista / Supporto\").", ghost: "Turista / Supporto" },
];

test("DS-COPY-014: the detector still fires on the 12 values #325 removed", () => {
  const missed = REMOVED_BY_325.filter(
    (sample) => !labelsTranscribedIn(sample.sentence).includes(sample.ghost),
  );

  expect(
    missed.map((sample) => `${sample.where} → expected "${sample.ghost}"`),
    "The sweep above is vacuously green once the catalogue is clean, so it has to prove it still " +
      "sees the shape of the defect. These 12 fragments are the published values at fd3d9ec.",
  ).toEqual([]);

  expect(REMOVED_BY_325.length, "Baseline measured on 2026-08-14: 12 values, going to 0.").toBe(12);
});
