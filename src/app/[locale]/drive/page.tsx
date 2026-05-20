import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { DriveHero } from "@/components/blocks/DriveHero";
import { DriveBehavior } from "@/components/blocks/DriveBehavior";
import { DriveSamples } from "@/components/blocks/DriveSamples";
import { DriveFeatures } from "@/components/blocks/DriveFeatures";
import { DrivePricing } from "@/components/blocks/DrivePricing";
import { DriveConversion } from "@/components/blocks/DriveConversion";
import { DriveFAQ } from "@/components/blocks/DriveFAQ";
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

  // Build FAQPage JSON-LD server-side from translations
  const faq = await getTranslations({ locale, namespace: "Drive.FAQ" });
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [1, 2, 3, 4, 5, 6].map((i) => ({
      "@type": "Question",
      "name": faq(`q${i}`),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq(`a${i}`),
      },
    })),
  };

  return (
    <article className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <DriveHero />
      <DriveBehavior />
      <DriveSamples />
      <DriveFeatures />
      <DrivePricing />
      <DriveFAQ />
      <DriveConversion />
    </article>
  );
}
