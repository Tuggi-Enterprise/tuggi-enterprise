import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { getRouteSlugById } from "@/lib/route-link";
import { RouteLinkView } from "@/components/blocks/RouteLinkView";

/**
 * `tuggi.app/route/<uuid>` — the link the app's Wrapped card shared before
 * #946. It used to answer 404 with no store on it. Now it redirects to the
 * route's `/r/<slug>`, and a route it cannot resolve gets the not-found body of
 * the route page, which still has the store (precedent BR-B2B-001).
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "RouteLink" });
  return { title: t("notFoundTitle"), robots: { index: false, follow: false } };
}

export default async function LegacyRoutePage({ params }: { params: Params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const slug = await getRouteSlugById(id);
  if (slug) permanentRedirect(`/r/${encodeURIComponent(slug)}`);
  return <RouteLinkView route={{ status: "not_found" }} userAgent={(await headers()).get("user-agent")} />;
}
