import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { HomeHero } from "@/components/blocks/HomeHero";
import { HomeHowItWorks } from "@/components/blocks/HomeHowItWorks";
import { HomeSceneBlock } from "@/components/blocks/HomeSceneBlock";
import { HomeFeatureShowcase } from "@/components/blocks/HomeFeatureShowcase";
import { HomeAudioSample } from "@/components/blocks/HomeAudioSample";
import { HomeBusinessSection } from "@/components/blocks/HomeBusinessSection";
import { HomeMotionConfig } from "@/components/blocks/HomeMotionConfig";
import { ProofBlock } from "@/components/blocks/ProofBlock";
import { CoverageDensityMap } from "@/components/blocks/CoverageDensityMap";
import { ProseSection } from "@/components/blocks/ProseSection";
import { FaqSection } from "@/components/blocks/FaqSection";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";
import { getCoverageData } from "@/lib/coverage";
import { getStateHubPaths } from "@/lib/routes";
import { PRODUCT_FACTS } from "@/lib/product-facts";

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
        "text": faq(`a${i}`, PRODUCT_FACTS),
      },
    })),
  };

  // Coverage on the home is the same block /coverage carries (component 4.3),
  // with the shorter of its two textual alternatives — see the `detail` prop.
  // No figure comes out of the snapshot: it feeds navigation only, which is
  // what BR-COMUNICACAO-002 item 5 allows while it is frozen (#207).
  const coverage = await getCoverageData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/*
        The order is the operator's, spec §6.1 (card #194). It reads as an
        argument rather than as a catalogue: what it is (1–2), why it matters
        (3), what it sounds like (4), what it does (5), that it is real (6–7),
        who else it is for (8), and only then the long text search comes for
        (9–10).

        Three moves are worth naming because reversing them silently would look
        like a tidy-up:

         - **The scene block (3) buys the samples (4).** They are a pair: the
           reason "Ouça o TUGGI na prática" came up from below the fold is that
           it now lands right after the paragraph that makes a visitor want to
           hear something.
         - **Proof (6) and coverage (7) come after the product, not before it.**
           Proof of scale answers a question the visitor only has once he wants
           the thing.
         - **"O que é o TUGGI" (9) went down.** It is the SEO body, and it was
           sitting in the position where the page converts.
      */}
      <HomeMotionConfig>
        <HomeHero />
        <HomeHowItWorks />
        <HomeSceneBlock />
        <HomeAudioSample />
        <HomeFeatureShowcase />
        <ProofBlock />
        <CoverageDensityMap
          states={coverage.states}
          tourHubs={getStateHubPaths(locale)}
          detail="countries"
        />
        <HomeBusinessSection />
        <ProseSection namespace="Home.Context" />
        <FaqSection namespace="Home.FAQ" count={HOME_FAQ_COUNT} />
      </HomeMotionConfig>
    </>
  );
}
