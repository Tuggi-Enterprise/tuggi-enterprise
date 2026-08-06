import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { HomeHero } from "@/components/blocks/HomeHero";
import { HomeHowItWorks } from "@/components/blocks/HomeHowItWorks";
import { HomeFeatureShowcase } from "@/components/blocks/HomeFeatureShowcase";
import { HomeAudioSample } from "@/components/blocks/HomeAudioSample";
import { HomeBusinessBand } from "@/components/blocks/HomeBusinessBand";
import { HomeMotionConfig } from "@/components/blocks/HomeMotionConfig";
import { CoverageStrip } from "@/components/blocks/CoverageStrip";
import { ProseSection } from "@/components/blocks/ProseSection";
import { FaqSection } from "@/components/blocks/FaqSection";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

const HOME_FAQ_COUNT = 7;

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
      imageAlt: t("homeOgImageAlt"),
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

  // FAQPage JSON-LD built server-side from the same translations the FAQ renders,
  // so AI engines and search can cite the answers.
  const faq = await getTranslations({ locale, namespace: "Home.FAQ" });
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": Array.from({ length: HOME_FAQ_COUNT }, (_, idx) => idx + 1).map((i) => ({
      "@type": "Question",
      "name": faq(`q${i}`),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq(`a${i}`),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HomeMotionConfig>
        <HomeHero />
        <HomeHowItWorks />
        <HomeFeatureShowcase />
        <CoverageStrip />
        <HomeAudioSample />
        <ProseSection namespace="Home.Context" />
        <HomeBusinessBand />
        <FaqSection namespace="Home.FAQ" count={HOME_FAQ_COUNT} />
      </HomeMotionConfig>
    </>
  );
}
