import { test, expect } from "@playwright/test";
import en from "../../src/messages/en.json";
import es from "../../src/messages/es.json";
import it from "../../src/messages/it.json";
import pt from "../../src/messages/pt.json";

/**
 * BR-USUARIO-051 item 8 (#1146): the site's third-party licenses page credits
 * the LDNOOBW list the name and @ filter reads. The work's name, its authorship
 * as the repository declares it, the link to the repository, the link to
 * CC BY 4.0 and the note that the list was modified, in every locale, and a
 * door to the page from the footer and the trust center.
 */
const MESSAGES = { pt, en, es, it } as const;
const PATH = "/trust-center/third-party-licenses";
const REPOSITORY = "https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words";
const LICENSE = "https://creativecommons.org/licenses/by/4.0/";

for (const [locale, messages] of Object.entries(MESSAGES)) {
  test(`BR-USUARIO-051 item 8: /${locale}${PATH} credits the LDNOOBW list`, async ({ page }) => {
    const copy = messages.Legal.Licenses;
    const response = await page.goto(`/${locale}${PATH}`);
    expect(response?.status()).toBe(200);

    const credit = page.getByTestId("license-ldnoobw");
    await expect(credit.getByRole("heading", { level: 2 })).toHaveText(
      "List of Dirty, Naughty, Obscene, and Otherwise Bad Words"
    );
    await expect(credit).toContainText("Shutterstock, Inc.");
    await expect(credit).toContainText(copy.ldnoobwChanges);
    await expect(credit.getByRole("link", { name: copy.repositoryLink })).toHaveAttribute("href", REPOSITORY);
    const license = credit.getByRole("link", { name: copy.licenseLink });
    await expect(license).toHaveAttribute("href", LICENSE);
    await expect(license).toHaveAttribute("rel", /\blicense\b/);
  });

  test(`BR-USUARIO-051 item 8: the footer and the trust center of /${locale} open the page`, async ({ page }) => {
    await page.goto(`/${locale}${PATH}`);
    const label = messages.Footer.licenses;
    await expect(page.locator(`footer a[href="/${locale}${PATH}"]`)).toHaveText(label);
    await expect(page.locator(`nav[aria-labelledby="trust-center-nav-label"] a[href="/${locale}${PATH}"]`)).toHaveText(messages.Legal.Sidebar.licenses);
  });
}
