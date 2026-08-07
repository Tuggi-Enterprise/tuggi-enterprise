import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { localizedPathname } from "../../src/i18n/pathnames";
import { A11Y_SITE_AUDIT_DATE } from "../../src/lib/product-facts";

/**
 * BR-COMUNICACAO-006 — "Afirmação de conformidade de acessibilidade: a
 *                       superfície, a medição e a validade".
 * DS-COPY-008        — "Copy que nomeia um padrão usa verbo de prática, nunca
 *                       verbo de estado".
 * BR-MAPA-005        — "Roteirização é de terceiro: o Tuggi não roteiriza"
 *                       (BR-COMUNICACAO-004, divergência 2).
 *
 * ---------------------------------------------------------------------------
 * The distinction this file mechanizes
 * ---------------------------------------------------------------------------
 *
 * Every public sentence about accessibility is a **commitment** or a **fact**,
 * and the verb is what separates them (BR-COMUNICACAO-006 item 1):
 *
 *   - a **commitment** — "estamos empenhados em garantir que … sigam" — is
 *     publishable with no measurement at all, by any surface, even one that
 *     would fail today. It is a statement about what the company does.
 *   - a **fact** — "é compatível", "cumpre", "está em conformidade" — is a
 *     statement about the product as it is, and it only publishes under items
 *     2 to 5: it names the surface it measured, it carries the date of the
 *     measurement, and it expires.
 *
 * The site published a fact for months: `Legal.Accessibility.s1Item1` claimed
 * adequate contrast with no subject and no date, which is the widest claim
 * available — a reader attributes it to everything the company ships, app
 * included, and the app still measures 2.70:1 on its primary CTA (#145).
 * `CityOS.Accessibility.desc` went further and declared conformance to a
 * standard, which WCAG 2.1 §5.2.4 makes all-or-nothing: one failed criterion
 * on one page in scope brings the whole declaration down, and the site has
 * four findings open.
 *
 * ---------------------------------------------------------------------------
 * Three rulers, and why none of them is a word list
 * ---------------------------------------------------------------------------
 *
 * **1. The pairing.** No published string puts a standard token next to a
 * state verb. This is DS-COPY-008's own criterion, it has no exceptions, and
 * it is deliberately a pairing rather than a banned word: "compatível com
 * VoiceOver e TalkBack" names a third-party product, not a standard, and it
 * stays (DS-COPY-008, 4th edge case). The positive control below asserts that
 * survivor by name, so a ruler that degenerates into "no state verb anywhere"
 * fails instead of looking stricter.
 *
 * **2. The closed inventory.** Naming the standard is allowed and is the point
 * — the institutional buyer's vocabulary survives (DS-COPY-008, 2nd edge
 * case). What is not allowed is a *new* string naming one without anybody
 * having classified it. So every message value carrying a standard token has
 * to appear in STANDARD_NAMING below, classified as commitment or fact, and an
 * unclassified one is red the day it is typed.
 *
 * `Legal.Accessibility.s1Intro` is the counterexample the inventory exists to
 * hold: it names WCAG 2.1 Level AA in four languages, it is untouched, and it
 * is correct — a commitment publishes without measurement (item 1), and item 6
 * says so in the other direction too: narrowing a claim never takes the page
 * off the air.
 *
 * **3. The obligations of a fact.** A fact names its surface and interpolates
 * its audit date from `product-facts.ts`. It may not reach for the app, the
 * CMS or a B2B module, because those were not measured — item 2's "afirmação
 * de fato sem sujeito é proibida" is about exactly this, and item 4 adds that
 * a surface outside the audit's scope is not covered by it even when the
 * defect measured is the same.
 *
 * The date's own guard is not here: `DECIDED_FACTS` in `product-facts.ts`
 * already forces all four locales to interpolate `{a11ySiteAuditDate}` or
 * `product-facts.spec.ts` goes red, and `PUBLISHED_ON` there asserts the call
 * site passes the values. Duplicating it would be a second declaration of the
 * same decision.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const MESSAGES_DIR = path.join(SRC, "messages");
const LOCALES = ["pt", "en", "es", "it"] as const;

/* ---------------------------------------------------------------------------
 * The rulers
 * ------------------------------------------------------------------------- */

/**
 * An external standard or norm, as copy names it. `ADA` and `Section 508` are
 * matched case-sensitively: lowercased they collide with ordinary words in
 * three of the four languages.
 */
const STANDARD_TOKENS: RegExp[] = [
  /\bWCAG\b/i,
  /\bEN\s?301\s?549\b/i,
  /\bSection\s?508\b/,
  /\bADA\b/,
  /\bISO\s?\d{4,5}\b/i,
];

/**
 * A verb or noun of **state** — the product as it is. DS-COPY-008's list, with
 * the morphology of the four languages: compatível/compatible/compatibile,
 * conforme/conformidade/conforms/conformità/conformidad, cumpre/cumple,
 * atende, compliant/compliance. `meets` is the English form the list implies
 * and the one an English rewrite reaches for first.
 */
const STATE_WORDS: RegExp[] = [
  /\bcompat[ií]ve(?:l|is)\b|\bcompatible?s?\b|\bcompatibil\w*/i,
  /\bconform\w*/i,
  /\bcumpr\w*|\bcumpl\w*/i,
  /\batend[ea]\w*/i,
  /\bcomplian\w*/i,
  /\bmeets?\b/i,
];

/** The verbs a claim of practice is written with (DS-COPY-008). */
const PRACTICE_WORDS: RegExp[] =
  [
    /\bsegu\w*/i, // seguimos, seguindo, siguen, seguano
    /\bfollow\w*/i,
    /\bprojetamos\b|\bdise[ñn]amos\b|\bprogettiamo\b|\bwe design\b/i,
    /\bmedimos\b|\bmisurat\w*|\bwe measured\b|\bmeasured\b/i,
    /\baplicamos\b|\bapply\b|\bapplichiamo\b/i,
    /\bempenhad\w*|\bcomprometid\w*|\bcommitted\b|\bimpegn\w*/i,
  ];

/** The site, said out loud — the only surface the 2026-08-06 audit measured. */
const SITE_SURFACE =
  /(?:d[eo]?\s*este|neste|this|questo|di\s+questo)\s+(?:site|sitio|sito)|this\s+site/i;

/**
 * Surfaces a site measurement does not reach (item 2). None of them was
 * audited, and the app is measured *against* the claim: 2.70:1, issue #145.
 */
const OTHER_SURFACES: RegExp[] = [
  /\baplicativo\b|\baplicaci[oó]n\b|\bapplicazione\b|\bmobile app\b|\bapp m[oó]vel\b/i,
  /\bplataforma\b|\bplatform\b|\bpiattaforma\b/i,
  /\bCMS\b/,
];

/** Routing, which is a third party's job — BR-MAPA-005. */
const ROUTING_WORDS: RegExp[] = [
  /\bnavega\w*|\bnavigat\w*|\bnavigazion\w*/i,
  /turn-?by-?turn/i,
  /\brotas?\b|\brutas?\b|\brotte\b|\broutes?\b/i,
];

function hits(patterns: RegExp[], text: string): string[] {
  return patterns.flatMap((pattern) => {
    const match = text.match(pattern);
    return match ? [match[0]] : [];
  });
}

/* ---------------------------------------------------------------------------
 * The inventory
 * ------------------------------------------------------------------------- */

interface StandardNamingEntry {
  /**
   * `compromisso` publishes with no measurement; `fato` owes a surface and a
   * date. BR-COMUNICACAO-006 item 1.
   */
  kind: "compromisso" | "fato";
  why: string;
}

/**
 * Every message key whose value may name a standard, and what it is.
 *
 * This is a closed list on purpose: a new sentence about WCAG is a decision
 * that goes through BR-COMUNICACAO-006, not a copy tweak.
 */
const STANDARD_NAMING: Record<string, StandardNamingEntry> = {
  "CityOS.Accessibility.desc": {
    kind: "compromisso",
    why:
      "The /destinations pitch. 'Projetamos seguindo as WCAG 2.1 AA' is what " +
      "we do, not a state the product is in — it replaced 'Compatível com " +
      "WCAG 2.1 AA', a conformance declaration this site cannot make while " +
      "findings 6, 7 and 8 of the August audit are open (item 3).",
  },
  "Legal.Accessibility.s1Title": {
    kind: "compromisso",
    why:
      "The section heading. It keeps the standard in the title — retiring it " +
      "would be defensive pruning (BR-COMUNICACAO-005 item 1) — and drops " +
      "'Conformidade Técnica', which asserted the all-or-nothing claim of " +
      "WCAG 2.1 §5.2.4 in a heading.",
  },
  "Legal.Accessibility.s1Intro": {
    kind: "compromisso",
    why:
      "Untouched, and it is the counterexample this inventory exists to hold. " +
      "It covers 'plataforma digital e aplicativo móvel' — surfaces no audit " +
      "measured — and that is allowed precisely because it promises effort " +
      "instead of stating a fact (item 1). Rewriting it as a fact, or " +
      "deleting it to be safe, both break the rule in different directions.",
  },
  "Legal.Accessibility.s1Item1": {
    kind: "fato",
    why:
      "The only fact the site publishes about accessibility: the palette, " +
      "measured against the AA contrast minimum on 2026-08-06, after issue " +
      "#183 took axe from 53 nodes to 0. It names the site and only the site, " +
      "and it carries its date from product-facts.ts.",
  },
};

/* ---------------------------------------------------------------------------
 * Reading the sources
 * ------------------------------------------------------------------------- */

function flatMessages(locale: string): Map<string, string> {
  const raw = JSON.parse(
    fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"),
  ) as Record<string, unknown>;
  const out = new Map<string, string>();
  const walk = (node: unknown, prefix: string) => {
    if (typeof node === "string") out.set(prefix, node);
    else if (node && typeof node === "object")
      for (const [key, value] of Object.entries(node))
        walk(value, prefix ? `${prefix}.${key}` : key);
  };
  walk(raw, "");
  return out;
}

/** Every string literal and JSX text node under src/ — comments excluded. */
function tsxLiterals(): { relative: string; text: string }[] {
  const files: string[] = [];
  const walkDir = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (full === path.join(SRC, "data") || full === MESSAGES_DIR) continue;
      if (entry.isDirectory()) walkDir(full);
      else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  walkDir(SRC);

  const out: { relative: string; text: string }[] = [];
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isJsxText(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const text = node.text.trim();
        if (text) out.push({ relative: path.relative(REPO_ROOT, file), text });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 1. The pairing — DS-COPY-008
 * ------------------------------------------------------------------------- */

test.describe("DS-COPY-008 — a standard is named with a verb of practice, never of state", () => {
  for (const locale of LOCALES) {
    test(`DS-COPY-008: src/messages/${locale}.json states no conformance`, () => {
      const offenders: string[] = [];
      for (const [key, value] of flatMessages(locale)) {
        const standards = hits(STANDARD_TOKENS, value);
        if (standards.length === 0) continue;
        const states = hits(STATE_WORDS, value);
        if (states.length > 0) {
          offenders.push(`${key} — "${standards.join(", ")}" with "${states.join(", ")}"`);
        }
      }
      expect(
        offenders,
        "BR-COMUNICACAO-006 item 3: naming a standard next to a verb of state " +
          "is a conformance declaration, and WCAG 2.1 §5.2.4 makes it " +
          "all-or-nothing — one failed criterion on one page in scope brings " +
          "it down. No Tuggi surface can make one today. Say what we do " +
          "instead (DS-COPY-008): seguimos, projetamos seguindo, medimos contra.",
      ).toEqual([]);
    });
  }

  test("DS-COPY-008: no literal under src/ states conformance either", () => {
    const offenders: string[] = [];
    for (const { relative, text } of tsxLiterals()) {
      const standards = hits(STANDARD_TOKENS, text);
      if (standards.length === 0) continue;
      const states = hits(STATE_WORDS, text);
      if (states.length > 0) offenders.push(`${relative} — "${text}"`);
    }
    expect(
      offenders,
      "DS-COPY-008 covers title, label, alt, store metadata and badge — a " +
        "claim hard-coded in a component never reaches src/messages and so " +
        "never reaches the scan above.",
    ).toEqual([]);
  });

  // The positive control. A ruler that banned the state verb outright would
  // pass every test above while quietly deleting a true and useful sentence:
  // VoiceOver and TalkBack are third-party products, not standards, and
  // DS-COPY-008's 4th edge case keeps them.
  test("DS-COPY-008 (4th edge case): compatibility with a third-party product stays", () => {
    for (const key of ["CityOS.Accessibility.Panel.feat1Desc", "Legal.Accessibility.s1Item2"]) {
      const withStateWord: string[] = [];

      for (const locale of LOCALES) {
        const value = flatMessages(locale).get(key);
        expect(value, `${key} is missing from ${locale}.json`).toBeDefined();
        expect(
          /VoiceOver/i.test(value!) || /TalkBack/i.test(value!),
          `${key} no longer names a screen reader — if the sentence changed, ` +
            "this control has to move with it or it stops proving anything.",
        ).toBe(true);
        expect(
          hits(STANDARD_TOKENS, value!),
          `${key} names a product; the moment it also names a standard it stops ` +
            "being the edge case and comes under the inventory.",
        ).toEqual([]);
        if (hits(STATE_WORDS, value!).length > 0) withStateWord.push(locale);
      }

      // Not every language: `en` says "Works with VoiceOver and TalkBack",
      // which needs no waiver at all. What the control has to prove is that at
      // least one of these sentences carries a word the pairing sweep would
      // report if the standard were beside it — otherwise widening the ruler
      // to ban the word outright would still pass here.
      expect(
        withStateWord,
        `${key} carries no state word in any language any more. This control ` +
          "stops proving that the ruler is a pairing rather than a word list, " +
          "and DS-COPY-008's 4th edge case loses its executable half.",
      ).not.toEqual([]);
    }
  });
});

/* ---------------------------------------------------------------------------
 * 2. The closed inventory — BR-COMUNICACAO-006 items 1 and 2
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-006 — every sentence that names a standard is classified", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-006 item 1: ${locale}.json names no standard outside the inventory`, () => {
      const unclassified: string[] = [];
      for (const [key, value] of flatMessages(locale)) {
        if (hits(STANDARD_TOKENS, value).length === 0) continue;
        if (!(key in STANDARD_NAMING)) unclassified.push(`${key} — "${value}"`);
      }
      expect(
        unclassified,
        "A new sentence naming WCAG, EN 301 549, Section 508, ADA or an ISO " +
          "norm is a decision under BR-COMUNICACAO-006, not a copy tweak: it " +
          "is a commitment (publishable with no measurement) or a fact (which " +
          "owes a surface, a date and six months of validity). Classify it in " +
          "STANDARD_NAMING with the reason written down.",
      ).toEqual([]);
    });
  }

  test("BR-COMUNICACAO-006: the inventory describes strings that exist, in four languages", () => {
    for (const [key, entry] of Object.entries(STANDARD_NAMING)) {
      expect(entry.why.trim().length, `${key}: entry with no reason`).toBeGreaterThan(60);
      for (const locale of LOCALES) {
        const value = flatMessages(locale).get(key);
        expect(value, `${key} is missing from ${locale}.json`).toBeDefined();
        expect(
          hits(STANDARD_TOKENS, value!).length,
          `${key} no longer names a standard in ${locale}.json — an entry that ` +
            "outlives what it classified is permission with no owner.",
        ).toBeGreaterThan(0);
      }
    }
  });

  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-006 item 1: every commitment in ${locale}.json says what we do`, () => {
      for (const [key, entry] of Object.entries(STANDARD_NAMING)) {
        if (entry.kind !== "compromisso") continue;
        const value = flatMessages(locale).get(key)!;
        expect(
          hits(PRACTICE_WORDS, value).length,
          `${key} names a standard and no longer says what we do with it. A ` +
            "commitment is publishable with no measurement — that is its whole " +
            "licence (item 1) — but only while the verb is ours.",
        ).toBeGreaterThan(0);
      }
    });
  }

  // s1Intro by name, because item 6 has a direction the sweeps above cannot
  // express: narrowing a claim never takes the page down, and the commitment
  // stays publishable with nothing measured behind it.
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-006 items 1 and 6: ${locale} keeps the commitment that no audit backs`, () => {
      const value = flatMessages(locale).get("Legal.Accessibility.s1Intro")!;
      expect(STANDARD_NAMING["Legal.Accessibility.s1Intro"].kind).toBe("compromisso");
      expect(
        hits(OTHER_SURFACES, value).length,
        "s1Intro covers the platform and the mobile app on purpose. Neither " +
          "was audited, and a commitment does not need to be — stripping the " +
          "surfaces out would be pruning a sentence the rule allows.",
      ).toBeGreaterThan(0);
      expect(
        value,
        "A commitment carries no measurement date: adding one turns it into " +
          "the claim of fact item 1 keeps it out of.",
      ).not.toContain("a11ySiteAuditDate");
    });
  }
});

/* ---------------------------------------------------------------------------
 * 3. What a fact owes — BR-COMUNICACAO-006 items 2, 4 and 5
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-006 — a fact names its surface and carries its date", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-006 items 2 and 4: every fact in ${locale}.json is scoped and dated`, () => {
      for (const [key, entry] of Object.entries(STANDARD_NAMING)) {
        if (entry.kind !== "fato") continue;
        const value = flatMessages(locale).get(key)!;

        expect(
          SITE_SURFACE.test(value),
          `${key} states a fact without naming the surface it measured. Item 2: ` +
            "that is not a harmless omission, it is the widest claim available " +
            "— the reader attributes it to everything the company ships.",
        ).toBe(true);

        expect(
          hits(OTHER_SURFACES, value),
          `${key} reaches past the audited surface. Item 4: a surface outside ` +
            "the audit's scope is not covered by it even when the defect is the " +
            "same — the 2.70:1 pair was identical in the site and the app and " +
            "only one of them was fixed (#145).",
        ).toEqual([]);

        expect(
          value,
          `${key} states a fact with no date. Items 4 and 5: the measurement ` +
            "expires six months after it was taken, and a sentence with no date " +
            "cannot expire.",
        ).toContain("{a11ySiteAuditDate}");

        expect(
          value,
          `${key} spells the audit date out instead of reading it from ` +
            "product-facts.ts (BR-COMUNICACAO-002). A date typed into copy goes " +
            "stale one language at a time.",
        ).not.toContain(A11Y_SITE_AUDIT_DATE);
      }
    });
  }
});

/* ---------------------------------------------------------------------------
 * 4. BR-MAPA-005 in the accessibility pitch
 * ------------------------------------------------------------------------- */

/**
 * The /destinations sentence used to sell "navegação 'Audio-first'" — the
 * second divergence BR-COMUNICACAO-004 recorded, because BR-MAPA-005 says the
 * Tuggi does not route and Google Maps, Waze and Apple Maps are partners.
 *
 * Scoped to this one key, and that scope is the finding: the *other*
 * accessibility strings talk about navigating an interface with a screen
 * reader, which is the same word and the opposite meaning. A sitewide ban on
 * "navegação" would delete `Legal.Accessibility.s1Item2`.
 */
test.describe("BR-MAPA-005 — the accessibility pitch does not sell routing", () => {
  for (const locale of LOCALES) {
    test(`BR-MAPA-005: CityOS.Accessibility.desc claims no navigation in ${locale}.json`, () => {
      const value = flatMessages(locale).get("CityOS.Accessibility.desc")!;
      expect(
        hits(ROUTING_WORDS, value),
        "BR-COMUNICACAO-004 divergence 2. The audio experience describes the " +
          "surroundings; it does not take the tourist anywhere. Routing belongs " +
          "to the map app already open on the windscreen (BR-MAPA-005).",
      ).toEqual([]);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 5. What the page actually serves
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-006 item 6 — the statement page stays up, with its channel", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-006 item 6: /${locale}/trust-center/accessibility serves the reporting channel`, async ({
      page,
    }) => {
      const slug = localizedPathname(locale, "/trust-center/accessibility");
      const response = await page.goto(`/${locale}${slug}`);
      expect(
        response?.status(),
        "Applying items 2 and 3 narrows what the page claims; it never takes " +
          "the page down. Art. 13(2) of Directive (EU) 2019/882 obliges the " +
          "provider to publish how the service meets the requirements and how " +
          "to make contact.",
      ).toBe(200);

      const email = flatMessages(locale).get("Legal.Accessibility.contactEmail")!;
      await expect(
        page.locator(`a[href="mailto:${email}"]`),
        "The channel needs a human outcome behind it, and a mailto is the one " +
          "this page has (item 6, and the W3C/WAI minimum for a statement).",
      ).toBeVisible();

      const served = await page.evaluate(() => document.body.innerText);
      expect(served).toContain(A11Y_SITE_AUDIT_DATE);
      expect(served).not.toContain("{a11ySiteAuditDate}");
    });
  }
});
