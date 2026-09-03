/**
 * opengraph-image.tsx
 *
 * Dynamic Open Graph image for the /coverage page.
 * Generated at build time (SSG) using Next.js Satori integration.
 *
 * **No number on this card comes from `coverage-snapshot.json`.** The three
 * figures the rule owns — mapped points, countries and the region floor — come
 * from lib/product-facts (BR-COMUNICACAO-002 items 8, 9 and 10), and the
 * country panel is a list of names with no count beside them (#221). The
 * snapshot may feed a listing and may not feed a number presented as a claim,
 * and item 5 names an Open Graph image as exactly that kind of surface: this
 * whole file is an affirmation. The ranking that used to print
 * `fmt(activeCount)` per country published a figure off a snapshot frozen at
 * 2026-07-13, which superdeclares the archive against the production
 * measurement the rule was written from — item 9's own `totalActiveRaw` case.
 *
 * Preview: https://www.tuggi.app/coverage (shared on WhatsApp, Slack, Twitter, LinkedIn)
 *
 * This is what /coverage shares (#209). page.tsx names this route's URL in
 * `openGraph.images` and in the Twitter card, because buildOpenGraph always
 * sets `images` and therefore suppresses the App Router file convention — and
 * because the convention would also take the `alt` with it, which has to follow
 * the locale and cannot: the `alt` export is a static string, and it is gone
 * from this file for that reason. The alt a reader hears is
 * SEO_COVERAGE.ogImageAlt, served by the page.
 */

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { routing } from "@/i18n/routing";
import { getCoverageData } from "@/lib/coverage";
import {
  COVERAGE_COUNTRIES,
  MAPPED_POINT_MILLIONS,
  COVERAGE_REGIONS_FLOOR,
} from "@/lib/product-facts";
import { activeCountries } from "@/lib/coverage-density";
import { localizedCountryLabel } from "@/lib/countryNames";

export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";
/**
 * The header of this file has claimed "generated at build time (SSG)" since it
 * was written, and until #687 that was only an intention: the route was built
 * as `ƒ`, and Satori + resvg rasterised the card again on every WhatsApp, Slack
 * and LinkedIn preview fetch — `next/og` serves `max-age=0, must-revalidate`,
 * so nothing cached the repeat either.
 *
 * **The four locales have to be listed here, and `[locale]/layout.tsx` naming
 * them is not enough** — measured, 2026-09-03. A *page* inherits the layout's
 * `generateStaticParams` (`/[locale]/coverage` builds as `●` with four paths
 * and declares none of its own); a metadata image route does not. With
 * `force-static` and no params of its own this route builds as `○`, and
 * `prerender-manifest.json` holds no path for it at all: nothing is written at
 * build, and the first request of each locale still pays for the raster.
 * `tours/[country]/[slug]/opengraph-image.tsx` is the shape that works — it
 * iterates `routing.locales` itself.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The signature on this card is the lockup, not the symbol and not a letter in
 * a square: a share preview is a surface where people *discover* the brand
 * (DS-MARCA-007 item 7). The white two-colour variant is the one that is
 * correct over a dark background (DS-MARCA-005).
 *
 * Read once at module scope — the file never changes between requests.
 */
const LOCKUP = await readFile(
  join(process.cwd(), "public", "images", "logo_tuggi_full_white.png"),
  "base64"
).then((data) => `data:image/png;base64,${data}`);

/** Fixed height, automatic width: the lockup is 3.02:1 and is never stretched
 *  (DS-MARCA-007 item 1). Satori reads the intrinsic ratio from the buffer. */
const LOCKUP_HEIGHT = 40;

// ── Helpers ────────────────────────────────────────────────────────────────────
// Grouping follows the locale of the card, not en-US: "1,183" reads as a
// decimal to every locale on this site that writes 1.183.
function fmt(n: number, locale: string) {
  return n.toLocaleString(locale);
}

/** How many names the right panel holds before it runs past the card. */
const COUNTRY_PANEL_ROWS = 7;

// ── Image ──────────────────────────────────────────────────────────────────────
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t         = await getTranslations({ locale, namespace: "SEO_COVERAGE" });
  const coverage  = await getCoverageData();
  // Names, and nothing beside them. `activeCountries` is the same listing the
  // map's own pills are built from — the navigation the rule allows — and it
  // keeps this file from touching a snapshot count at all (#221).
  const countries = activeCountries(coverage.states)
    .slice(0, COUNTRY_PANEL_ROWS)
    .map(country => localizedCountryLabel(country, locale));

  // The published floor — one owner, in lib/product-facts. The "+" is the
  // "mais de" of BR-COMUNICACAO-002 item 4.
  const countDisplay = `${fmt(MAPPED_POINT_MILLIONS * 1_000_000, locale)}+`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow — top-left */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -180,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,168,232,0.12) 0%, transparent 70%)",
          }}
        />
        {/* Background glow — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -200,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,168,232,0.07) 0%, transparent 70%)",
          }}
        />

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "64px 72px",
          }}
        >
          {/* Signature. The eyebrow next to it is the category only: the
              lockup spells the name, so repeating it in text was the same
              word twice. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <img src={LOCKUP} height={LOCKUP_HEIGHT} style={{ objectFit: "contain" }} alt="" />
            <span
              style={{
                color: "#00a8e8",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {t("ogEyebrow")}
            </span>
          </div>

          {/* Big number */}
          <div
            style={{
              color: "#ffffff",
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              marginBottom: 8,
            }}
          >
            {countDisplay}
          </div>
          <div
            style={{
              color: "#00a8e8",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 40,
            }}
          >
            {t("ogHeadline")}
          </div>

          {/* Stat chips. The third chip is gone: it republished the big number
              above, exact and off a frozen snapshot. The label over that number
              named a content noun over a count of mapped points, two orders of
              magnitude apart — BR-COMUNICACAO-002 item 2. It now comes from
              SEO_COVERAGE.ogHeadline, in the locale of the card. */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: t("ogStatCountries"), value: String(COVERAGE_COUNTRIES)               },
              // The floor, "+" and all — item 10's own exception to item 4's
              // exact-with-date escape. `coverage.totalActiveRegions` (980)
              // is the map's post-threshold count, not this figure.
              { label: t("ogStatRegions"),   value: `${fmt(COVERAGE_REGIONS_FLOOR, locale)}+` },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "12px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    color: "#00a8e8",
                    fontSize: 28,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    color: "#5b6472",
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div
          style={{
            width: 1,
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent)",
            margin: "40px 0",
          }}
        />

        {/* ── Right panel: country list ─────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 360,
            padding: "64px 48px",
          }}
        >
          <div
            style={{
              color: "#5b6472",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            {t("ogCountryList")}
          </div>

          {countries.map(name => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span
                style={{
                  color: "#e2e8f0",
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
