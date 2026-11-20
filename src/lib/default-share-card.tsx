import { ImageResponse } from "next/og";
import { publicAssetDataUrl } from "@/lib/public-asset";

/**
 * The default share card of the site: `public/images/og-image-tuggi.jpg`,
 * re-encoded by Satori so a route that declares `image/png` stays honest.
 *
 * One owner for "no image of our own, so the Tuggi one": the partner landing
 * page (`d/[slug]/opengraph-image.tsx`) falls back to it when the partner has
 * no seal, and the route link (`r/[slug]/opengraph-image.tsx`, BR-ROTA-005
 * item 8.b) when the route has no readable cover.
 *
 * The file is read inside the card and memoised, never at module scope: on the
 * Worker a module-scope read took the whole page down with it
 * (`src/lib/public-asset.ts`).
 */
const DEFAULT_IMAGE_PATH = "images/og-image-tuggi.jpg";

export async function defaultShareCard(size: { width: number; height: number }): Promise<ImageResponse> {
  const image = await publicAssetDataUrl(DEFAULT_IMAGE_PATH, "image/jpeg");
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* Drawn by Satori into a PNG, never sent to a browser: next/image does not apply. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} width={size.width} height={size.height} alt="" />
      </div>
    ),
    size
  );
}
