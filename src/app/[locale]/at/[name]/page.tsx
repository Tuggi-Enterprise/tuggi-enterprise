import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { ClientPartnerPage } from "@/components/partner-page/ClientPartnerPage";
import { CreatorPageView } from "@/components/partner-page/CreatorPageView";
import { kitPieceOf, recordActivationScan } from "@/lib/activation-scan";
import { lookupPartnerSlug } from "@/lib/partner";
import { clientPageMetadata, creatorPageMetadata, notFoundPageMetadata } from "@/lib/partner-page-metadata";
import { recordPageVisit, resolvePublicPage } from "@/lib/public-page";
import { requestWelcomeLang } from "@/lib/request-welcome-lang";

/**
 * `tuggi.app/@nome` — the partner page, BR-B2B-037 and BR-B2B-067, for a
 * creator, a hotel, a restaurant. The canonical address of every partner; the
 * printed `/d/{slug}` is the other door to the same page, through the same
 * resolver (`resolvePublicPage`).
 *
 * The `@` lives in the URL only: `middleware.ts` rewrites `/@nome` here, with
 * the visitor's language, because Next reads a folder named `@x` as a
 * parallel-route slot. This internal path redirects to `/@nome` if asked for.
 *
 * Rendered on every request and never stored (#987 for `/d/`): each opening
 * counts (`recordPageVisit`), and a photo removed or a flag turned off leaves
 * the page on the next read.
 *
 * The kit QR is printed with this address since #1147, so `?k={piece}` counts
 * here exactly as on `/d/` (BR-B2B-050 item 4): under the name the QR carries,
 * before the render and before a redirect, which drops `k`.
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; name: string }>;
type Query = Promise<Record<string, string | string[] | undefined>>;

const langOf = (query: Record<string, string | string[] | undefined>) =>
  typeof query.lang === "string" ? query.lang : undefined;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Query }): Promise<Metadata> {
  const { locale, name } = await params;
  const page = await resolvePublicPage(name);
  if (page.state === "page" && page.kind === "creator") return creatorPageMetadata(locale, page);
  if (page.state === "page" && page.kind === "client") {
    const dbLang = await requestWelcomeLang(locale, langOf(await searchParams));
    const resolved = await lookupPartnerSlug(page.name, dbLang);
    if (resolved?.kind === "partner") {
      return clientPageMetadata(locale, resolved.partner, page.name, `/@${page.name}`);
    }
  }
  return notFoundPageMetadata(locale);
}

/**
 * The query of the visit, carried through a redirect: `lang` and the `utm_*`
 * the store links read (#1060). Not `k`: the scan was counted before the hop.
 */
function forwardedQuery(query: Record<string, string | string[] | undefined>): string {
  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "k" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) forwarded.append(key, item);
  }
  const search = forwarded.toString();
  return search ? `?${search}` : "";
}

export default async function PublicPartnerPage({ params, searchParams }: { params: Params; searchParams: Query }) {
  const { locale, name } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const requestHeaders = new Headers(await headers());
  // A kit QR (#815, #1147): counted with the printed name, awaited with the
  // resolver so a redirect or a 404 never cuts it, and never delaying the page.
  // The function itself refuses a name that is not a reserved slug.
  const piece = kitPieceOf(query.k);
  const [page] = await Promise.all([
    resolvePublicPage(name),
    piece ? recordActivationScan(name, piece, requestHeaders) : null,
  ]);

  // Every name without a page: the one 404, nothing credited (BR-B2B-067 item 5).
  if (page.state === "not_found") notFound();

  // Another spelling, the @ before the change, a place's printed slug: one
  // permanent hop to the recorded name (BR-B2B-067 item 4). The page there
  // credits the same partner.
  if (page.state === "redirect") {
    permanentRedirect(`/@${encodeURIComponent(page.to)}${forwardedQuery(query)}`);
  }

  const dbLang = await requestWelcomeLang(locale, langOf(query));
  const visit = recordPageVisit(page.clientId, "at_name", requestHeaders);

  if (page.kind === "creator") {
    await visit;
    return <CreatorPageView page={page} locale={locale} dbLang={dbLang} />;
  }

  // A place or a client: the blocks come from the read `/d/{slug}` makes.
  const [resolved] = await Promise.all([lookupPartnerSlug(page.name, dbLang), visit]);
  // The resolver knows the page and the read of its blocks failed: the plain
  // download page, as `/d/{slug}` does, and never a 404 for a real partner.
  if (resolved?.kind !== "partner") {
    return (
      <main>
        <PartnerHeroWrapper partnerData={null} />
      </main>
    );
  }
  return (
    <ClientPartnerPage
      locale={locale}
      partner={resolved.partner}
      coupon={resolved.coupon}
      slug={page.name}
      path={`/@${page.name}`}
      attributes={page.attributes}
      verified={page.verified}
      social={page.social}
    />
  );
}
