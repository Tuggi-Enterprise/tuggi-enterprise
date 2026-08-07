/**
 * opengraph-image.tsx
 *
 * Dynamic Open Graph image for the /coverage page.
 * Generated at build time (SSG) using Next.js Satori integration.
 *
 * The three figures the rule owns — mapped points, countries and the region
 * floor — come from lib/product-facts, not from the snapshot
 * (BR-COMUNICACAO-002 items 8, 9 and 10). Only the country ranking still comes
 * from the snapshot, and it refreshes with `npm run update-coverage`.
 *
 * Preview: https://www.tuggi.app/coverage (shared on WhatsApp, Slack, Twitter, LinkedIn)
 *
 * Nothing links here yet, and that is not visible from this file: page.tsx
 * builds its metadata with buildOpenGraph, which always sets `openGraph.images`
 * and therefore suppresses the App Router file convention — measured on the
 * served HTML of /pt/coverage, which advertises /images/og-image-tuggi.jpg.
 * Pointing the page at this route is a decision about what the site shares, not
 * a translation, so it did not ride in with #192.
 */

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getCoverageData } from "@/lib/coverage";
import {
  COVERAGE_COUNTRIES,
  MAPPED_POINT_MILLIONS,
  COVERAGE_REGIONS_FLOOR,
} from "@/lib/product-facts";
import { getCountryDisplayName } from "@/lib/countryNames";
import enMessages from "@/messages/en.json";

export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";
// The `alt` export is a string, not a function: it never sees `params`, so it
// cannot follow the locale the way the body below does. It reads the English
// value of the key the page already uses for this same alt
// (SEO_COVERAGE.ogImageAlt) instead of carrying a second copy of the sentence —
// one owner, and a rewrite of the key cannot leave this one behind.
export const alt         = enMessages.SEO_COVERAGE.ogImageAlt;

// ── Helpers ────────────────────────────────────────────────────────────────────
// Grouping follows the locale of the card, not en-US: "1,183" reads as a
// decimal to every locale on this site that writes 1.183.
function fmt(n: number, locale: string) {
  return n.toLocaleString(locale);
}

function topCountries(
  states: Awaited<ReturnType<typeof getCoverageData>>["states"],
  limit = 7
) {
  const map = new Map<string, number>();
  states.forEach(s => map.set(s.country, (map.get(s.country) ?? 0) + s.activeCount));
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([country, count]) => ({ name: getCountryDisplayName(country), count }));
}

// ── Image ──────────────────────────────────────────────────────────────────────
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t         = await getTranslations({ locale, namespace: "SEO_COVERAGE" });
  const coverage  = await getCoverageData();
  const countries = topCountries(coverage.states);

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
          {/* Brand badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                background: "#00a8e8",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                T
              </span>
            </div>
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

          {countries.map(({ name, count }) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent: "space-between",
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
              <span
                style={{
                  color: "#00a8e8",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {fmt(count, locale)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
