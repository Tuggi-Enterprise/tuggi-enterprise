import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  AUDIO_GUIDES_FLOOR,
  CONTENT_LANGUAGES,
  COVERAGE_COUNTRIES,
  MAPPED_POINT_MILLIONS,
  OPERATING_SINCE,
  STORIES_PLAYED,
  PRODUCT_FACTS,
} from "../../src/lib/product-facts";
import {
  PROOF_LINES,
  PROOF_FACTS,
  visibleProofLines,
  type ProofFacts,
} from "../../src/lib/proof-lines";

/**
 * BR-COMUNICACAO-003 — "Prova social de uso: só o que a instrumentação
 *                       sustenta", and its item 7, which says what the proof
 *                       block is built with instead.
 * BR-COMUNICACAO-002 — items 2, 3, 6, 8 and 9: what each figure counts.
 * BR-IDIOMA-001      — item 2: the audio catalogue is ten languages, and the
 *                      sentence has to say it is the audio catalogue.
 * DS-COPY-005        — no product figure written by hand.
 *
 * Card #193, component 4.2. Spec §2 of
 * `docs/design/spec-repaginacao-site-2026-08.md`.
 *
 * ---------------------------------------------------------------------------
 * What this guards, and what it cannot guard yet
 * ---------------------------------------------------------------------------
 *
 * The block is built and deliberately not mounted: the home reordering is
 * #194. So there is no page to read, and everything below is asserted against
 * the two things that exist — the message files in four languages and the pure
 * module that decides which lines may be drawn. `product-facts.spec.ts` holds
 * the other half by name: `NOT_MOUNTED_YET` there is what makes the omission
 * from `PUBLISHED_ON` an entry with a card on it rather than a hole, and the
 * day #194 lands the rendered assertions are that file's, not a second copy
 * here.
 *
 * ---------------------------------------------------------------------------
 * The claim this block exists to *not* make
 * ---------------------------------------------------------------------------
 *
 * The spec's first line was *"Mais de {storiesPlayed} histórias já tocadas por
 * viajantes do mundo todo"*, and the number behind it was 50,000 against a
 * measured 1,653 raw plays — 201 once the team's own accounts came out, from
 * seven external people. The operator closed it on 2026-08-07 and item 5 keeps
 * it closed. The first test below is the one that matters most in this file:
 * it is not enough that the sentence is gone, the block must be incapable of
 * carrying a usage figure at all, in any language, by any placeholder.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");
const LOCALES = ["pt", "en", "es", "it"] as const;

function proofMessages(locale: string): Record<string, string> {
  const raw = JSON.parse(
    fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"),
  ) as { Proof?: Record<string, string> };
  return raw.Proof ?? {};
}

/** Every ICU placeholder in a message, simple or formatted. */
function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{\s*([A-Za-z][A-Za-z0-9_]*)\s*[,}]/g)].map((m) => m[1]);
}

/* ---------------------------------------------------------------------------
 * 1. No usage figure, by construction
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-003 — the proof block publishes no figure of use", () => {
  test("BR-COMUNICACAO-003 items 1 to 5: no line reads a usage value, in any language", () => {
    // The decision itself, restated where the block that would have published
    // it lives. Item 4 closes the escape a smaller invented figure would be.
    expect(STORIES_PLAYED).toBeNull();

    const usage = /storiesPlayed|plays|listens|users|travellers|downloads|installs/i;
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(proofMessages(locale))) {
        for (const name of placeholdersIn(value)) {
          expect(
            usage.test(name),
            `Proof.${key} in ${locale}.json interpolates {${name}}. Only the ` +
              "store consoles can source a usage figure (item 6), no agent " +
              "measures or estimates one, and it arrives with the operator or " +
              "not at all.",
          ).toBe(false);
        }
      }
    }
  });

  test("BR-COMUNICACAO-003 item 7: the block is built from measured, owned facts", () => {
    // Each line names the rules that own its figures. The point is not the
    // list — it is that a line without one cannot be added quietly, which is
    // how the 50,000 got in.
    for (const line of PROOF_LINES) {
      expect(line.rules.length, `Proof line "${line.key}" cites no rule`).toBeGreaterThan(0);
      for (const rule of line.rules) {
        expect(rule).toMatch(/^(BR|DS)-[A-Z]+-\d{3} item \d+$/);
      }
      expect(line.reads.length, `Proof line "${line.key}" reads no module value`)
        .toBeGreaterThan(0);
    }

    // The four facts item 7 names, read from the module and not from here.
    expect(PROOF_FACTS.mappedPointMillions).toBe(MAPPED_POINT_MILLIONS);
    expect(PROOF_FACTS.coverageCountries).toBe(COVERAGE_COUNTRIES);
    expect(PROOF_FACTS.audioGuidesFloor).toBe(AUDIO_GUIDES_FLOOR);
    expect(PROOF_FACTS.contentLanguages).toBe(CONTENT_LANGUAGES);
    expect(PROOF_FACTS.operatingSince).toBe(OPERATING_SINCE);
  });
});

/* ---------------------------------------------------------------------------
 * 2. What each figure may be paired with — BR-COMUNICACAO-002 items 2 and 3
 * ------------------------------------------------------------------------- */

test.describe("BR-COMUNICACAO-002 — presence and content are not the same claim", () => {
  /** Nouns that mean narrated content, in the four languages. */
  const CONTENT_NOUN =
    /hist[oó]ria|stor(?:y|ies)|storie|racconti|gu[ií]a|guide|narra|roteir|itinerar|audioguí|audioguide|áudio-guia/i;
  /** Nouns that mean the map's reach. */
  const PRESENCE_NOUN = /pontos?|points?|punti|pa[ií]s|countr|paesi|regi/i;

  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-002 item 2: the archive line carries no content noun in ${locale}.json`, () => {
      const points = proofMessages(locale).points;
      expect(points, `Proof.points is missing from ${locale}.json`).toBeDefined();
      expect(placeholdersIn(points)).toContain("mappedPointMillions");

      // Two orders of magnitude apart, and this is the sentence the mistake is
      // actually made on: the coverage page once published two million
      // *histórias prontas para tocar*, and there are 16,910 of those.
      expect(
        CONTENT_NOUN.test(points.replace(/\{[^}]*\}/g, "")),
        "The archive figure may only carry 'ponto mapeado', 'ponto de " +
          "interesse' or 'ponto no mapa' — never história, guia, áudio, " +
          "narração or roteiro (item 8's closed list).",
      ).toBe(false);
    });

    test(`BR-COMUNICACAO-002 item 3: the guide line claims no country or region in ${locale}.json`, () => {
      const guides = proofMessages(locale).guides;
      expect(guides, `Proof.guides is missing from ${locale}.json`).toBeDefined();
      expect(placeholdersIn(guides)).toContain("audioGuidesFloor");

      // The pairing that is false: France, Canada and Ireland are 27% of the
      // map with no guide at all. The country figure that may carry a content
      // noun is the one measured on produced guides, and nothing publishes it.
      expect(placeholdersIn(guides)).not.toContain("coverageCountries");
      expect(
        PRESENCE_NOUN.test(guides.replace(/\{[^}]*\}/g, "")),
        "A guide count next to a presence figure claims narration where there " +
          "is none (item 3).",
      ).toBe(false);

      // BR-IDIOMA-001 item 2: the language figure has to say which catalogue
      // it counts. A bare "in 10 languages" is what let a content figure be
      // read against an interface figure.
      expect(placeholdersIn(guides)).toContain("contentLanguages");
      expect(guides).toMatch(/[aá]udio/i);
    });
  }
});

/* ---------------------------------------------------------------------------
 * 3. No figure written by hand — DS-COPY-005
 * ------------------------------------------------------------------------- */

test.describe("DS-COPY-005 — every number in the block comes from the module", () => {
  for (const locale of LOCALES) {
    test(`DS-COPY-005: no digit is typed into the proof copy in ${locale}.json`, () => {
      for (const [key, value] of Object.entries(proofMessages(locale))) {
        // Placeholders removed first: `{audioGuidesFloor, number}` is a slot,
        // not a figure. What is left may not contain a digit at all — this
        // block has no version numbers, no ordinals and no prices.
        const withoutSlots = value.replace(/\{[^}]*\}/g, "");
        expect(
          withoutSlots,
          `Proof.${key} in ${locale}.json spells a number out. Every figure ` +
            "here is owned by a rule and read from product-facts.ts.",
        ).not.toMatch(/\d/);
      }

      // Every placeholder the copy uses is a name the module actually
      // publishes — a typo renders as literal braces to the visitor.
      const known = Object.keys(PRODUCT_FACTS);
      for (const [key, value] of Object.entries(proofMessages(locale))) {
        for (const name of placeholdersIn(value)) {
          expect(known, `Proof.${key} interpolates an unknown {${name}}`).toContain(name);
        }
      }
    });
  }

  test("DS-COPY-005: the three lines exist in all four languages, and only those", () => {
    const expected = PROOF_LINES.map((line) => line.message).sort();
    for (const locale of LOCALES) {
      expect(
        Object.keys(proofMessages(locale)).sort(),
        `${locale}.json does not carry exactly the lines the module draws. A ` +
          "string with no line renders nowhere; a line with no string renders " +
          "its own key.",
      ).toEqual(expected);
    }
  });

  test("BR-COMUNICACAO-002 item 4: the two floors are announced as floors", () => {
    // "Mais de", "More than", "Más de", "Oltre". A floor rendered bare reads
    // as an exact count, which is the whole reason item 4 exists.
    const FLOOR_WORDS = /mais de|more than|m[áa]s de|oltre/i;
    for (const locale of LOCALES) {
      const messages = proofMessages(locale);
      for (const key of ["points", "guides"]) {
        expect(
          FLOOR_WORDS.test(messages[key]),
          `Proof.${key} in ${locale}.json publishes a floor without saying so. ` +
            "The archive moved 48,120 rows in 24 days; the figure is only true " +
            "as a floor.",
        ).toBe(true);
      }
    }
  });
});

/* ---------------------------------------------------------------------------
 * 4. The missing-value state — spec §2.4 and §2.6
 * ------------------------------------------------------------------------- */

test.describe("Spec §2.4 — a line with no value does not render, and neither does an empty block", () => {
  test("§2.6 item 3: dropping operatingSince removes the third line and nothing else", () => {
    const without: ProofFacts = { ...PROOF_FACTS, operatingSince: null };
    const keys = visibleProofLines(without).map((line) => line.key);

    expect(keys).toEqual(["points", "guides"]);
    // The point of the spec's criterion: the line disappears, it does not
    // become a dash, a zero or an empty paragraph holding its own spacing.
    expect(keys).not.toContain("since");
  });

  test("§2.4: a line loses all of its values, or none — one missing figure is enough", () => {
    for (const line of PROOF_LINES) {
      for (const name of line.reads) {
        const facts: ProofFacts = { ...PROOF_FACTS, [name]: null };
        expect(
          visibleProofLines(facts).map((l) => l.key),
          `Proof line "${line.key}" still renders with ${name} missing, which ` +
            "means the sentence publishes a slot the module cannot fill.",
        ).not.toContain(line.key);
      }
    }
  });

  test("§2.4: with nothing to say, the block says nothing", () => {
    const empty: ProofFacts = {
      mappedPointMillions: null,
      coverageCountries: null,
      audioGuidesFloor: null,
      contentLanguages: null,
      operatingSince: null,
    };
    expect(visibleProofLines(empty)).toEqual([]);
  });

  test("§2.4: today the module has all three lines", () => {
    expect(visibleProofLines(PROOF_FACTS).map((line) => line.key)).toEqual([
      "points",
      "guides",
      "since",
    ]);
  });
});

/* ---------------------------------------------------------------------------
 * 5. The form the spec fixed — read off the component
 * ------------------------------------------------------------------------- */

/**
 * Three of the spec's "do not" are decisions in the markup, and they are worth
 * a source assertion for one reason: each one is a thing a later, reasonable
 * edit adds back. A counter that animates, a grid of three, a coloured span
 * instead of a `<strong>` — none of them looks like a defect on review.
 */
test.describe("Spec §2.2 and §2.5 — the shape of the block", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "src/components/blocks/ProofBlock.tsx"),
    "utf8",
  );

  test("§2.5: no animated counter, no grid of three, no colour-only emphasis", () => {
    expect(source, "Animation is the first thing prefers-reduced-motion removes")
      .not.toMatch(/animate-|motion\.|useSpring|framer/);
    expect(source, "§2.3: three unequal columns read as a layout error").not.toMatch(
      /grid-cols-3|sm:grid-cols-3|lg:grid-cols-3/,
    );
    // The figure is emphasised semantically. A <span> with a colour says
    // nothing to a screen reader and nothing in forced-colours mode.
    expect(source).toContain("<strong");
  });

  test("DS-COR-004: the filled surface is tuggi-dark, and the figure is never brand cyan", () => {
    expect(source).toContain("bg-tuggi-dark");
    expect(
      source,
      "--color-tuggi-primary measures 2.56:1 on --color-tuggi-bg and fails SC 1.4.3",
    ).not.toMatch(/text-tuggi-primary\b/);
  });

  test("§2.1: the block takes no copy by prop", () => {
    // Same proof on every page it appears on. A `title` or `lines` prop is how
    // two pages come to prove different things.
    expect(source).not.toMatch(/\b(title|lines|items|children)\??:/);
  });

  test("BR-COMUNICACAO-002 item 5: nothing here reads the generated snapshot", () => {
    // The snapshot's counts apply a 50-POI rendering threshold. Reading them as
    // coverage is how the site came to publish 39 countries.
    expect(source).not.toMatch(/coverage-snapshot|getCoverageData|totalActive/);
    const lib = fs.readFileSync(path.join(REPO_ROOT, "src/lib/proof-lines.ts"), "utf8");
    expect(lib).not.toMatch(/coverage-snapshot|getCoverageData|totalActive/);
  });
});
