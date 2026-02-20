import { getTranslations } from "next-intl/server";
import { DriveHero } from "@/components/blocks/DriveHero";
import { DriveBehavior } from "@/components/blocks/DriveBehavior";
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
  };
}

export default async function DrivePage() {
  return (
    <article className="min-h-screen">
      <DriveHero />
      <DriveBehavior />
      <DriveFeatures />
      <DrivePricing />
      <DriveConversion />
    </article>
  );
}
