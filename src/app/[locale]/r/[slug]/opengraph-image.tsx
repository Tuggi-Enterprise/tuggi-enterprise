/**
 * opengraph-image.tsx — /r/<slug> (the route link, #1222).
 *
 * BR-ROTA-005 item 8.b: the preview of a route's link on WhatsApp and the
 * networks is the approved cover of the version on the air and the route's
 * name. Without a readable approved cover, the default Tuggi card
 * (`defaultShareCard`), and the same for a route in review, removed or
 * unknown: the share meta answers no row for those (contract
 * `link-da-rota.md` §5a), so no cover of theirs can reach this card.
 *
 * WHY THE SITE DRAWS IT. The cover lives in a private bucket under a key that
 * starts with the author's account id. `og:image` names this route and the
 * bytes come from here, redrawn: no bucket, no key, no account id, no signed
 * URL that expires while the chat keeps the address (security review of
 * #1221). Same reasoning as `/@nome/photo`.
 *
 * DRAWN ON EVERY FETCH, NOT KEPT. A route taken off the air must stop showing
 * its cover on the next preview, and route links are shared one chat at a
 * time, so the draw is cheap next to the promise. Unlike `/d/`, there is also
 * no list to build at deploy: a `link_only` route may never be enumerated.
 *
 * Same shape as the partner card: system fonts only, no webfont fetch.
 */

import { ImageResponse } from "next/og";
import { getRouteCoverDataUrl, getRouteLink } from "@/lib/route-link";
import { defaultShareCard } from "@/lib/default-share-card";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TUGGI";
export const dynamic = "force-dynamic";

type Params = { locale: string; slug: string };

const FONT =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/** Above this many characters the name steps down a size, as on the partner card. */
const LONG_NAME = 42;

export default async function Image({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;

  const [route, cover] = await Promise.all([getRouteLink(slug, locale), getRouteCoverDataUrl(slug)]);
  if (route.status !== "available" || !cover) return defaultShareCard(size);

  const name = route.name;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0b1220",
          fontFamily: FONT,
          overflow: "hidden",
        }}
      >
        <img
          src={cover}
          width={size.width}
          height={size.height}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
          alt=""
        />

        {/* The photo is the author's; the shade under the text keeps the name
            legible on a bright sky or white sand. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background:
              "linear-gradient(to top, rgba(11,18,32,0.92) 0%, rgba(11,18,32,0.55) 42%, rgba(11,18,32,0) 70%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            bottom: 60,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{ display: "flex", color: "#00a8e8", fontSize: 30, fontWeight: 700, letterSpacing: 4, marginBottom: 18 }}
          >
            TUGGI
          </div>
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: name.length > LONG_NAME ? 54 : 66,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
        </div>
      </div>
    ),
    size
  );
}
