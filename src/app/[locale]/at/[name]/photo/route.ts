import { fetchPublicPhoto } from "@/lib/public-page";

/**
 * `tuggi.app/@nome/photo`: the moderated photo of the account, by the public
 * @, for the two photos that are public: a creator with a page (BR-B2B-067
 * item 2.b) and a guide shown in "Parceiros" (BR-B2B-064 item 4.a). The
 * database decides which, `partner.public_photo_key` (`fetchPublicPhoto`).
 * `middleware.ts` rewrites `/@nome/...` here like it does the page.
 *
 * The bytes come through this server so that nothing the visitor receives
 * names the storage: no bucket, no key, no account id, no signed URL. A
 * redirect to a signed URL would hand all of that over again.
 *
 * Every name that has no photo to show (no page, a client's page, another
 * spelling, a creator without a photo, a guide out of "Parceiros", an object
 * that could not be read)
 * gets the one 404 below, so this door tells nothing the page's own 404 does
 * not (item 5). The photo is kept for minutes only: a removed photo leaves on
 * the next read of the page, which stops naming it, and a stored copy stays
 * short.
 */
export const dynamic = "force-dynamic";

const PHOTO_CACHE = "public, max-age=300";

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }): Promise<Response> {
  const { name } = await params;

  let photo;
  try {
    photo = await fetchPublicPhoto(name);
  } catch (err) {
    console.error("public photo: the database did not answer", err instanceof Error ? err.message : "unknown");
    return new Response("Unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (!photo) return notFound();

  return new Response(photo.bytes, {
    status: 200,
    headers: {
      "content-type": photo.contentType,
      "cache-control": PHOTO_CACHE,
      "x-content-type-options": "nosniff",
    },
  });
}
