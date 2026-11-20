import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { getRouteLink, getRouteShareMeta, routeLinkOf } from "@/lib/route-link";
import { APP_STORE_ID } from "@/lib/app-meta";
import { RouteLinkView } from "@/components/blocks/RouteLinkView";

/**
 * The route page — `tuggi.app/r/<slug>`, card #946, spec
 * `docs/design/spec-link-da-rota-2026-10.md` §1, contract
 * `docs/contracts/link-da-rota.md`.
 *
 * Who reads it is a hotel guest at the front desk, phone in hand, without the
 * app, reading a printed QR. With the app installed the OS opens the app
 * instead (AASA and App Links claim `/r/*`); this page is the other case.
 *
 * Rendered per request and never cached, like `/c/`: whether a route is
 * available is the database's answer at the time of the visit. Like `/c/` and
 * `/d/`, the URL carries no locale — `middleware.ts` rewrites it.
 *
 * The preview image is the segment's `opengraph-image.tsx` (BR-ROTA-005 item
 * 8.b, #1222): Next names it in `og:image` on its own, and a file image wins
 * over any `openGraph.images` written here, so none is written. The twitter
 * card names no image either: Next hands it the same card.
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "RouteLink" });
  const route = await getRouteLink(slug, locale);

  const title =
    route.status === "available"
      ? route.name
      : route.status === "review"
        ? t("reviewTitle")
        : route.status === "gone"
          ? t("goneTitle")
          : t("notFoundTitle");
  const description = t("metaDesc");

  return {
    // Bare: the root layout's title template appends the brand.
    title,
    description,
    // Spec §0.4: one thin URL per user route, out of search in days.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: "TUGGI",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    // Safari's Smart App Banner, on this page only (#946): "Open" with the app
    // installed, "Get" without it. The argument is the route's link, which the
    // app reads as it reads the Universal Link.
    itunes: {
      appId: APP_STORE_ID,
      ...(route.status === "available" ? { appArgument: routeLinkOf(route.slug) } : {}),
    },
  };
}

export default async function RouteLinkPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  // In parallel: the share meta must not add a round trip in front of the
  // page, and the page never waits on it to exist (contract §5a).
  const [route, meta] = await Promise.all([getRouteLink(slug, locale), getRouteShareMeta(slug)]);

  // An old slug (the history) or a slug typed in another case: one canonical
  // URL, as a permanent redirect — the same rule `/d/` follows.
  if (route.status === "available" && route.slug !== slug) {
    permanentRedirect(`/r/${encodeURIComponent(route.slug)}`);
  }

  // BR-ROTA-005 item 8.a: only the author of the route this page shows. The
  // slug check keeps a meta row that resolved elsewhere from crediting anyone.
  const partnerId =
    route.status === "available" && meta?.slug === route.slug ? (meta.authorPartnerId ?? undefined) : undefined;

  return <RouteLinkView route={route} userAgent={(await headers()).get("user-agent")} partnerId={partnerId} />;
}
