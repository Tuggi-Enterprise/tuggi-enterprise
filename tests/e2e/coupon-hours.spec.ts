import { test, expect } from "@playwright/test";

/**
 * BR-MONETIZACAO-047 — a coupon grants one of two concessions, and the redeem
 * block on /d/<CODE> names the one it actually grants:
 *
 *   - `minutes` → whole hours of guide balance, plus the line on when that
 *                 balance is spent (and nothing about expiry or "free",
 *                 BR-MONETIZACAO-062);
 *   - `until`   → days, exactly as before this card (#315).
 *
 * Before #315 an hours coupon (`days: null`) was discarded by resolveCoupon
 * and the code fell through to the partner pass — i.e. a 404.
 *
 * Fixtures: COUPON_FIXTURES in mock-supabase-server.mjs.
 */

const BLOCK_TITLE_PT = "Presente especial";

test.describe("coupon redeem block (BR-MONETIZACAO-047)", () => {
  test("a minutes coupon renders the block in hours, with the balance note", async ({ page }) => {
    const response = await page.goto("/pt/d/E2EHORAS2");
    expect(response?.status()).toBe(200);
    await expect(page.getByText(BLOCK_TITLE_PT)).toBeVisible();
    await expect(page.getByText("Você ganha 2 horas de guia", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Seu saldo só é descontado com o guia ativo e você em movimento.", { exact: true })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar código" })).toContainText("E2EHORAS2");
  });

  test("one hour is singular", async ({ page }) => {
    await page.goto("/pt/d/E2EHORA1");
    await expect(page.getByText("Você ganha 1 hora de guia", { exact: true })).toBeVisible();
  });

  test("the hours block promises neither expiry nor 'free' (BR-MONETIZACAO-062)", async ({ page }) => {
    for (const path of ["/pt/d/E2EHORAS2", "/en/d/E2EHORAS2"]) {
      await page.goto(path);
      const block = page.locator("div", { has: page.getByRole("button", { name: /Copiar código|Copy code/ }) }).last();
      await expect(block).toBeVisible();
      await expect(block).not.toContainText(/grátis|gratuito|free|não expira|never expires|dias|days/i);
    }
  });

  test("the hours block reads in English too", async ({ page }) => {
    await page.goto("/en/d/E2EHORAS2");
    await expect(page.getByText("You get 2 hours of guide time", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Your balance is only used while the guide is on and you're moving.", { exact: true })
    ).toBeVisible();
  });

  test("a days coupon renders exactly as before", async ({ page }) => {
    await page.goto("/pt/d/E2EDIAS7");
    await expect(page.getByText("Você ganha 7 dias de Tuggi Premium grátis", { exact: true })).toBeVisible();
    await expect(page.getByText("Seu saldo só é descontado", { exact: false })).toHaveCount(0);
  });

  // BR-B2B-001: a slug that does not resolve renders the plain download page
  // (200, no coupon block), never a 404 — see `src/app/[locale]/d/[slug]/page.tsx`.
  test("an unknown code renders the plain download page, and a partner slug still renders the partner", async ({ page }) => {
    const unknown = await page.goto("/pt/d/E2ENAOEXISTE");
    expect(unknown?.status()).toBe(200);
    await expect(page.getByText(BLOCK_TITLE_PT)).toHaveCount(0);

    const partner = await page.goto("/pt/d/e2e-sem-logo");
    expect(partner?.status()).toBe(200);
    await expect(page.getByText(BLOCK_TITLE_PT)).toHaveCount(0);
  });
});
