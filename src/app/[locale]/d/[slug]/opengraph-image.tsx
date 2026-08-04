/**
 * opengraph-image.tsx — /d/<slug> (partner landing page).
 *
 * The QR on the printed display is not the only way this URL travels: it also
 * gets pasted into WhatsApp and Instagram to promote the event. A generic Tuggi
 * card there says nothing about who is inviting, so when the partner has a seal
 * (core.clients.avatar_url) we draw it next to the partner name.
 *
 * Most partners have no seal. That case keeps the exact image the route served
 * before this file existed (public/images/og-image-tuggi.jpg), re-encoded by
 * Satori so the declared contentType stays honest.
 *
 * Same shape as the tours OG image: system fonts only, no webfont fetch.
 */

import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getDbLang, resolvePartnerOrCoupon } from "@/lib/partner";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TUGGI — Self-guided audio tour";

type Params = { locale: string; slug: string };

const FONT =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Read once at module scope: the file never changes between requests.
const FALLBACK_IMAGE = await readFile(
  join(process.cwd(), "public", "images", "og-image-tuggi.jpg"),
  "base64"
).then((data) => `data:image/jpeg;base64,${data}`);

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
function staticCard() {
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

  const resolved = await resolvePartnerOrCoupon(slug, getDbLang(locale));
  const partner = resolved?.partner;
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
