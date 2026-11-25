import { test, expect, devices, type Page } from "@playwright/test";
import pt from "../../src/messages/pt.json";
import { visitorHeaders } from "./visitor-headers";

/**
 * Who starts the welcome audio (#1254, design validation, level 2).
 *
 * On a partner's page the player sits below the fold, behind the cookie notice
 * at 390 x 664. A tap on "Recusar" or on "Copiar @" played the story with no
 * player in sight, because the first touch anywhere on the page started it.
 * Now the partner's story plays only from its own button. Since 2026-11-25
 * `/@tuggi` renders as a partner page too (operator), so it has no case here.
 *
 * The count is of `HTMLMediaElement.play()` calls, patched before the page
 * runs, so it holds whether or not the browser lets the clip start.
 */

/** A hotel with a welcome POI, so a player (mock-supabase-server.mjs). */
const PARTNER_WITH_AUDIO = "/@e2e-hotel-foto";
const SPEC_ADDRESS = `2001:db8:1254:2::${Math.floor(Math.random() * 0xffff).toString(16)}`;

test.use({
  userAgent: devices["iPhone 13"].userAgent,
  viewport: { width: 390, height: 664 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  extraHTTPHeaders: visitorHeaders({ country: "BR", address: SPEC_ADDRESS }),
  permissions: ["clipboard-read", "clipboard-write"],
});

async function countPlays(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __plays: number };
    w.__plays = 0;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__plays += 1;
      return play.call(this);
    };
  });
}

const plays = (page: Page) => page.evaluate(() => (window as unknown as { __plays: number }).__plays);

const declineButton = (page: Page) => page.getByRole("button", { name: pt.CookieBanner.decline, exact: true });

test.describe("a partner's page plays its story only from the player", () => {
  test("a tap on Copiar @ and on Recusar plays nothing; a tap on the player's button plays", async ({ page }) => {
    await countPlays(page);
    await page.goto(PARTNER_WITH_AUDIO);

    const playButton = page.getByTestId("partner-welcome-audio").getByRole("button");
    // The clip can play through: the moment the old page tried to start it on its own.
    await expect(playButton).toBeEnabled();
    expect(await plays(page), "nothing plays on load").toBe(0);
    await expect(playButton).toHaveAccessibleName(pt.A11y.playAudio);

    await page.getByTestId("partner-handle-copy").tap();
    await expect(declineButton(page)).toBeVisible();
    expect(await plays(page), "a tap on Copiar plays nothing").toBe(0);

    await declineButton(page).tap();
    await expect(declineButton(page)).toBeHidden();
    expect(await plays(page), "a tap on Recusar plays nothing").toBe(0);

    await playButton.scrollIntoViewIfNeeded();
    await playButton.tap();
    await expect.poll(() => plays(page), { message: "the player's button plays" }).toBeGreaterThan(0);
    await expect(playButton).toHaveAttribute("aria-pressed", "true");
    await expect(playButton).toHaveAccessibleName(pt.A11y.pauseAudio);
  });
});
