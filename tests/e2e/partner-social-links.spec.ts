import { test, expect, type APIRequestContext } from "@playwright/test";
import { partnerSocialLinks, partnerSocialOf, socialProfileUrl } from "../../src/lib/partner-links";
import { parsePublicPage } from "../../src/lib/public-page";
import { visitorHeaders } from "./visitor-headers";

/**
 * The partner's social networks on `tuggi.app/@nome` (#1152).
 *
 * BR-B2B-061 item 6: a closed list, Instagram, TikTok, YouTube and Facebook,
 * only the profile of that network (6.a), always in that order and a network
 * without a name left out (6.d). The address of each profile comes from
 * contract `banco-para-app.md` Parte 34. DS-COMPONENTE-124: one-colour glyphs,
 * 44 px targets, rendered on the server.
 *
 * Fixtures: `social` in PUBLIC_PAGE_FIXTURES of mock-supabase-server.mjs.
 * Read as a robot, so no opening is counted on the fixtures that
 * partner-public-page.spec.ts measures by difference.
 */

const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

test.use({ userAgent: GOOGLEBOT_UA, extraHTTPHeaders: visitorHeaders({ country: "BR" }) });

async function mainOf(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path, { headers: { "user-agent": GOOGLEBOT_UA } });
  expect(res.status()).toBe(200);
  return /<main[^>]*data-partner-page[\s\S]*?<\/main>/.exec(await res.text())?.[0] ?? "";
}

/** The `<a>` tags of the network row, in document order. */
const socialAnchorsOf = (main: string): string[] => {
  const list = /<ul[^>]*data-testid="partner-social-links"[\s\S]*?<\/ul>/.exec(main)?.[0] ?? "";
  return list.match(/<a [^>]*>/g) ?? [];
};

const hrefOf = (anchor: string) => /href="([^"]+)"/.exec(anchor)?.[1]?.replace(/&amp;/g, "&") ?? null;

test.describe("BR-B2B-061 item 6: the reader and the address of each network", () => {
  test("6.d: the order is Instagram, TikTok, YouTube, Facebook, whatever order the answer has", () => {
    const social = partnerSocialOf({ facebook: "hotelredes", youtube: "hotelredes", tiktok: "hotel.redes", instagram: "hotelredes" });
    expect(partnerSocialLinks(social).map((l) => l.network)).toEqual(["instagram", "tiktok", "youtube", "facebook"]);
  });

  test("6.d: a network without a name has no link", () => {
    expect(partnerSocialLinks(partnerSocialOf({ youtube: "anaserra" }))).toEqual([
      { network: "youtube", url: "https://www.youtube.com/@anaserra" },
    ]);
    expect(partnerSocialLinks(partnerSocialOf({ instagram: "", tiktok: null, facebook: "   " }))).toEqual([]);
  });

  test("Parte 34: the profile address of each network", () => {
    expect(socialProfileUrl("instagram", "ana.serra")).toBe("https://www.instagram.com/ana.serra");
    expect(socialProfileUrl("tiktok", "ana.serra")).toBe("https://www.tiktok.com/@ana.serra");
    expect(socialProfileUrl("youtube", "ana-serra")).toBe("https://www.youtube.com/@ana-serra");
    expect(socialProfileUrl("facebook", "ana.serra")).toBe("https://www.facebook.com/ana.serra");
  });

  test("Parte 34: a Facebook name of digits only is a numeric id and opens by profile.php", () => {
    expect(socialProfileUrl("facebook", "100012345678")).toBe("https://www.facebook.com/profile.php?id=100012345678");
    expect(partnerSocialLinks(partnerSocialOf({ facebook: "100012345678" }))[0].url).toBe(
      "https://www.facebook.com/profile.php?id=100012345678"
    );
    // Too short to be an id, and digits only is never a name.
    expect(partnerSocialOf({ facebook: "1234" })).toEqual({});
  });

  test("6.a: a name out of its network's format is dropped and no address is built with it", () => {
    const refused = {
      instagram: ["Ana.Serra", "ana serra", "https://www.instagram.com/ana", "@ana", "a".repeat(31)],
      tiktok: ["a", "ana-serra", "a".repeat(25)],
      youtube: ["ab", "-ana", "ana_", "ana/serra", "a".repeat(31)],
      facebook: ["ana", "ana_serra", "facebook.com/ana", "1".repeat(21)],
    };
    for (const [network, values] of Object.entries(refused)) {
      for (const value of values) expect(partnerSocialOf({ [network]: value }), `${network}: ${value}`).toEqual({});
    }
    expect(partnerSocialOf({ instagram: 42, tiktok: ["ana"], youtube: { h: "ana" } })).toEqual({});
  });

  test("6: a network outside the closed list is ignored", () => {
    expect(partnerSocialOf({ twitter: "ana", linkedin: "ana", instagram: "ana" })).toEqual({ instagram: "ana" });
  });

  test("social absent, null or not an object is no network, and the page still reads", () => {
    for (const value of [undefined, null, "ana", ["ana"], 1]) expect(partnerSocialOf(value)).toEqual({});
    const creator = parsePublicPage({ state: "page", kind: "creator", client_id: "c", name: "ana" });
    const client = parsePublicPage({ state: "page", kind: "client", client_id: "c", name: "hotel", social: null });
    expect(creator.state === "page" && creator.social).toEqual({});
    expect(client.state === "page" && client.social).toEqual({});
  });
});

test.describe("BR-B2B-061 item 6.d, DS-COMPONENTE-124: the row on the page, in the server HTML", () => {
  test("a creator: her networks in order, between the bio and the numbers, each opening the profile in a new tab", async ({ request }) => {
    const main = await mainOf(request, "/@e2e.criadora");
    const anchors = socialAnchorsOf(main);
    expect(anchors.map(hrefOf)).toEqual(["https://www.instagram.com/ana.serra", "https://www.youtube.com/@anaserra"]);
    for (const a of anchors) {
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
    }
    expect(anchors[0]).toContain('aria-label="Perfil no Instagram (abre em nova aba)"');
    expect(anchors[1]).toContain('aria-label="Canal no YouTube (abre em nova aba)"');
    expect(main).toContain('<ul aria-label="Redes sociais"');
    // The glyphs are in the HTML, not drawn by a script.
    expect(main.match(/<svg[^>]*aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(2);

    const bio = main.indexOf('data-testid="creator-bio"');
    const row = main.indexOf('data-testid="partner-social-links"');
    const numbers = main.indexOf('data-testid="creator-stat-');
    expect(bio).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(bio);
    expect(numbers).toBeGreaterThan(row);
  });

  test("6.a: a link where a name goes and a network outside the list are not drawn", async ({ request }) => {
    const anchors = socialAnchorsOf(await mainOf(request, "/@e2e-criador-foto"));
    expect(anchors.map(hrefOf)).toEqual(["https://www.tiktok.com/@carla.dias"]);
  });

  test("without social the row is not in the HTML, not even its label", async ({ request }) => {
    const main = await mainOf(request, "/@e2e-criador-vazio");
    expect(main).not.toContain("partner-social-links");
    expect(main).not.toContain('aria-label="Redes sociais"');
  });

  test("a hotel: the four networks in order in the contacts line, and its old free-text social gives way", async ({ request }) => {
    const main = await mainOf(request, "/@e2e-hotel-redes");
    const contacts = /data-testid="partner-contacts"[\s\S]*?<\/ul>/.exec(main)?.[0] ?? "";
    expect(contacts).toContain("https://hotelredes.example");
    expect(socialAnchorsOf(main).map(hrefOf)).toEqual([
      "https://www.instagram.com/hotelredes",
      "https://www.tiktok.com/@hotel.redes",
      "https://www.youtube.com/@hotelredes",
      "https://www.facebook.com/profile.php?id=100012345678",
    ]);
    expect(contacts).toContain('data-testid="partner-social-links"');
    expect(main).not.toMatch(/>@hotelredes(<|\s)/);
  });

  test("the printed /d/ door is the same page, with the same row", async ({ request }) => {
    const main = await mainOf(request, "/d/e2e-hotel-redes");
    expect(socialAnchorsOf(main)).toHaveLength(4);
  });

  test("a hotel without networks keeps its page as it was, the old social included", async ({ request }) => {
    const main = await mainOf(request, "/@e2e-com-logo");
    expect(main).not.toContain("partner-social-links");
    expect(main).toContain("@deliciasdovale");
  });

  for (const width of [390, 1440]) {
    test(`DS-COMPONENTE-124 at ${width} px: 44 by 44 targets around a 32 px glyph, in one row`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/@e2e-hotel-redes");
      const links = page.getByTestId("partner-social-links").getByRole("link");
      await expect(links).toHaveCount(4);
      const tops = new Set<number>();
      for (let i = 0; i < 4; i++) {
        const box = await links.nth(i).boundingBox();
        expect(box?.width).toBe(44);
        expect(box?.height).toBe(44);
        tops.add(Math.round(box!.y));
        const glyph = await links.nth(i).locator("svg").boundingBox();
        expect(glyph?.width).toBe(32);
      }
      expect(tops.size).toBe(1);
    });
  }
});
