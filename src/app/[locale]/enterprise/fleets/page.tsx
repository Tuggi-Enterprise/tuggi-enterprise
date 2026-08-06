import { FleetsHero } from "@/components/blocks/FleetsHero";
import { FleetsFinancial } from "@/components/blocks/FleetsFinancial";
import { FleetsRisk } from "@/components/blocks/FleetsRisk";
import { FleetsNPS } from "@/components/blocks/FleetsNPS";
import { FleetsESG } from "@/components/blocks/FleetsESG";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SEO_FLEETS" });

  const title = t("title");
  const description = t("description");
  const ogTitle = t("ogTitle");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "enterprise/fleets"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({
      title: ogTitle,
      description,
      locale,
      pagePath: "enterprise/fleets",
      siteName: "TUGGI Enterprise",
      image: "/images/og-image-fleets.jpg",
      imageAlt: "TUGGI Fleets - Ancillary Revenue for Car Rentals",
    }),
    twitter: buildTwitterCard({
      title: ogTitle,
      description,
      image: "/images/og-image-fleets.jpg",
    }),
  };
}

export default async function FleetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="min-h-screen">
      <FleetsHero />
      <FleetsFinancial />
      <FleetsRisk />
      <FleetsNPS />
      <FleetsESG />
    </article>
  );
}
