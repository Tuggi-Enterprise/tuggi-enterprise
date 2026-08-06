import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { TechHero } from "@/components/blocks/TechHero";
import { TechEngine } from "@/components/blocks/TechEngine";
import { TechOffline } from "@/components/blocks/TechOffline";
import { TechData } from "@/components/blocks/TechData";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("techTitle");
  const description = t("techDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "technology"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath: "technology" }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function TechnologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="min-h-screen">
      <TechHero />
      <TechEngine />
      <TechOffline />
      <TechData />
    </article>
  );
}
