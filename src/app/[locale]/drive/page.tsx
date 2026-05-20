import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { DriveHero } from "@/components/blocks/DriveHero";
import { DriveBehavior } from "@/components/blocks/DriveBehavior";
import { DriveSamples } from "@/components/blocks/DriveSamples";
import { DriveFeatures } from "@/components/blocks/DriveFeatures";
import { DrivePricing } from "@/components/blocks/DrivePricing";
import { DriveConversion } from "@/components/blocks/DriveConversion";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("driveTitle");
  const description = t("driveDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "drive"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath: "drive" }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function DrivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="min-h-screen">
      <DriveHero />
      <DriveBehavior />
      <DriveSamples />
      <DriveFeatures />
      <DrivePricing />
      <DriveConversion />
    </article>
  );
}
