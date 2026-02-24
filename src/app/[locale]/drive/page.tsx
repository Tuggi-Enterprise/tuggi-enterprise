import { getTranslations, setRequestLocale } from "next-intl/server";
import { DriveHero } from "@/components/blocks/DriveHero";
import { DriveBehavior } from "@/components/blocks/DriveBehavior";
import { DriveSamples } from "@/components/blocks/DriveSamples";
import { DriveFeatures } from "@/components/blocks/DriveFeatures";
import { DrivePricing } from "@/components/blocks/DrivePricing";
import { DriveConversion } from "@/components/blocks/DriveConversion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("driveTitle"),
    description: t("driveDescription"),
    alternates: {
      canonical: `/${locale}/drive`,
      languages: {
        "en": "/en/drive",
        "es": "/es/drive",
        "pt-br": "/pt-br/drive",
        "pt-pt": "/pt-pt/drive",
        "x-default": "/en/drive",
      },
    },
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
