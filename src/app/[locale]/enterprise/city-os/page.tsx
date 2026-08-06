import { CityOSHero } from "@/components/blocks/CityOSHero";
import { CityOSAccessibility } from "@/components/blocks/CityOSAccessibility";
import { CityOSIntelligence } from "@/components/blocks/CityOSIntelligence";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SEO_CITY_OS" });

  const title = t("title");
  const description = t("description");
  const ogTitle = t("ogTitle");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "enterprise/city-os"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({
      title: ogTitle,
      description,
      locale,
      pagePath: "enterprise/city-os",
      siteName: "TUGGI City OS",
      image: "/images/og-image-city-os.jpg",
      imageAlt: t("ogImageAlt"),
    }),
    twitter: buildTwitterCard({
      title: ogTitle,
      description,
      image: "/images/og-image-city-os.jpg",
    }),
  };
}

export default async function CityOSPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="min-h-screen">
      <CityOSHero />
      <CityOSAccessibility />
      <CityOSIntelligence />
    </article>
  );
}
