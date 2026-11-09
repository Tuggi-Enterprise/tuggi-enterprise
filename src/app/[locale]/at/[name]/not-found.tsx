import { headers } from "next/headers";
import { PublicPageNotFound } from "@/components/partner-page/PublicPageNotFound";
import { PUBLIC_NAME_HEADER } from "@/lib/public-page-header";
import { publicNameOf } from "@/lib/public-page";

/**
 * `tuggi.app/@nome` without a page: HTTP 404, the same body for every case
 * (BR-B2B-067 item 5). Next renders it with `noindex`. The name comes from
 * the middleware, since a not-found view receives no params.
 */
export default async function PublicPageNotFoundRoute() {
  const raw = (await headers()).get(PUBLIC_NAME_HEADER);
  return <PublicPageNotFound handle={raw ? publicNameOf(raw) : null} />;
}
