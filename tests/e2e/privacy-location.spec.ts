import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "../../src/i18n/locales";
import { publishedText } from "./support/published-text";

/**
 * BR-USUARIO-049 — what the published policy says about location, in the four
 * languages (card #1036).
 *
 * The policy used to say the location was "anonymized", used "strictly" for the
 * audio triggers, and kept "only as long as necessary". None of it was true:
 * `drive.user_location_history` carries `user_id` on every row, is written every
 * 30 s with the guide on or off, and is read for partner attribution, the
 * partner's cycle report and the internal dashboard. The app opens this page as
 * its own policy (`tuggi-drive-v2/src/features/auth/legalDocumentUrl.ts`), so a
 * false sentence here is LGPD art. 6 VI and App Review 5.1.1(i) at once.
 *
 * Two sweeps, as in privacy-partner-collection.spec.ts: the message files, which
 * is the only place `pt`-only copy shows, and the published page through
 * `publishedText()`, never `page.content()` (next-intl inlines every message of
 * every page into the RSC payload).
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/**
 * The keys that speak about location: BR-USUARIO-049 `Divergência` 1, plus
 * `s2Item3` (item 1.h, the suggestion notifications, `Divergência` 4, #1049).
 */
const LOCATION_KEYS = [
  "s1Item2",
  "s2Title",
  "s2Item1",
  "s2Item2",
  "s2Item3",
  "s3Item2",
  "s4Item2",
  "s5Item2",
] as const;

/**
 * BR-USUARIO-049 item 3 (no "anonymized", no "de-linked", no "strictly"/"only
 * for" a purpose) and item 4 (no "as long as necessary", no permanent retention
 * of "anonymized telemetry"), plus the recipients `s2Item2` used to invent.
 * The last pattern is BR-COMUNICACAO-012 item 2: the policy may not promise a
 * cadence or a volume of notifications, so "weekly" never names the use.
 */
const FORBIDDEN: RegExp[] = [
  /anonim|anonym/i,
  /desvincul|de-link|unlink|scolleg/i,
  /estritamente|strictly|estrictamente|strettamente|esclusivamente/i,
  /tempo necess|as long as necessary|tiempo necesario|tempo necessario/i,
  /permanentemente|permanently|permanente\b/i,
  /\bGovernos\b|\bGovernments\b|\bGobiernos\b|\bGoverni\b/,
  /semanal|weekly|settimanal|por semana|per week|a la semana|a settimana/i,
];

type Privacy = Record<string, string>;

function privacyOf(locale: string): Privacy {
  const file = path.join(REPO_ROOT, "src/messages", `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"))?.Legal?.Privacy ?? {};
}

const plain = (value: string) => value.replace(/<\/?strong>/g, "");

test.describe("BR-USUARIO-049 — the policy tells the truth about location in every language", () => {
  for (const locale of LOCALES) {
    test(`BR-USUARIO-049 items 3 and 4: ${locale}.json has no forbidden claim in the location keys`, () => {
      const privacy = privacyOf(locale);

      for (const key of LOCATION_KEYS) {
        const value = privacy[key];
        expect(typeof value === "string" && value.trim() !== "", `${locale}: ${key} is missing`).toBe(true);
        for (const pattern of FORBIDDEN) {
          expect(value, `${locale}: ${key} matches ${pattern}`).not.toMatch(pattern);
        }
      }
    });

    test(`BR-USUARIO-049 items 2 and 5: ${locale}.json declares the cadence and the IP service`, () => {
      const privacy = privacyOf(locale);

      // Item 2: every 30 s, and the city estimated from the IP while the GPS is silent.
      expect(privacy.s1Item2, `${locale}: s1Item2 does not state the 30 s cadence`).toMatch(/\b30\b/);
      expect(privacy.s1Item2, `${locale}: s1Item2 does not name ipapi.co`).toContain("ipapi.co");
      // Item 5: who receives the IP sits in the sharing section too.
      expect(privacy.s3Item2, `${locale}: s3Item2 does not name ipapi.co`).toContain("ipapi.co");
    });

    test(`BR-USUARIO-049 items 1.h, 4.1 and 5: ${locale}.json declares the suggestion notifications`, () => {
      const privacy = privacyOf(locale);

      // Item 1.h: the use exists, with the guest included and the way out (item 7).
      expect(privacy.s2Item3, `${locale}: s2Item3 does not name the guest`).toMatch(
        /convidado|guest|invitado|ospite/i,
      );
      // Item 5: Firebase receives the text, never the coordinate.
      expect(privacy.s3Item2, `${locale}: s3Item2 does not name Firebase`).toContain("Firebase Cloud Messaging");
      expect(privacy.s3Item2, `${locale}: s3Item2 does not rule out the coordinate`).toMatch(
        /coordenada|coordinates|coordenadas|coordinate/i,
      );
      // Item 4.1: the send record is kept with the account, like the rest of the item.
      expect(privacy.s4Item2, `${locale}: s4Item2 does not describe the send record`).toMatch(
        /sugest|suggest|sugerenc|suggerim/i,
      );
    });

    test(`BR-USUARIO-049: /${locale}/trust-center/privacy-policy publishes the location items`, async ({
      page,
    }) => {
      const privacy = privacyOf(locale);
      await page.goto(`/${locale}/trust-center/privacy-policy`);

      const text = await publishedText(page);

      for (const key of LOCATION_KEYS) {
        expect(text, `${locale}: ${key} is not on the page`).toContain(plain(privacy[key]));
      }
      expect(text, `${locale}: a key name leaked onto the page`).not.toContain("Legal.Privacy.");
    });
  }
});
