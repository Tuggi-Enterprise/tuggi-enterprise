/**
 * opengraph-image.tsx
 *
 * Dynamic Open Graph image for the /coverage page.
 * Generated at build time (SSG) using Next.js Satori integration.
 * Shows real coverage stats from the snapshot — auto-updates with `npm run update-coverage`.
 *
 * Preview: https://www.tuggi.app/coverage (shared on WhatsApp, Slack, Twitter, LinkedIn)
 */

import { ImageResponse } from "next/og";
import { getCoverageData } from "@/lib/coverage";
import { getCountryDisplayName } from "@/lib/countryNames";

export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt         = "TUGGI Global Coverage — Audio Stories Across the World";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US");
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
export default async function Image() {
  const coverage  = await getCoverageData();
  const countries = topCountries(coverage.states);

  const countDisplay = fmt(Math.floor(coverage.totalActiveRaw / 1000) * 1000);

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
              TUGGI · GLOBAL COVERAGE
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
            Audio Stories Ready to Play
          </div>

          {/* Stat chips */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Countries",   value: String(coverage.totalActiveCountries) },
              { label: "Regions",     value: String(coverage.totalActiveRegions)   },
              { label: "Active POIs", value: fmt(coverage.totalActiveRaw)          },
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
            Coverage by Country
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
                {fmt(count)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
