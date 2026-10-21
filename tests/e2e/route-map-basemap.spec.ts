import { test, expect, type Request } from "@playwright/test";
import { basemapFor } from "../../src/lib/basemap";

/**
 * The basemap under the tour map (card #989).
 *
 * Since 2026-09-25 CARTO answers every keyless raster request with the same
 * placeholder tile, so every tour map in production showed "API KEY REQUIRED"
 * and nothing went red. What has to stay true:
 *
 *  1. No CARTO tile is ever requested without a key: with the key it is CARTO
 *     Voyager, without it the map falls back to OpenStreetMap.
 *  2. The credit the provider requires is on the map, and it names the
 *     provider actually serving the tiles.
 *
 * Tile requests are answered locally: the suite must not depend on, or add
 * load to, a third-party tile server.
 */

const TOUR_PATH = "/en/tours/brazil/as-maravilhas-do-rio-em-um-dia";

/** Smallest valid PNG, 1x1 transparent. */
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const TILE_HOSTS = /(^|\.)basemaps\.cartocdn\.com$|^tile\.openstreetmap\.org$/;

test.describe("tour map basemap (#989)", () => {
  test("with a key, tiles are CARTO Voyager carrying the key and the CARTO credit", () => {
    const map = basemapFor("abc 123");
    expect(map.url).toContain("basemaps.cartocdn.com/rastertiles/voyager/");
    expect(map.url).toContain("?key=abc%20123");
    expect(map.options.attribution).toContain("https://carto.com/attributions");
    expect(map.options.attribution).toContain("https://www.openstreetmap.org/copyright");
  });

  test("without a key, tiles never go to CARTO and the credit is OpenStreetMap only", () => {
    const map = basemapFor("");
    expect(map.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(map.options.attribution).toContain("https://www.openstreetmap.org/copyright");
    expect(map.options.attribution).not.toContain("CARTO");
  });

  test("the tour page asks for keyed tiles only and shows the matching credit", async ({ page }) => {
    const tiles: URL[] = [];
    await page.route(
      (url) => TILE_HOSTS.test(url.hostname),
      (route) => route.fulfill({ status: 200, contentType: "image/png", body: BLANK_PNG }),
    );
    page.on("request", (request: Request) => {
      const url = new URL(request.url());
      if (TILE_HOSTS.test(url.hostname)) tiles.push(url);
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(TOUR_PATH);
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();

    expect(tiles.length).toBeGreaterThan(0);
    const carto = tiles.filter((url) => url.hostname.endsWith("basemaps.cartocdn.com"));
    for (const url of carto) expect(url.searchParams.get("key"), url.href).toBeTruthy();

    const credit = page.locator(".leaflet-control-attribution");
    await expect(credit.locator('a[href="https://www.openstreetmap.org/copyright"]')).toBeVisible();
    await expect(credit.locator('a[href="https://carto.com/attributions"]')).toHaveCount(
      carto.length > 0 ? 1 : 0,
    );
  });
});
