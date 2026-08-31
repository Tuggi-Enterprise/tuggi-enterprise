/**
 * opengraph-image.tsx — the share card of an editorial article.
 *
 * `DS-COMPONENTE-056`. The construction is `coverage/opengraph-image.tsx`'s,
 * which is already proved and tested: `ImageResponse`, the lockup read once as
 * base64 at module scope, `LOCKUP_HEIGHT` fixed with automatic width.
 *
 * **There is no `alt` export here, and that absence is the rule.** The `alt` of
 * an `opengraph-image` is a static string that never sees `params`, so it
 * cannot follow the locale; the page keeps `openGraph.images` pointed at this
 * route's URL and serves the alt from the article's own `ogAlt`, per locale.
 * Letting the App Router file convention take over would publish an English
 * `og:image:alt` on the `pt`, `es` and `it` pieces.
 *
 * **Type, date and title. Nothing else** — no summary: at 1200 px the title and
 * the summary fight each other and WhatsApp cuts the preview in half.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getTranslations } from "next-intl/server";
import type { SiteLocale } from "@/i18n/locales";
import { findUpdate, formatUpdateDate, listUpdates } from "@/lib/updates";
import { COVER_VIEWBOX, buildCoverTrace } from "@/lib/updateCover";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return listUpdates(params.locale as SiteLocale).map((document) => ({ slug: document.slug }));
}

/**
 * The white two-colour lockup — a share preview is a surface where people
 * *discover* the brand (`DS-MARCA-007` item 7), and white is the variant that
 * is correct over a dark background (`DS-MARCA-005`). White on `#0b1220`
 * measures 18,72:1.
 */
const LOCKUP = await readFile(
  join(process.cwd(), "public", "images", "logo_tuggi_full_white.png"),
  "base64"
).then((data) => `data:image/png;base64,${data}`);

/** Fixed height, automatic width: the lockup is 3.06:1 and is never stretched
 *  (`DS-MARCA-007` item 1). Satori reads the intrinsic ratio from the buffer. */
const LOCKUP_HEIGHT = 40;

/** The horizontal strip the decorative trace may occupy: below the lockup
 *  (`64` of padding + its height) and above the eyebrow of the text block. */
const TRACE_BAND = { top: 150, height: 320 } as const;

/** A `y` of the 630-tall trace space, placed inside the band. */
function bandY(y: number): number {
  return TRACE_BAND.top + (y * TRACE_BAND.height) / COVER_VIEWBOX.height;
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const article = findUpdate(locale as SiteLocale, slug);
  const t = await getTranslations({ locale, namespace: "Updates.type" });

  // A card for an article that does not exist is not a card: the route is
  // generated only for the pairs the registry knows, and this is the guard for
  // anything that reaches it anyway.
  if (!article) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", background: "#0b1220", display: "flex" }} />,
      { ...size }
    );
  }

  // The same decorative trace the page draws, so the card and the hero of one
  // article are visibly the same piece (spec §6.2).
  const trace = buildCoverTrace(article.slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* The route/line metaphor, drawn behind the words. Decorative, and it
            carries no text — the title below is the only text on the card.

            **It is confined to the middle band, and that is not taste.** The
            trace is seeded by the slug, so its shape is whatever the next slug
            hashes to: at full height it ran through the lockup on `hour-passes`
            and touched the eyebrow on `pases-por-hora` — measured on the four
            cards of article #1, 2026-08-30. A card whose decoration crosses the
            brand is one the next slug decides, not the designer. The band
            starts under the lockup (64 + 40 px) and ends above the eyebrow, and
            `preserveAspectRatio="none"` squashes the same curve into it rather
            than cropping it: the card and the hero stay the same drawing. */}
        <svg
          width={1200}
          height={630}
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0, opacity: 0.28 }}
        >
          {/* The path is squeezed into the band; the two dots are drawn in the
              card's own space at the same mapped position, so they stay round.
              Scaling them with the path turns them into ovals — the shape the
              brand manual draws is a circle, and a flattened one reads as a
              rendering artefact, which is what it would be. */}
          <g transform={`translate(0 ${TRACE_BAND.top}) scale(1 ${TRACE_BAND.height / COVER_VIEWBOX.height})`}>
            <path
              d={trace.d}
              fill="none"
              stroke="#00a8e8"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <circle cx={trace.start[0]} cy={bandY(trace.start[1])} r={14} fill="#00a8e8" />
          <circle
            cx={trace.end[0]}
            cy={bandY(trace.end[1])}
            r={13}
            fill="#0b1220"
            stroke="#00a8e8"
            strokeWidth={6}
          />
        </svg>

        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Satori draws this, not the browser: `next/image` does not exist
              inside an `ImageResponse` tree. */}
          <img src={LOCKUP} height={LOCKUP_HEIGHT} style={{ objectFit: "contain" }} alt="" />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#00a8e8",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {`${t(article.type)} · ${formatUpdateDate(article.publishedAt, locale)}`}
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              // Three lines is what fits above the fold of a WhatsApp preview;
              // beyond that the card crops mid-sentence.
              display: "block",
              lineClamp: 3,
            }}
          >
            {article.title}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
