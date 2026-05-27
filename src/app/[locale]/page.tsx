import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { HeroSection } from "@/components/blocks/HeroSection";
import { InteractiveSimulator } from "@/components/blocks/InteractiveSimulator";
import { EnterpriseFork } from "@/components/blocks/EnterpriseFork";
import { FaqSection } from "@/components/blocks/FaqSection";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

const HOME_FAQ_COUNT = 6;

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
      <HeroSection />
      <InteractiveSimulator />
      <EnterpriseFork />
      <FaqSection namespace="Home.FAQ" count={HOME_FAQ_COUNT} />
    </>
  );
}
