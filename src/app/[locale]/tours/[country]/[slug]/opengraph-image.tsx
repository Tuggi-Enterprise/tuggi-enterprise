/**
 * opengraph-image.tsx
 *
 * Per-route Open Graph image, generated at build time (Satori).
 *
 * Every route used to share one generic JPG, so a link to any of the 49 routes
 * looked identical in WhatsApp, Slack and LinkedIn — exactly where someone is
 * recommending one specific tour. This draws the route's own shape, the same
 * geometry the card uses, next to its name and hard facts.
 *
 * System fonts only (like the /coverage image): loading a webfont here would
 * multiply build time across every route × locale.
 */

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { countryName, getRoute, getRoutesForLocale, pickLocaleContent } from "@/lib/routes";
import { buildRouteTrace } from "@/lib/routeTrace";
import { formatDistance, formatDuration } from "@/lib/tourFormat";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TUGGI — Self-guided audio tour";

type Params = { locale: string; country: string; slug: string };

export function generateStaticParams(): Params[] {
  const params: Params[] = [];
  for (const locale of routing.locales) {
    for (const route of getRoutesForLocale(locale)) {
      params.push({ locale, country: route.countrySlug, slug: route.slug });
    }
  }
  return params;
}

const FONT =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/** The route trace as a standalone SVG — Satori renders it through an <img>. */
function traceDataUri(d: string, width: number, height: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
    `<path d="${d}" fill="none" stroke="#00a8e8" stroke-width="1.1" ` +
    `stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { locale, country, slug } = await params;
  const route = getRoute(country, slug);

  const name = route ? pickLocaleContent(route, locale).name : "TUGGI";
  const place = route
    ? [...new Set([route.region, route.state, countryName(route, locale)].filter(Boolean))].join(
        " · "
      )
    : "";
  // Value + label: a bare "9" next to "49 min" and "30,4 km" reads as noise.
  const t = await getTranslations({ locale, namespace: "Tours" });
  const facts = route
    ? [
        { value: formatDuration(route.durationS), label: t("facts.duration") },
        { value: formatDistance(route.distanceM, locale), label: t("facts.distance") },
        { value: String(route.stops.length), label: t("facts.stops") },
      ].filter((f) => f.value)
    : [];
  const trace = route ? buildRouteTrace(route.geometry?.coordinates) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          fontFamily: FONT,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -180,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,168,232,0.14) 0%, transparent 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "64px 24px 64px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 28,
              color: "#00a8e8",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            TUGGI
          </div>

          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: name.length > 42 ? 54 : 66,
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            {name}
          </div>

          {place && (
            <div style={{ display: "flex", color: "#9aa5b4", fontSize: 26, marginBottom: 34 }}>
              {place}
            </div>
          )}

          <div style={{ display: "flex", gap: 48 }}>
            {facts.map((f) => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#ffffff", fontSize: 36 }}>{f.value}</div>
                <div
                  style={{
                    color: "#6b7688",
                    fontSize: 18,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    marginTop: 6,
                  }}
                >
                  {f.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {trace && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 520,
              padding: "0 56px 0 0",
            }}
          >
            <img
              src={traceDataUri(trace.d, trace.width, trace.height)}
              width={455}
              height={282}
              alt=""
            />
          </div>
        )}
      </div>
    ),
    size
  );
}
