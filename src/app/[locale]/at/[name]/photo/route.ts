import { fetchCreatorPhoto, resolvePublicPage } from "@/lib/public-page";

/**
 * `tuggi.app/@nome/photo`: the creator's moderated photo, by the public @
 * (BR-B2B-067 item 2.b). `middleware.ts` rewrites `/@nome/...` here like it
 * does the page.
 *
 * The bytes come through this server so that nothing the visitor receives
 * names the storage: no bucket, no key, no account id, no signed URL. A
 * redirect to a signed URL would hand all of that over again.
 *
 * Every name that has no photo to show (no page, a client's page, another
 * spelling, a creator without a photo, an object that could not be read)
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

  let page;
  try {
    page = await resolvePublicPage(name);
  } catch (err) {
    console.error("creator photo: the resolver did not answer", err instanceof Error ? err.message : "unknown");
    return new Response("Unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (page.state !== "page" || page.kind !== "creator") return notFound();

  const photo = await fetchCreatorPhoto(page);
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
