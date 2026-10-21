/**
 * opengraph-image.tsx — /d/<slug> (partner landing page).
 *
 * The QR on the printed display is not the only way this URL travels: it also
 * gets pasted into WhatsApp and Instagram to promote the event. A generic Tuggi
 * card there says nothing about who is inviting, so when the partner has a seal
 * (partner.clients.avatar_url) we draw it next to the partner name.
 *
 * Most partners have no seal. That case keeps the exact image the route served
 * before this file existed (public/images/og-image-tuggi.jpg), re-encoded by
 * Satori so the declared contentType stays honest.
 *
 * Same shape as the tours OG image: system fonts only, no webfont fetch.
 */

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  getDbLang,
  listApprovedPartners,
  lookupPartnerSlug,
  PARTNER_CACHE_SECONDS,
} from "@/lib/partner";
import { publicAssetDataUrl } from "@/lib/public-asset";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TUGGI — Self-guided audio tour";

type Params = { locale: string; slug: string };

/**
 * Every published partner URL × every locale, built once at deploy — the same
 * shape as `tours/[country]/[slug]/opengraph-image.tsx`, over the list in
 * `listApprovedPartners()` that `src/app/sitemap.ts` submits to Google (#687).
 *
 * Without this, the route had no known path to pre-render and was built as `ƒ`:
 * every preview fetch re-ran Satori and resvg, and `next/og` answers
 * `max-age=0, must-revalidate`, so no CDN absorbed the repeat. The card is a
 * function of the partner row and the locale, both of which are known at build.
 *
 * The locale is in the params because the tagline is translated, even though
 * the URL a partner shares (`/d/<slug>`) carries none — the middleware picks
 * one per request and rewrites into one of these.
 *
 * **No `force-static` here, unlike `/coverage`, and that is the trade-off of
 * this card**: `dynamicParams` stays at its default, so a partner approved
 * *between two deploys* — absent from this list — still gets its card rendered
 * on the first request that asks for it. Turning that off would answer 404
 * instead, and the one page that names this route in its `openGraph.images`
 * (the partner with a seal, `page.tsx`) would advertise a preview that does
 * not exist.
 *
 * **That first render is kept, and redrawn at most every 5 minutes** (#987,
 * `revalidate` below). Before it, on the Cloudflare Worker, nothing kept it:
 * the cache there was read-only, so a card missing from the build was drawn
 * again on every preview fetch. The same `revalidate` refreshes the cards the
 * build wrote, so a seal or a name edited in the CMS reaches the preview too.
 * Past the 5 minutes, the first fetch still gets the previous card and
 * triggers the redraw; the one after it gets the new card.
 */
// A LITERAL, because Next reads segment config statically and refuses an
// imported value. It is `PARTNER_CACHE_SECONDS`, and the check below keeps the
// two from drifting apart.
export const revalidate = 300;

if (revalidate !== PARTNER_CACHE_SECONDS) {
  throw new Error("d/[slug]/opengraph-image: `revalidate` drifted from PARTNER_CACHE_SECONDS");
}

export async function generateStaticParams(): Promise<Params[]> {
  const partners = await listApprovedPartners();
  const params: Params[] = [];
  for (const locale of routing.locales) {
    for (const partner of partners) {
      params.push({ locale, slug: partner.slug });
    }
  }
  return params;
}

const FONT =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Read inside the card and memoised, never at module scope: on the Worker a
// module-scope read took the whole page down with it (`src/lib/public-asset.ts`).
const FALLBACK_IMAGE_PATH = "images/og-image-tuggi.jpg";

/**
 * Satori fetches remote images itself, but a failure there throws and the whole
 * card is lost. Fetching here keeps the failure local: no seal, static card.
 */
async function fetchSealDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;
    const body = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${body}`;
  } catch {
    return null;
  }
}

/** The image the route served before partner seals existed. */
async function staticCard() {
  const FALLBACK_IMAGE = await publicAssetDataUrl(FALLBACK_IMAGE_PATH, "image/jpeg");
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img src={FALLBACK_IMAGE} width={size.width} height={size.height} alt="" />
      </div>
    ),
    size
  );
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;

  const resolved = await lookupPartnerSlug(slug, getDbLang(locale));
  const partner = resolved?.kind === "partner" ? resolved.partner : null;
  if (!partner?.logoUrl || !partner.name) return staticCard();

  const seal = await fetchSealDataUri(partner.logoUrl);
  if (!seal) return staticCard();

  const t = await getTranslations({ locale, namespace: "Download" });
  const tagline = `${t("heroTitle1")} ${t("heroTitle2")} ${t("heroTitle3")}`;
  const name = partner.name;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontFamily: FONT,
          position: "relative",
          overflow: "hidden",
          padding: "0 72px",
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

        {/* Lockup, same order as the page: Tuggi first, partner seal as endorsement.
            The seal sits on a white plate because a logo drawn in dark ink would
            disappear against the brand background. */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              color: "#00a8e8",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            TUGGI
          </div>
          <div style={{ display: "flex", width: 1, height: 44, background: "#2a3546" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              borderRadius: 20,
              padding: "16px 24px",
            }}
          >
            <img src={seal} height={72} style={{ objectFit: "contain" }} alt="" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: name.length > 42 ? 54 : 66,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 22,
          }}
        >
          {name}
        </div>

        <div style={{ display: "flex", color: "#9aa5b4", fontSize: 30 }}>{tagline}</div>
      </div>
    ),
    size
  );
}
