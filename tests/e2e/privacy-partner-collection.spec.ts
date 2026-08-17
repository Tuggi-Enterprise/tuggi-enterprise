import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "../../src/i18n/locales";
import { publishedText } from "./support/published-text";

/**
 * BR-USUARIO-030 and BR-USUARIO-031 — the two collections of the partnership
 * journey are declared in the published policy, in all four languages.
 *
 * ---------------------------------------------------------------------------
 * What this guards, and why key-existence is the assertion
 * ---------------------------------------------------------------------------
 *
 * BR-USUARIO-028 item 1: a public surface does not collect a category the
 * published policy does not declare, and the two are **the same delivery**.
 * BR-USUARIO-030 gives the CMS proposal form its item (two blocks of data,
 * four purposes, the hashed address of the public door, the destination of the
 * story); BR-USUARIO-031 gives the acceptance trail its own (IP and user-agent
 * kept as they are, single probatory purpose). Both rules shipped with status
 * `copy publicado divergente`: what the policy said was not merely incomplete,
 * it was **false** for those collections — `s1Item4` opened with "the
 * partnerships form", so it was read as covering them, and then declared a
 * shorter field list, a 4-attempts/14-day cycle that does not govern them, and
 * "we store that city, not the IP address" while one collection hashes the
 * address and the other keeps it in the clear.
 *
 * So the ruler is presence in the **four** message files, not in `pt` plus a
 * hope. A missing key in next-intl does not break the build and does not throw:
 * the page publishes the literal string `Legal.Privacy.s1Item5` where the
 * paragraph should be. The failure mode of this delivery is therefore a legal
 * page that looks complete in `pt` and, in `it`, publishes a key name where a
 * declaration of personal-data processing is required. Nothing else in the
 * repository is looking at that.
 *
 * ---------------------------------------------------------------------------
 * Two sweeps, and why neither replaces the other
 * ---------------------------------------------------------------------------
 *
 * **The message sweep** reads the four JSON files. It reaches a key that no
 * component renders yet, and it is the only one that can tell `pt`-only copy
 * from copy that shipped in four languages.
 *
 * **The published sweep** loads the page and reads what a visitor gets — it is
 * the one that catches a key that exists in every file and is wired to no
 * `<li>`, which is the whole delivery being a no-op. It reads through
 * `publishedText()` and **never** `page.content()`: next-intl inlines the whole
 * message file into the RSC payload, so the raw HTML of any page contains every
 * source string of every other page. A `page.content()` sweep for these keys is
 * green on a page that renders none of them — it would be asserting that the
 * message file was compiled into the bundle, which was never in doubt.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/** The section-1 items: one per surface — BR-USUARIO-028 item 6, corollary. */
const SECTION_1_KEYS = ["s1Item4", "s1Item5", "s1Item6", "s1Item7"] as const;

/** The section-5 way out, which brackets the one `mailto:` of `s5ItemLeadEmail`. */
const SECTION_5_KEYS = ["s5ItemPartner1", "s5ItemPartner2"] as const;

/** Everything #344 wrote, rewritten or new. `lastUpdated` moved with it. */
const DELIVERED_KEYS = ["lastUpdated", "s1Intro", ...SECTION_1_KEYS, ...SECTION_5_KEYS] as const;

type Privacy = Record<string, string>;

function privacyOf(locale: string): Privacy {
  const file = path.join(REPO_ROOT, "src/messages", `${locale}.json`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return parsed?.Legal?.Privacy ?? {};
}

/** The `<strong>` of `t.rich` is markup, not text: the DOM has neither tag. */
const plain = (value: string) => value.replace(/<\/?strong>/g, "");

/* ---------------------------------------------------------------------------
 * Sweep 1 — the four message files
 * ------------------------------------------------------------------------- */

test.describe("BR-USUARIO-030, BR-USUARIO-031 — the policy declares both collections in every language", () => {
  for (const locale of LOCALES) {
    test(`BR-USUARIO-030, BR-USUARIO-031: src/messages/${locale}.json declares every key of Legal.Privacy`, () => {
      const privacy = privacyOf(locale);
      const missing = DELIVERED_KEYS.filter(
        (key) => typeof privacy[key] !== "string" || privacy[key].trim() === "",
      );

      expect(
        missing,
        `Legal.Privacy in ${locale}.json is missing ${missing.join(", ")}. ` +
          "A missing key does not break the build — next-intl publishes the key " +
          "name as the paragraph — so the policy would ship declaring the " +
          "collection of BR-USUARIO-030/031 in some languages and not others, " +
          "which is BR-USUARIO-028 item 1 unmet for the languages that lack it.",
      ).toEqual([]);
    });

    /**
     * The space that brackets the inline `mailto:` — asserted on the message
     * value, and it has to be, because the rendered check below reads the same
     * file it is comparing against and therefore moves with a copy edit.
     *
     * `toHaveAccessibleName()` would not have caught this either, and that is
     * the reason it appears nowhere in this spec: Chromium's name computation
     * joins the contributions of inline children with a separator of its own,
     * so "Escreva parasuporte@tuggi.app dizendo" comes out of it reading
     * correct. Both pairs are checked, not just the new one — the shape is
     * "text, link, text", and it is the shape that goes wrong.
     */
    test(`BR-USUARIO-030: ${locale} brackets the inline address with a space on both sides`, () => {
      const privacy = privacyOf(locale);
      const pairs: [string, string][] = [
        ["s5ItemLead1", "s5ItemLead2"],
        ["s5ItemPartner1", "s5ItemPartner2"],
      ];

      for (const [before, after] of pairs) {
        expect(privacy[before], `${locale}: ${before} runs into the address`).toMatch(/\s$/);
        expect(privacy[after], `${locale}: ${after} runs into the address`).toMatch(/^\s/);
      }
    });

    /**
     * BR-USUARIO-030, 1st edge case: the four numbers of BR-USUARIO-029 item 3
     * exist for the silence of someone who left a contact on a landing page.
     * The proposal form is submitted inside a conversation that already had an
     * in-person check (BR-B2B-029 item 4), so publishing "4 attempts in 14
     * days" over it invents a promise the third week of negotiation breaks.
     * The cycle stays in `s1Item4` and nowhere else.
     */
    test(`BR-USUARIO-030: ${locale} publishes no contact cycle outside the lead item`, () => {
      const privacy = privacyOf(locale);
      const withCycle = (["s1Item5", "s1Item6", "s1Item7"] as const).filter((key) =>
        /\b(4|14)\b/.test(privacy[key] ?? ""),
      );

      expect(
        withCycle,
        `${locale}: ${withCycle.join(", ")} carries a number of the lead contact cycle. ` +
          "That cycle is BR-USUARIO-029 item 3 and governs only the form on the " +
          "partnerships page of this site (s1Item4).",
      ).toEqual([]);
    });
  }
});

/* ---------------------------------------------------------------------------
 * Sweep 2 — what the visitor of the policy actually reads
 * ------------------------------------------------------------------------- */

for (const locale of LOCALES) {
  test(`BR-USUARIO-030, BR-USUARIO-031: /${locale}/trust-center/privacy-policy publishes both declarations`, async ({
    page,
  }) => {
    const privacy = privacyOf(locale);
    await page.goto(`/${locale}/trust-center/privacy-policy`);

    const text = await publishedText(page);

    const unpublished = SECTION_1_KEYS.filter((key) => !text.includes(plain(privacy[key])));
    expect(
      unpublished,
      `${locale}: the value of ${unpublished.join(", ")} is in the message file and ` +
        "not on the page — the key exists and no <li> renders it, so the " +
        "declaration BR-USUARIO-028 item 1 requires is not published.",
    ).toEqual([]);

    /** The key name itself, which is what next-intl prints when a key is gone. */
    const leaked = DELIVERED_KEYS.filter((key) => text.includes(`Legal.Privacy.${key}`));
    expect(leaked, `${locale}: the page printed a key name instead of its text.`).toEqual([]);
  });

  /**
   * BR-USUARIO-030 item 7 / BR-USUARIO-031 item 6 — the way out, and the one
   * address that owns it.
   *
   * Anchored on `textContent()`, not on `toHaveAccessibleName()`: the name
   * computation in Chromium inserts a separator of its own between inline
   * children, so it cannot see how the three nodes actually join.
   *
   * What this proves is the **join**, not the copy: that the item publishes
   * `s5ItemPartner1` + the address + `s5ItemPartner2` and nothing else between
   * them — no `{" "}` slipped in, no JSX whitespace eaten, no wrapper breaking
   * the inline flow. It cannot prove the copy brackets the address with a
   * space, because it reads the value it compares against; that is asserted on
   * the message file above, and the two together are the guard.
   */
  test(`BR-USUARIO-031: /${locale}/trust-center/privacy-policy routes the partner way out through the one address`, async ({
    page,
  }) => {
    const privacy = privacyOf(locale);
    await page.goto(`/${locale}/trust-center/privacy-policy`);

    const items = page.locator('li:has(a[href^="mailto:"])');

    /**
     * Two, and the count is load-bearing: the lead item of BR-USUARIO-029
     * item 6 and the partner item of BR-USUARIO-030 item 7. One means an
     * item was dropped; three means a second address was introduced by copy.
     */
    await expect(items).toHaveCount(2);

    const rendered = await items.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
    const email = privacy.s5ItemLeadEmail;
    const expected = plain(privacy.s5ItemPartner1) + email + privacy.s5ItemPartner2;

    expect(
      rendered,
      `${locale}: the partner removal item does not join s5ItemPartner1, ${email} and ` +
        "s5ItemPartner2 as they are — something is being added between the nodes or " +
        "eaten between them, and the published sentence is wrong even though the " +
        "href works.",
    ).toContain(expected);

    /** One owner for the address: the href is the label, in both items. */
    const hrefs = await items
      .locator('a[href^="mailto:"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => `${node.getAttribute("href")}|${node.textContent ?? ""}`),
      );
    expect(new Set(hrefs), `${locale}: the two items must reuse s5ItemLeadEmail, not two strings.`)
      .toEqual(new Set([`mailto:${email}|${email}`]));
  });
}
