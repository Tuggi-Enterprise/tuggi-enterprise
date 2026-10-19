import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { getRouteLink } from "@/lib/route-link";
import { buildTwitterCard } from "@/lib/seo";
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
 */
export const dynamic = "force-dynamic";

const OG_IMAGE = "/images/og-image-tuggi.jpg";

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
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "TUGGI" }],
    },
    twitter: buildTwitterCard({ title, description, image: OG_IMAGE }),
  };
}

export default async function RouteLinkPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const route = await getRouteLink(slug, locale);

  // An old slug (the history) or a slug typed in another case: one canonical
  // URL, as a permanent redirect — the same rule `/d/` follows.
  if (route.status === "available" && route.slug !== slug) {
    permanentRedirect(`/r/${encodeURIComponent(route.slug)}`);
  }

  return <RouteLinkView route={route} userAgent={(await headers()).get("user-agent")} />;
}
