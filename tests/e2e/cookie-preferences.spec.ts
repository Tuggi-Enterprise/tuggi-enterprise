import { test, expect } from "@playwright/test";
import { CONSENT_GRANTED, CONSENT_KEY } from "../../src/lib/consent";
import pt from "../../src/messages/pt.json";

/**
 * Card #818, BR-USUARIO-028 item 1: the banner links to the policy section that
 * names the trackers, and the footer takes the answer back in BOTH stores — the
 * cookie too, or the server-side attribution gate keeps reading "yes".
 */
test("BR-USUARIO-028 item 1: cookie preferences forgets the consent in localStorage and in the cookie", async ({ page }) => {
  await page.goto("/pt");
  const policy = page.getByRole("link", { name: pt.CookieBanner.policyLink });
  await expect(policy).toHaveAttribute("href", /\/pt\/.*#cookies$/);

  await page.getByRole("button", { name: pt.CookieBanner.accept }).click();
  await page.waitForLoadState("load");
  await expect(page.getByText(pt.CookieBanner.text)).toBeHidden();
  const consentCookie = async () =>
    (await page.context().cookies()).find((c) => c.name === CONSENT_KEY);
  expect((await consentCookie())?.value).toBe(CONSENT_GRANTED);

  await page.getByRole("button", { name: pt.Footer.cookiePreferences }).click();
  await expect(page.getByText(pt.CookieBanner.text)).toBeVisible();
  expect(await consentCookie()).toBeUndefined();
  expect(await page.evaluate((k) => localStorage.getItem(k), CONSENT_KEY)).toBeNull();
});

test("BR-USUARIO-028 item 1: the policy carries the anchor the banners link to", async ({ page }) => {
  await page.goto("/pt/trust-center/privacy-policy");
  await expect(page.locator("li#cookies")).toContainText("tuggi_cookie_consent");
});
