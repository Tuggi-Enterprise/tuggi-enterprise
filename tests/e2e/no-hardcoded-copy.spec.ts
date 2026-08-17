import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * DS-COPY-001 — "nothing shown to the user is born in code": user-facing text
 * lives in i18n and is translated.
 * BR-IDIOMA-001 item 3 — the site's interface catalogue is four locales:
 * en, es, it, pt.
 *
 * The defect this guards against is not a missing translation. Every string
 * card #192 collected was *present* in the JSX, in English, and therefore
 * served identically to a Portuguese, Spanish and Italian visitor — the four
 * message files had no gap to find. Eight rounds of that shipped before anyone
 * counted them, which is why this file scans the source instead of listing the
 * eight sentences: a list only catches the string somebody already wrote.
 *
 * What counts as user-visible text, and what does not
 * ---------------------------------------------------------------------------
 * The scan parses every .tsx under src/ with the TypeScript compiler — not a
 * regular expression, because `className` strings, `t("key")` arguments and
 * locale tags all look like copy to a regex — and reports three things:
 *
 *   1. JSX text nodes containing a letter;
 *   2. the attributes a human actually perceives (alt, aria-label,
 *      placeholder, title...) when given a literal;
 *   3. string literals in the *value* position of a JSX child expression —
 *      `{cond ? "Playing" : "Paused"}`. This is the shape the locale ternary
 *      takes in this repo, and it is invisible to a scan of text nodes.
 *
 * Text inside <pre> and <code> is skipped by construction: a JSON payload
 * rendered as a sample is not prose, and nobody translates `event_id`.
 *
 * Everything else that survives is waived below, one entry at a time, with the
 * reason written next to it. A waiver whose only reason is "the test was red"
 * is the failure mode this file exists against — and the second test keeps the
 * list honest in the other direction: a waiver that no longer matches anything
 * is a red too, so removed strings cannot leave permission behind them.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const MESSAGES_DIR = path.join(SRC, "messages");
const LOCALES = ["pt", "en", "es", "it"] as const;

/** Attributes whose literal value reaches a human — on screen or in a screen reader. */
const VISIBLE_ATTRS = new Set([
  "alt",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "placeholder",
  "title",
]);

/** Tags whose content is a code sample, not copy. */
const CODE_TAGS = new Set(["pre", "code"]);

type Finding = { file: string; line: number; kind: string; text: string };

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasLetter(value: string): boolean {
  return /\p{L}/u.test(value);
}

function jsxTagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}

/**
 * String literals reachable from a JSX child expression *as a value*: the
 * expression itself, both branches of a ternary, either side of `||`/`??`.
 * Deliberately not the arguments of a call — `t("Success.title")` is the fix,
 * not the defect.
 */
function literalValues(node: ts.Expression): ts.StringLiteralLike[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node];
  if (ts.isParenthesizedExpression(node)) return literalValues(node.expression);
  if (ts.isConditionalExpression(node)) {
    return [...literalValues(node.whenTrue), ...literalValues(node.whenFalse)];
  }
  if (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    return [...literalValues(node.left), ...literalValues(node.right)];
  }
  return [];
}

function scan(): Finding[] {
  const findings: Finding[] = [];

  for (const file of tsxFiles(SRC)) {
    const label = path.relative(SRC, file);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      ts.ScriptKind.TSX,
    );

    const push = (node: ts.Node, kind: string, raw: string) => {
      const text = normalize(raw);
      if (!text || !hasLetter(text)) return;
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      findings.push({ file: label, line: line + 1, kind, text });
    };

    const visit = (node: ts.Node) => {
      const tag = jsxTagName(node);
      if (tag && CODE_TAGS.has(tag)) return;

      if (ts.isJsxText(node)) push(node, "text", node.text);

      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const name = node.name.getText();
        if (VISIBLE_ATTRS.has(name)) push(node, name, node.initializer.text);
      }

      if (
        ts.isJsxExpression(node) &&
        node.expression &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
      ) {
        for (const literal of literalValues(node.expression)) push(literal, "expression", literal.text);
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return findings;
}

/* -------------------------------------------------------------------------- */
/* The waiver list                                                             */
/* -------------------------------------------------------------------------- */

type Waiver = { file: string; texts: string[]; reason: string };

const BRAND =
  "Proper noun. WCAG 2.2 SC 3.1.2 excepts proper nouns from language marking, and a brand that " +
  "translates stops being a brand.";

const STORE_BADGE =
  "The accessible name of the official store badge artwork. Apple and Google publish the wording " +
  "with the badge; a localized name goes in with the localized badge asset, not before it.";

const SCENE =
  "Content of an illustration, not prose: a painted street name, a coordinate, a radius. It reads " +
  "the same in the four locales and has no sentence to translate.";

const WAIVED: Waiver[] = [
  // ── Brand marks and legal identifiers ────────────────────────────────────
  { file: "app/[locale]/d/[slug]/opengraph-image.tsx", texts: ["TUGGI"], reason: BRAND },
  { file: "app/[locale]/tours/[country]/[slug]/opengraph-image.tsx", texts: ["TUGGI"], reason: BRAND },
  { file: "app/[locale]/purpose/page.tsx", texts: ["TUGGI Manifesto"], reason: BRAND },
  { file: "components/blocks/CityOSHero.tsx", texts: ["Tuggi - CITY OS"], reason: BRAND },
  { file: "components/blocks/DrivePricing.tsx", texts: ["Google Play"], reason: BRAND },
  { file: "components/blocks/PartnerCampaignHero.tsx", texts: ["Tuggi"], reason: BRAND },
  { file: "components/blocks/PartnerHero.tsx", texts: ["TUGGI", "Tuggi"], reason: BRAND },
  { file: "components/global/GlobalHeader.tsx", texts: ["TUGGI Logo"], reason: BRAND },
  {
    file: "components/global/FatFooter.tsx",
    texts: [
      "TUGGI",
      // What is left of the copyright line once #208 moved the rights
      // sentence to Footer.rights: the company's legal signature, in the
      // master spelling, next to the identifiers below it.
      "TUGGI Technologies.",
      "CNPJ: 64.539.859/0001-56",
      "Rua PAIS LEME, 215 - CONJ 1713 - Pinheiros - São Paulo, BR",
    ],
    reason: `${BRAND} The CNPJ and the registered address are legal identifiers of the company, printed as issued.`,
  },

  // ── Store badges ─────────────────────────────────────────────────────────
  ...["DriveConversion", "DriveHero", "FooterStoreBadges", "PartnerCampaignHero"].map((block) => ({
    file: `components/blocks/${block}.tsx`,
    texts: ["Download on the App Store", "Get it on Google Play"],
    reason: STORE_BADGE,
  })),

  // ── Drawings and mock instrument panels ──────────────────────────────────
  { file: "components/blocks/DriveHeroAnimator.tsx", texts: ["AV.", "TURÍSTICA"], reason: SCENE },
  {
    file: "components/blocks/CityOSHeroAnimator.tsx",
    texts: ["38.7169°N", "9.1395°W", "50m"],
    reason: SCENE,
  },
  { file: "components/blocks/TechHero.tsx", texts: ["geofence_trigger.json"], reason: SCENE },

  // ── Known debt, each with the card that closes it ────────────────────────
  // TechEngine's seven English strings were here until #193 deleted the
  // component: the waiver goes with the file, which is what the second test
  // below enforces. GlobalHeader's "Main Navigation" / "Mobile Navigation" left
  // the same way in #198 — the routing spec that pinned them now locates the
  // two navs by `data-nav-scope`, so the names became copy (A11y namespace).
  // This section is empty on purpose: no English literal in src/ is waiting on
  // a card any more. The three above it are permanent exemptions, not debt.
];

function isWaived(finding: Finding): boolean {
  return WAIVED.some((waiver) => waiver.file === finding.file && waiver.texts.includes(finding.text));
}

/* -------------------------------------------------------------------------- */
/* Message files                                                               */
/* -------------------------------------------------------------------------- */

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Messages;
}

function flatKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatKeys(value, `${prefix}${key}.`),
  );
}

function messageAt(messages: Messages, dottedKey: string): string {
  const value = dottedKey.split(".").reduce<string | Messages | undefined>(
    (node, part) => (typeof node === "object" && node ? node[part] : undefined),
    messages,
  );
  expect(typeof value, `${dottedKey} is a string`).toBe("string");
  return value as string;
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

test.describe("copy does not live in code", () => {
  test("DS-COPY-001: no user-visible text is hardcoded in JSX", () => {
    const offenders = scan()
      .filter((finding) => !isWaived(finding))
      .map((finding) => `${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`);

    expect(offenders).toEqual([]);
  });

  test("DS-COPY-001: every waiver still matches a literal that exists", () => {
    const findings = scan();
    const stale = WAIVED.flatMap((waiver) =>
      waiver.texts
        .filter((text) => !findings.some((f) => f.file === waiver.file && f.text === text))
        .map((text) => `${waiver.file}: "${text}"`),
    );

    expect(stale).toEqual([]);
  });
});

/**
 * Keys that exist in `pt.json` and MUST NOT exist in the other three.
 *
 * Parity is the rule; this is the one shape that is deliberately outside it, and
 * it is not a translation backlog. The partnership proposal (#396) asks for a
 * CNPJ with a check digit, a Brazilian UF and an eight-digit CEP, so an
 * establishment reading the site in Italian cannot finish it. Under
 * `DS-COMPONENTE-026` the page therefore serves `pt` and redirects the other
 * three, and the bridge on the landing page renders only in `pt` — which makes
 * these keys unreachable in en/es/it. A key nobody can read is an orphan
 * (CLAUDE.md §6), and 339 translated strings for a door the reader cannot walk
 * through is work thrown away.
 *
 * The list is asserted in BOTH directions below: present in `pt`, absent
 * everywhere else. So the day the proposal is opened to another country, adding
 * the translations is not enough — this entry has to come out, and the person
 * doing it is told by a red test instead of by luck.
 */
const PT_ONLY_PREFIXES = [
  { prefix: "PartnerProposal.", reason: "the proposal page serves pt and redirects en/es/it" },
  {
    prefix: "Partners.form.proposalBridge",
    reason: "the bridge to the proposal renders only where the proposal can be completed",
  },
];

function isPtOnly(key: string): boolean {
  return PT_ONLY_PREFIXES.some(({ prefix }) => key === prefix || key.startsWith(prefix));
}

test.describe("the four message files stay in step", () => {
  // A missing key does not break the next-intl build: the page renders the key
  // path itself, in production, silently. Only a test catches it.
  const reference = flatKeys(messagesFor("pt")).filter((key) => !isPtOnly(key)).sort();

  for (const locale of LOCALES) {
    test(`BR-IDIOMA-001 item 3: ${locale}.json carries the same keys as pt.json`, () => {
      expect(flatKeys(messagesFor(locale)).filter((key) => !isPtOnly(key)).sort()).toEqual(
        reference,
      );
    });
  }

  test("DS-COMPONENTE-026: the pt-only keys are in pt.json and in no other locale", () => {
    const inPt = flatKeys(messagesFor("pt")).filter(isPtOnly);
    // An empty exemption would make the filter above waive nothing and pass
    // silently; the list has to still match something to be a list.
    for (const { prefix } of PT_ONLY_PREFIXES) {
      expect(inPt.filter((key) => key === prefix || key.startsWith(prefix)).length, prefix)
        .toBeGreaterThan(0);
    }

    const leaked: string[] = [];
    for (const locale of LOCALES.filter((one) => one !== "pt")) {
      for (const key of flatKeys(messagesFor(locale)).filter(isPtOnly)) {
        leaked.push(`${locale}.json: ${key}`);
      }
    }
    expect(
      leaked,
      "A translated copy of these keys is a promise the surface does not keep: the " +
        "page redirects to pt and the bridge is not rendered. Opening the proposal to " +
        "another country removes the entry from PT_ONLY_PREFIXES first.",
    ).toEqual([]);
  });

  /**
   * BR-COMUNICACAO-002 item 2: the count of mapped points never travels with a
   * content noun — story, guide, audio, narration, itinerary — and item 8
   * closes the list of nouns it may use. The /coverage share card broke this
   * in both places it names that number, so both are asserted here: the label
   * under the figure and the alt a screen reader announces on the shared post.
   * Localizing the card is what made it four times as easy to break.
   */
  const CONTENT_NOUNS = [
    /\bhist[oó]ria/i,
    /\bstor(y|ies)\b/i,
    /\bstoria|\bstorie\b/i,
    /\bgu[ií]as?\b/i,
    /\bguides?\b/i,
    /\bguida|\bguide\b/i,
    /\b[aá]udios?\b/i,
    /\bnarra[cçz]/i,
    /\bnarration/i,
    /\broteiro|\bitinerar|\bitinerary/i,
  ];

  for (const key of [
    "SEO_COVERAGE.ogHeadline",
    "SEO_COVERAGE.ogImageAlt",
    // The eyebrow sits directly above the figure on the card, which is close
    // enough to read as its label — and since #209 the card is what /coverage
    // shares, not a route nobody reaches.
    "SEO_COVERAGE.ogEyebrow",
  ]) {
    test(`BR-COMUNICACAO-002 item 2: ${key} names the figure without a content noun`, () => {
      const offenders = LOCALES.flatMap((locale) => {
        const value = messageAt(messagesFor(locale), key);
        return CONTENT_NOUNS.filter((noun) => noun.test(value)).map(
          (noun) => `${locale}: ${value} matches ${noun}`,
        );
      });

      expect(offenders).toEqual([]);
    });
  }

  /**
   * BR-COMUNICACAO-005 item 5: no public surface names a date, quarter,
   * version, roadmap position or vague deadline — "em breve", "coming soon",
   * "volte logo" — for content that does not exist yet. The empty tour hub is
   * where the site speaks about content it has not produced, and it used to
   * answer with two deadlines in one sentence. The gate is the possibility's
   * *condition*; the deadline is what nobody committed to.
   *
   * Asserted on one key, not on a sweep of every message, because the rule
   * names its own borderline: "um especialista entra em contato em breve"
   * (Contact.Success.body) is a human-channel promise and stays as it is.
   * A sweep would go red on it, and a rule that produces false positives stops
   * being read.
   */
  const DEADLINES = [
    /\bem breve\b/i,
    /\ben breve\b/i,
    /\ba breve\b/i,
    /\bcoming soon\b/i,
    /\bsoon\b/i,
    /\bpronto\b/i,
    /\bpresto\b/i,
    /\bpr[oó]ximamente\b/i,
    /\bprossimamente\b/i,
    /\bcheck back\b/i,
    /\bvolte\b/i,
    /\bvuelve\b/i,
    /\btorna\b/i,
    // A date, a quarter or a version is the explicit half of the same promise.
    /\b(19|20)\d{2}\b/,
    /\bQ[1-4]\b/,
    /\bv\d+(\.\d+)*\b/i,
  ];

  test("BR-COMUNICACAO-005 item 5: Tours.hubEmpty states the condition, not a deadline", () => {
    const offenders = LOCALES.flatMap((locale) => {
      const value = messageAt(messagesFor(locale), "Tours.hubEmpty");
      return DEADLINES.filter((deadline) => deadline.test(value)).map(
        (deadline) => `${locale}: ${value} matches ${deadline}`,
      );
    });

    expect(offenders).toEqual([]);
  });

  test("BR-IDIOMA-001 item 3: no message is empty in any locale", () => {
    const empty = LOCALES.flatMap((locale) => {
      const messages = messagesFor(locale);
      return flatKeys(messages)
        .filter((key) => messageAt(messages, key).trim() === "")
        .map((key) => `${locale}: ${key}`);
    });

    expect(empty).toEqual([]);
  });
});

test.describe("what the server actually serves, in each locale", () => {
  /**
   * The partner fixture of tests/e2e/mock-supabase-server.mjs — /d/e2e-sem-logo
   * resolves to a plain partner with this company_name, and /d/[slug] is one of
   * the two routes that never translate their path (src/i18n/pathnames.ts).
   */
  const PARTNER_NAME = "Delícias do Vale do Café";

  /** The message minus its markup, which is what the visitor reads. */
  function rendered(message: string, name: string): string {
    return message.replace(/<\/?partner>/g, "").replace("{name}", name);
  }

  for (const locale of LOCALES) {
    /**
     * #208: the referral line was a locale ternary with no `it` branch, and the
     * partner's name was a sibling <span> so it could keep its own size. It is
     * now one message with a <partner> tag, which is the only way next-intl 4
     * hands an element to a value — a plain {placeholder} is always text.
     *
     * Two things can go wrong silently and neither is visible in a diff: `t()`
     * instead of `t.rich` prints the tag as literal text, and dropping
     * `normal-case` lets the label's `uppercase` cascade into the name — a
     * proper noun re-spelled by CSS, which no text assertion can see.
     *
     * The welcome pair (heroWelcomeLabel/heroWelcomeTitle) is not asserted
     * here: it renders only for the Tuggi-owned branch of the hero, and no
     * fixture in the mock resolves to it. The static scan above is what keeps
     * it out of the JSX.
     */
    test(`DS-COPY-001: /${locale}/d/<partner> serves the referral line from i18n (#208)`, async ({
      page,
    }) => {
      const message = messageAt(messagesFor(locale), "Download.Campaign.referredBy");
      await page.goto(`/${locale}/d/e2e-sem-logo`);

      const referral = page.locator("h1");
      await expect(referral).toContainText(rendered(message, PARTNER_NAME));

      const name = referral.getByText(PARTNER_NAME, { exact: true });
      await expect(name).toBeVisible();
      await expect(name).toHaveCSS("text-transform", "none");
    });

    test(`DS-COPY-001: /${locale} serves the strings card #192 moved to i18n`, async ({ page }) => {
      const messages = messagesFor(locale);

      await page.goto(`/${locale}${localizedPathname(locale, "/purpose")}`);
      // The skip link lives in the layout, outside NextIntlClientProvider, and
      // is read on the server — the one place in the tree where a missing
      // await would silently fall back to English.
      await expect(page.locator('a[href="#main-content"]')).toHaveText(
        messageAt(messages, "A11y.skipToContent"),
      );
      // #190: the manifesto. The `lang="en"` that declared the English quote
      // has to be gone with it, or a screen reader now reads the translation
      // with an English voice (SC 3.1.2, inverted).
      await expect(page.locator("blockquote")).toHaveText(
        messageAt(messages, "Purpose.Manifesto.quote"),
      );
      await expect(page.locator("blockquote")).not.toHaveAttribute("lang", "en");

      await page.goto(`/${locale}${localizedPathname(locale, "/enterprise/fleets")}`);
      await expect(
        page.getByText(messageAt(messages, "Fleets.Hero.eyebrow"), { exact: true }),
      ).toBeVisible();

      await page.goto(`/${locale}${localizedPathname(locale, "/destinations")}`);
      for (const key of ["title", "feat1Title", "feat1Desc", "feat3Desc"]) {
        await expect(
          page.getByText(messageAt(messages, `CityOS.Accessibility.Panel.${key}`), { exact: true }),
        ).toBeVisible();
      }
    });
  }

  /**
   * #209: /coverage shares the card it generates — the one with the coverage
   * figures — and not the generic brand image. The failure this guards is
   * silent by construction: `buildOpenGraph` defaults `image` to
   * og-image-tuggi.jpg, so dropping the argument leaves a page that still
   * builds, still validates, and quietly advertises a logo. The Twitter card
   * takes the same URL through a second parameter, and forgetting it splits the
   * two previews without any error either.
   */
  test("#209: /coverage advertises its own share card, in every locale", async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`/${locale}/coverage`);
      const route = `/${locale}/coverage/opengraph-image`;

      const og = await page
        .locator('meta[property="og:image"]')
        .first()
        .getAttribute("content");
      expect(og, `og:image in ${locale}`).toContain(route);

      const twitter = await page
        .locator('meta[name="twitter:image"]')
        .first()
        .getAttribute("content");
      expect(twitter, `twitter:image in ${locale}`).toContain(route);
    }
  });

  test("DS-COPY-001: the /coverage share card renders in every locale", async ({ request }) => {
    // The image reads `params` and translates its own labels; a regression in
    // either turns into a 500 nobody sees.
    for (const locale of LOCALES) {
      const response = await request.get(`/${locale}/coverage/opengraph-image`);
      expect(response.status(), `/${locale}/coverage/opengraph-image`).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    }
  });

  test("DS-COPY-001: the fleets eyebrow fits 360px in the longest language", async ({ page }) => {
    // The layout is approved in the longest translation, not in Portuguese:
    // "Para flotas y empresas de alquiler" is 35 characters against 23 in
    // English, inside a rounded-full pill with an icon.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/es${localizedPathname("es", "/enterprise/fleets")}`);

    // The pill is the element whose whole text is the eyebrow — the icon next
    // to it is an svg and contributes none.
    const pill = page.getByText(messageAt(messagesFor("es"), "Fleets.Hero.eyebrow"), {
      exact: true,
    });
    await expect(pill).toBeVisible();

    const box = (await pill.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);

    const lineHeight = await pill.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect(box.height).toBeLessThan(3 * lineHeight);
  });
});
