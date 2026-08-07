import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  MOVED_ROUTES,
  buildSegmentPathnames,
  localizedPathname,
  pathnames,
} from "../../src/i18n/pathnames";
import { LOCALES, DEFAULT_LOCALE, type SiteLocale } from "../../src/i18n/locales";
import {
  PUBLISHABLE_MODELS,
  SEGMENTS,
  segmentPathname,
  type Segment,
} from "../../src/lib/segments";
import {
  DOWNLOAD_CTA_SCOPES,
  NAV_ITEMS,
  PARTNERS_HUB_PUBLISHED,
  VISIBLE_NAV_ITEMS,
} from "../../src/lib/nav";
import { TUGGI_CLIENT_SLUG, TUGGI_PARTNER_ID } from "../../src/lib/app-meta";

/**
 * DS-COPY-006 — "the slug is text shown to the user: translated, unaccented,
 *                and it does not change once indexed".
 * DS-COMPONENTE-005 — "a surface that repeats per variant is a template plus a
 *                      registry; a new variant costs content, not code".
 * BR-IDIOMA-001 item 3 — four interface locales.
 *
 * The route map in src/i18n/pathnames.ts is the single source of route truth.
 * This spec is what makes that claim true rather than stated: it walks the map
 * itself, so nothing here is a hand-written list that can fall out of date
 * with the map it is supposed to guard.
 *
 * The failure this exists to prevent is not cosmetic. Before the map, seo.ts
 * built all four hreflang URLs out of one string; the first route with a
 * translated slug would have made the four language versions of a page point
 * at each other with URLs that 404 — the classic way to lose all four at once.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const APP_DIR = path.join(REPO_ROOT, "src/app/[locale]");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");

/** Internal pathnames with no dynamic segment — the ones a URL can be built for. */
const STATIC_ROUTES = Object.keys(pathnames).filter((route) => !route.includes("["));

/** Whether a page file exists for an internal pathname. Derived, never listed. */
function hasPage(internalRoute: string): boolean {
  const dir = internalRoute === "/" ? APP_DIR : path.join(APP_DIR, internalRoute);
  return fs.existsSync(path.join(dir, "page.tsx"));
}

const ROUTABLE = STATIC_ROUTES.filter(hasPage);

function url(locale: string, internalRoute: string): string {
  const slug = localizedPathname(locale, internalRoute);
  return slug === "/" ? `/${locale}` : `/${locale}${slug}`;
}

/**
 * Declared, but with no page: the word is decided and the URL does not exist.
 *
 * Two kinds, and the same rule answers for both. A route that sits in the map
 * with no page file — `/partners` was that case until #195 built the hub — and
 * a **reserved** segment (spec §1.2), whose four slugs are decided in
 * `SEGMENTS` and which deliberately never enters the map. So `pathnames` alone
 * cannot be where this list looks: it would have gone empty the day the hub
 * landed, and the assertion below would have started passing over nothing.
 *
 * The reserved URL is built from the registry rather than from
 * `localizedPathname`, which would resolve it through the `/partners` prefix
 * and hand back `/pt/parcerias/restaurants` — an address nobody declared, so a
 * 404 for the wrong reason.
 */
const DECLARED_WITHOUT_PAGE: { route: string; urlFor: (locale: SiteLocale) => string }[] = [
  ...STATIC_ROUTES.filter((route) => !hasPage(route)).map((route) => ({
    route,
    urlFor: (locale: SiteLocale) => url(locale, route),
  })),
  ...SEGMENTS.filter((segment) => !segment.published).map((segment) => ({
    route: segmentPathname(segment.key),
    urlFor: (locale: SiteLocale) => `/${locale}/${segment.slugs[locale]}`,
  })),
];

test.describe("route map", () => {
  test("the map covers every page under src/app/[locale]", () => {
    // A page that exists and is not declared is a route nobody can link to
    // with a typed <Link>, and one that seo.ts cannot translate.
    const declared = new Set(Object.keys(pathnames));
    const missing: string[] = [];

    const walk = (dir: string, prefix: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        // The catch-all only exists to answer 404.
        if (entry.name === "[...rest]") continue;
        const internal = `${prefix}/${entry.name}`;
        if (fs.existsSync(path.join(dir, entry.name, "page.tsx")) && !declared.has(internal)) {
          missing.push(internal);
        }
        walk(path.join(dir, entry.name), internal);
      }
    };
    walk(APP_DIR, "");

    expect(missing, `routes with a page but no entry in the map: ${missing.join(", ")}`)
      .toEqual([]);
  });

  test("DS-COPY-006: no slug carries an accent, an upper case letter or a space", () => {
    for (const route of STATIC_ROUTES) {
      for (const locale of LOCALES) {
        const slug = localizedPathname(locale, route);
        expect(slug, `${route} in ${locale}`).toMatch(/^\/[a-z0-9\-/]*$/);
      }
    }
  });

  test("BR-IDIOMA-001: hreflang is reciprocal across the four locales, and no alternate 404s", async ({
    request,
  }) => {
    // Read from the served HTML rather than a rendered page: the <link> tags
    // are in the document Next serves, and 17 routes × 4 locales through a
    // browser is minutes of nothing.
    const seen = new Map<string, number>();

    for (const route of ROUTABLE) {
      for (const locale of LOCALES) {
        const target = url(locale, route);
        const response = await request.get(target, { maxRedirects: 0 });
        expect(response.status(), `${target} (internal ${route})`).toBe(200);

        const html = await response.text();
        const alternates = Object.fromEntries(
          [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map(
            (match) => [match[1], new URL(match[2]).pathname]
          )
        );

        const expected: Record<string, string> = {};
        for (const other of LOCALES) expected[other] = url(other, route);
        expected["x-default"] = url(DEFAULT_LOCALE, route);

        expect(alternates, `hreflang on ${target}`).toEqual(expected);

        // Reciprocity is worth nothing if the addresses do not resolve.
        for (const href of Object.values(alternates)) {
          if (seen.has(href)) continue;
          const alternate = await request.get(href, { maxRedirects: 0 });
          seen.set(href, alternate.status());
          expect(alternate.status(), `alternate ${href}, reached from ${target}`).toBe(200);
        }
      }
    }
  });

  test("a declared route with no page answers 404, and does not redirect", async ({ request }) => {
    // The reserved segments are the case today: the words are decided, the
    // pages are not planned. A redirect here would hide the fact that the page
    // does not exist — and would turn a typo into a silent success for whoever
    // is testing.
    expect(DECLARED_WITHOUT_PAGE.length).toBeGreaterThan(0);
    for (const { route, urlFor } of DECLARED_WITHOUT_PAGE) {
      for (const locale of LOCALES) {
        const target = urlFor(locale);
        const response = await request.get(target, { maxRedirects: 0 });
        expect(response.status(), `${target} (internal ${route})`).toBe(404);
      }
    }
  });
});

test.describe("segment registry", () => {
  test("DS-COMPONENTE-005: the pathnames map is derived from the registry", () => {
    // The proof is mechanical: feed the derivation a registry it has never
    // seen and it produces four URLs. Nothing in src/app or src/components has
    // to change for that — which is the literal ready criterion of the rule.
    // (The key reuses a real one because SegmentKey is closed; what is under
    // test is the derivation, not the registry's own contents.)
    const invented: Segment = {
      key: "lodging",
      slugs: { pt: "parcerias/teste", en: "partners/test", es: "alianzas/prueba", it: "partner/prova" },
      icon: "Car",
      published: true,
      audioSamples: ["sample"],
      order: 99,
    };

    const derived = buildSegmentPathnames([invented]);
    expect(derived).toEqual({
      "/partners/lodging": {
        pt: "/parcerias/teste",
        en: "/partners/test",
        es: "/alianzas/prueba",
        it: "/partner/prova",
      },
    });
  });

  test("DS-COMPONENTE-005: no segment slug or key is written under src/app or src/components", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) files.push(full);
      }
    };
    walk(path.join(REPO_ROOT, "src/app"));
    walk(path.join(REPO_ROOT, "src/components"));

    const words = SEGMENTS.flatMap((segment) => Object.values(segment.slugs));
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const word of words) {
        expect(text, `${path.relative(REPO_ROOT, file)} names the segment slug "${word}"`)
          .not.toContain(word);
      }
    }
  });

  test("BR-IDIOMA-001: every segment declares four slugs, and no two share one", () => {
    for (const locale of LOCALES) {
      const seen = new Map<string, string>();
      for (const segment of SEGMENTS) {
        const slug = segment.slugs[locale as SiteLocale];
        expect(slug, `${segment.key} has no ${locale} slug`).toBeTruthy();
        expect(slug, `${segment.key}/${locale}`).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/);
        expect(seen.has(slug), `${slug} belongs to both ${seen.get(slug)} and ${segment.key}`)
          .toBe(false);
        seen.set(slug, segment.key);
      }
    }
  });

  test("BR-B2B-009: a segment can only state a publishable commercial model", () => {
    for (const segment of SEGMENTS) {
      for (const model of segment.businessModels ?? []) {
        expect(PUBLISHABLE_MODELS as readonly string[]).toContain(model);
      }
    }
  });

  test("restaurants is a reserved route: declared, unpublished, absent from the map", async ({
    request,
  }) => {
    const restaurants = SEGMENTS.find((segment) => segment.key === "restaurants");
    expect(restaurants).toBeDefined();
    expect(restaurants!.published, "restaurants is reserved, not published").toBe(false);
    expect(Object.keys(pathnames)).not.toContain("/partners/restaurants");

    // No URL exists, in any locale — and no redirect to the hub either.
    for (const locale of LOCALES) {
      const response = await request.get(`/${locale}/${restaurants!.slugs[locale]}`, {
        maxRedirects: 0,
      });
      expect(response.status(), `/${locale}/${restaurants!.slugs[locale]}`).toBe(404);
    }
  });

  test("no reserved segment slug reaches the sitemap", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const segment of SEGMENTS) {
      if (segment.published) continue;
      for (const slug of Object.values(segment.slugs)) {
        expect(xml, `sitemap lists the reserved route ${slug}`).not.toContain(slug);
      }
    }
  });

  test("every static URL in the sitemap answers 200", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    // The tour subtree is 200+ URLs generated from the snapshot and is covered
    // by its own pages; what this asserts is that the static list the sitemap
    // declares by hand did not go stale when a slug moved.
    const staticLocs = locs.filter((loc) => !loc.includes("/tours") && !loc.includes("/d/"));
    expect(staticLocs.length).toBeGreaterThan(0);
    for (const loc of staticLocs) {
      const response = await request.get(new URL(loc).pathname, { maxRedirects: 0 });
      expect(response.status(), loc).toBe(200);
    }
  });
});

test.describe("moved routes", () => {
  test("every moved route answers 301 — not 302, not 307 — at the right URL per locale", async ({
    request,
  }) => {
    for (const { from, to } of MOVED_ROUTES) {
      for (const locale of LOCALES) {
        const source = `/${locale}${from}`;
        const destination = `/${locale}${localizedPathname(locale, to)}`;
        if (source === destination) continue;

        const response = await request.get(source, { maxRedirects: 0 });
        expect(response.status(), `${source} should be a permanent redirect`).toBe(301);
        expect(new URL(response.headers()["location"], "http://x").pathname, source)
          .toBe(destination);

        const landed = await request.get(destination, { maxRedirects: 0 });
        expect(landed.status(), `${source} lands on ${destination}`).toBe(200);
      }
    }
  });

  test("the English technology URL did not move", async ({ request }) => {
    // Its slug already was the English word, so there is nothing to redirect
    // and redirecting it would cost a hop on the locale that has most of the
    // inbound links.
    const response = await request.get("/en/technology", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });

  test("/enterprise/fleets stays where it is", async ({ request }) => {
    // Its destination (/partners/car-rental) has no page yet. Redirecting to
    // it would trade a bad URL for a 404.
    for (const locale of LOCALES) {
      const response = await request.get(`/${locale}/enterprise/fleets`, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
    }
  });
});

test.describe("URLs that live outside the site", () => {
  // DS-COPY-006, edge case 1: these are printed on QR codes and sit inside
  // partner links. A locale prefix or a translated slug breaks physical
  // material already handed out and drops commission attribution in silence —
  // with no error anywhere.
  test("/download answers without a locale prefix and without redirecting", async ({ request }) => {
    const response = await request.get("/download", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });

  test("/d/<slug> answers without a locale prefix and without redirecting", async ({ request }) => {
    const response = await request.get("/d/e2e-com-logo", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });

  test("/download is still there for the printed material to land on", async ({ request }) => {
    // The one that must never move. It is on QR codes already handed out and
    // inside partner links, and it is the door where `?ID=<uuid>` names the
    // partner who earns the commission (BR-B2B-001) — whether that lookup then
    // credits anyone is download-attribution.spec.ts's question, not this one.
    // The chrome no longer links here (see the CTA suite below) and that is not
    // permission to retire it: this traffic comes from paper, not from the site.
    for (const query of ["", `?ID=${TUGGI_PARTNER_ID}`]) {
      const response = await request.get(`/download${query}`, { maxRedirects: 0 });
      expect(response.status(), `/download${query}`).toBe(200);
    }
  });

  test("the tour subtree kept its slug in every locale", async ({ request }) => {
    // Coupling with the CMS, documented in docs/contracts/cms-para-site.md:
    // the route slug comes from the CMS snapshot, and only the menu label for
    // this destination changed.
    for (const locale of LOCALES) {
      for (const route of ["/tours", "/tours/brazil"]) {
        const response = await request.get(`/${locale}${route}`, { maxRedirects: 0 });
        expect(response.status(), `/${locale}${route}`).toBe(200);
      }
    }
  });
});

/**
 * BR-B2B-001 — "the partner QR is an instrument of attribution, not of sale":
 *              only a partner's own link may claim a download.
 * DS-COPY-006, edge case 1 — the printed URL does not change once handed out.
 *
 * The site chrome draws "Download app" four times, and until 2026-08-07 all
 * four went to the bare `/download`: a page that plays no audio and, with no
 * `?ID=`, resolves nobody. They now go to the Tuggi landing, which plays our
 * own welcome audio — the same call AppDownloadButton already made for its
 * desktop fallback — and resolves the internal Tuggi client. That client is a
 * row in core.clients and not a partner: `isAttributablePartnerId` returns
 * false for it, so nothing is credited and no commission moves. Stamping it is
 * what "organic" means here.
 *
 * Two failures this pins, both silent in production:
 *  - a fifth CTA (or a fixed one) written by hand against `/download` again,
 *    which is how the four drifted apart in the first place;
 *  - the `tuggi` row disappearing from core.clients, which turns the CTA in
 *    the header of every page on the site into a 404.
 */
test.describe("the chrome's download CTA", () => {
  const LANDING = `/d/${TUGGI_CLIENT_SLUG}`;

  for (const locale of LOCALES) {
    test(`all four CTAs point at the Tuggi landing in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`);

      const ctas = page.locator("[data-download-cta]");
      // The mobile drawer is in the DOM at every width — it slides, it does not
      // mount — so the count is four without opening anything.
      await expect(ctas).toHaveCount(DOWNLOAD_CTA_SCOPES.length);

      for (const scope of DOWNLOAD_CTA_SCOPES) {
        const cta = page.locator(`[data-download-cta="${scope}"]`);
        await expect(cta, `${scope} is rendered exactly once`).toHaveCount(1);
        // The locale prefix is what the visitor is already reading in: these
        // are internal links, not the prefix-free URL that goes on paper.
        await expect(cta, `${scope} href`).toHaveAttribute(
          "href",
          `/${locale}${LANDING}`
        );
      }
    });
  }

  test("that landing resolves the internal Tuggi client, prefixed or not", async ({
    request,
  }) => {
    // A 200 alone would also pass on a landing that resolved somebody else's
    // partner page, so the payload is read for the id: the page hands
    // PartnerHeroWrapper a `partnerId`, and that value is the whole difference
    // between an unattributed install and a commission.
    for (const path of [LANDING, ...LOCALES.map((locale) => `/${locale}${LANDING}`)]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
      expect(await response.text(), `${path} carries the Tuggi client id`).toContain(
        TUGGI_PARTNER_ID
      );
    }
  });
});

test.describe("main menu", () => {
  const EXPECTED_LABELS: Record<SiteLocale, string[]> = {
    pt: ["Parcerias", "Destinos", "Tecnologia", "Planos", "Áudio-guias", "Propósito"],
    en: ["Partners", "Destinations", "Technology", "Plans", "Audio Guides", "Purpose"],
    es: ["Alianzas", "Destinos", "Tecnología", "Planes", "Audioguías", "Propósito"],
    it: ["Partner", "Destinazioni", "Tecnologia", "Piani", "Audioguide", "Il nostro scopo"],
  };

  test("the six labels exist in the four message files, in menu order", () => {
    for (const locale of LOCALES) {
      const messages = JSON.parse(
        fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")
      );
      const labels = NAV_ITEMS.map((item) => messages.Header[item.labelKey]);
      expect(labels, `Header labels in ${locale}`).toEqual(EXPECTED_LABELS[locale]);
    }
  });

  test("the Platform grouper and its keys are gone from the four message files", () => {
    // An orphan i18n key is the same defect as code with no caller.
    for (const locale of LOCALES) {
      const raw = fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8");
      const messages = JSON.parse(raw);
      for (const key of ["navPlatform", "navCityOs", "navFleets", "navB2c", "navTours", "navContact"]) {
        expect(Object.keys(messages.Header), `${key} in ${locale}.json`).not.toContain(key);
      }
    }
  });

  test("desktop and mobile list the same destinations, in the same order", async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);

      const expectedHrefs = VISIBLE_NAV_ITEMS.map((item) => url(locale, item.href));

      // `data-nav-scope`, not the landmark name: the names are copy now
      // (A11y.mainNavigation / A11y.mobileNavigation, #198) and change with the
      // locale, while this loop runs over four of them. Asserting the hook
      // resolves before reading it is what keeps a renamed attribute from
      // arriving here as an empty list instead of a failure.
      const desktopNav = page.locator('nav[data-nav-scope="desktop"]');
      await expect(desktopNav, `desktop nav in ${locale}`).toHaveCount(1);

      const desktop = await desktopNav
        .locator("a[data-nav-item]")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
      expect(desktop, `desktop menu in ${locale}`).toEqual(expectedHrefs);

      // The panel used to carry a different set of items than the row above —
      // including one (Contact) the desktop never had. One registry, two
      // presentations.
      const mobileNav = page.locator('nav[data-nav-scope="mobile"]');
      await expect(mobileNav, `mobile nav in ${locale}`).toHaveCount(1);

      const mobile = await mobileNav
        .locator("a[data-nav-item]")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
      expect(mobile, `mobile panel in ${locale}`).toEqual(expectedHrefs);
    }
  });

  test("an item whose destination has no page stays out of the menu", async ({ page }) => {
    // Partners was that item until #195 built the hub, and the rule it proved
    // is not about Partners: a menu entry that leads to a 404 is worse than a
    // missing entry. So the assertion is the invariant rather than the
    // snapshot — every item's `published` flag has to agree with whether a
    // page file exists, in both directions, and the menu has to show exactly
    // the ones that do. Listing the hidden hrefs by hand is what would have
    // gone quietly true-because-empty the day the list emptied.
    for (const item of NAV_ITEMS) {
      expect(item.published, `${item.href}: published flag vs. its page file`).toBe(
        hasPage(item.href)
      );
    }

    const hidden = NAV_ITEMS.filter((item) => !item.published);

    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      const header = page.locator('nav[data-nav-scope="desktop"]');
      // The loop below asserts absences, and an absence inside a locator that
      // matched nothing is free. So the locator itself is asserted first: a
      // renamed or dropped `data-nav-scope` fails here rather than turning the
      // whole test green-because-empty. (The same reason the second loop
      // exists — one guards the locator, the other guards the emptiness of
      // `hidden`.)
      await expect(header, `desktop nav in ${locale}`).toHaveCount(1);
      for (const item of hidden) {
        await expect(header.locator(`a[href="${url(locale, item.href)}"]`)).toHaveCount(0);
      }
      // The other half, and it is what keeps the loop above from proving
      // nothing while `hidden` is empty: what is published is on screen.
      for (const item of VISIBLE_NAV_ITEMS) {
        await expect(
          header.locator(`a[data-nav-item][href="${url(locale, item.href)}"]`)
        ).toHaveCount(1);
      }
    }
  });

  test("the hub flag and the hub page agree with each other", () => {
    // This is the whole switch: adding src/app/[locale]/partners/page.tsx
    // without flipping PARTNERS_HUB_PUBLISHED leaves the item invisible, and
    // flipping it without the page puts a 404 in the menu. Either one fails
    // here instead of in production.
    const hubPage = path.join(APP_DIR, "partners/page.tsx");
    expect(PARTNERS_HUB_PUBLISHED, "PARTNERS_HUB_PUBLISHED vs. src/app/[locale]/partners/page.tsx")
      .toBe(fs.existsSync(hubPage));
  });
});
