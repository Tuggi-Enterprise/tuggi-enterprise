import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "../../src/i18n/locales";
import { publishedText } from "./support/published-text";

/**
 * BR-USUARIO-028 item 4 and BR-USUARIO-029 item 6 — the site publishes a way
 * out, and it has to be a mailbox the company actually reads.
 *
 * ---------------------------------------------------------------------------
 * What happened, and why a guard and not just a fix
 * ---------------------------------------------------------------------------
 *
 * Four addresses were published for months and **none of them existed**:
 * `legal@` (8 occurrences), `press@` (4), `accessibility@` (4) and the English
 * `support@` (2) — confirmed by the operator on 2026-08-14, card #325. The
 * real mailbox is `suporte@tuggi.app`, in Portuguese, and it is the only one.
 *
 * `legal@` was not decoration: `Legal.Privacy.s5ItemLeadEmail` is the *only*
 * declared path by which somebody who filled the partnership form — and
 * therefore never had an app account, so `/trust-center/data-deletion` has
 * nothing to delete for them — can ask to be removed (BR-USUARIO-029 item 6).
 * A right of erasure routed to a mailbox nobody reads is a promise that looks
 * like compliance and is not one.
 *
 * Nothing caught them because nothing was looking: each address was typed once
 * and reviewed as copy. So the ruler here is not "these four are gone", which
 * would be green again the day somebody invents a fifth. It is: **every
 * `@tuggi.app` address this repository publishes has the local part
 * `suporte`** — the shape of the mistake, not the four instances of it.
 *
 * ---------------------------------------------------------------------------
 * Two sweeps, because neither one sees what the other does
 * ---------------------------------------------------------------------------
 *
 * **The source sweep** reads `src/` and `public/` as text. It is the one that
 * reaches an address nobody renders yet — a `mailto:` behind an interaction
 * (`ContactRouter`'s support deflection only exists after the visitor picks
 * the tourist card), a constant consumed by JSON-LD, a message key added to
 * `pt.json` before the component that shows it.
 *
 * **The published sweep** loads the pages and reads what a visitor gets. It is
 * the one that survives a refactor the source sweep would miss — an address
 * arriving from somewhere neither file tree covers. It reads through
 * `publishedText()` and the rendered `mailto:` hrefs, and **never**
 * `page.content()`: next-intl inlines the whole message file into the RSC
 * payload, so the raw HTML of any page contains every string of every other
 * page. A `page.content()` sweep for this would fire on `/coverage` because
 * the privacy policy exists, and its verdict would mean nothing either way.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/** The one mailbox that exists (operator, 2026-08-14). */
const MAILBOX = "suporte";

/** Any address on the company domain, however it is spelled around it. */
const ADDRESS = /([A-Za-z0-9._%+-]+)@tuggi\.app/g;

const addressOf = (mailbox: string) => `${mailbox}@tuggi.app`;

/* ---------------------------------------------------------------------------
 * Sweep 1 — the source
 * ------------------------------------------------------------------------- */

const SWEPT_DIRS = ["src", "public"];
const SWEPT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".txt",
  ".xml",
  ".html",
  ".css",
]);

function textFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...textFilesUnder(full));
    } else if (SWEPT_EXTENSIONS.has(path.extname(entry.name))) {
      found.push(full);
    }
  }
  return found;
}

type Occurrence = { where: string; address: string };

function addressesIn(file: string): Occurrence[] {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const relative = path.relative(REPO_ROOT, file);
  const found: Occurrence[] = [];
  lines.forEach((line, index) => {
    for (const match of line.matchAll(ADDRESS)) {
      found.push({ where: `${relative}:${index + 1}`, address: match[0] });
    }
  });
  return found;
}

test.describe("BR-USUARIO-028 — the only published address is the one that exists", () => {
  const occurrences = SWEPT_DIRS.flatMap((dir) =>
    textFilesUnder(path.join(REPO_ROOT, dir)).flatMap(addressesIn),
  );

  test("BR-USUARIO-028: no source file publishes an @tuggi.app address other than suporte@", () => {
    const wrong = occurrences.filter((hit) => hit.address !== addressOf(MAILBOX));

    expect(
      wrong.map((hit) => `${hit.where} → ${hit.address}`),
      `Only ${addressOf(MAILBOX)} exists (operator, 2026-08-14, #325). ` +
        `legal@, press@, accessibility@ and support@ were published for months and were never read; ` +
        `an address that nobody answers is worse on the erasure path (BR-USUARIO-029 item 6) than no address at all.`,
    ).toEqual([]);
  });

  /**
   * Positive control. The sweep above is vacuously green if the walk breaks —
   * a renamed directory, an extension dropped from the set — so it has to
   * prove it is still looking at something. 17 is what #325 left behind: four
   * message keys × four locales, plus `SUPPORT_EMAIL` in src/lib/app-meta.ts.
   */
  test("BR-USUARIO-028: the source sweep still reaches the addresses it guards", () => {
    expect(occurrences.length).toBeGreaterThanOrEqual(17);
  });
});

/* ---------------------------------------------------------------------------
 * Sweep 2 — what the visitor gets
 * ------------------------------------------------------------------------- */

/**
 * The four surfaces that name an address, plus the home page for the JSON-LD
 * `contactPoint` that every page carries from the locale layout. All five
 * slugs are locale-independent today (src/i18n/pathnames.ts, SHARED_SLUG_ROUTES).
 */
const SURFACES = [
  "/",
  "/contact",
  "/trust-center/privacy-policy",
  "/trust-center/accessibility",
  "/trust-center/terms-of-use",
];

/** Surfaces where the address is not optional: it is the declared way out. */
const MUST_PUBLISH_ADDRESS = new Set([
  "/trust-center/privacy-policy",
  "/trust-center/accessibility",
]);

for (const locale of LOCALES) {
  for (const surface of SURFACES) {
    test(`BR-USUARIO-028: ${locale}${surface} publishes ${addressOf(MAILBOX)} and no other address`, async ({
      page,
    }) => {
      await page.goto(`/${locale}${surface}`);

      const text = await publishedText(page);
      const hrefs = await page
        .locator('a[href^="mailto:"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));

      const published = [...text.matchAll(ADDRESS), ...hrefs.join("\n").matchAll(ADDRESS)].map(
        (match) => match[0],
      );

      /**
       * The rendered sweep matches the **tail**, and the reason is in
       * `publishedText()`: its clone is detached, so `innerText` degrades to
       * text-content semantics and two adjacent blocks concatenate with no
       * separator at all. On `/trust-center/accessibility` the paragraph above
       * the link ends in "…senza eccezioni." and the address follows it, so
       * the page reads `eccezioni.suporte@tuggi.app` — an artifact of the
       * extraction, not of the copy. An exact comparison here is red on
       * correct pages.
       *
       * What this costs is narrow and covered elsewhere: an invented address
       * *ending* in `suporte@tuggi.app` would pass here, and the source sweep
       * above — which reads the file, where the string is delimited — compares
       * exactly and fails it. What matters is that any of the four dead
       * mailboxes, glued to a neighbour or not, does not end in `suporte@` and
       * is red on both.
       */
      const wrong = published.filter((address) => !address.endsWith(addressOf(MAILBOX)));

      expect(
        [...new Set(wrong)],
        `${locale}${surface} shows an address the company does not read (#325).`,
      ).toEqual([]);

      if (MUST_PUBLISH_ADDRESS.has(surface)) {
        /**
         * BR-USUARIO-029 item 6: a page that stopped offering the way out
         * altogether passes the check above, which only forbids wrong
         * addresses. So this asserts the `mailto:` **of this page** — not the
         * text, because `publishedText()` also carries the JSON-LD
         * `contactPoint` that the locale layout puts on every page, and an
         * empty `contactEmail` key would still look answered.
         */
        expect(
          hrefs,
          `${locale}${surface} must offer the address as a mailto — it is the declared way out.`,
        ).toContain(`mailto:${addressOf(MAILBOX)}`);
      }
    });
  }
}
