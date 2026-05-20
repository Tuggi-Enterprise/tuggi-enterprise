import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { HeroSection } from "@/components/blocks/HeroSection";
import { InteractiveSimulator } from "@/components/blocks/InteractiveSimulator";
import { EnterpriseFork } from "@/components/blocks/EnterpriseFork";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("homeTitle");
  const description = t("homeDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, ""),
    robots: defaultRobots,
    openGraph: buildOpenGraph({
      title,
      description,
      locale,
      pagePath: "",
      imageAlt: "TUGGI - Self-Guided Audio Travel Guide",
    }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <InteractiveSimulator />
      <EnterpriseFork />
    </>
  );
}
