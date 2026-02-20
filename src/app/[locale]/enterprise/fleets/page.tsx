import { FleetsHero } from "@/components/blocks/FleetsHero";
import { FleetsFinancial } from "@/components/blocks/FleetsFinancial";
import { FleetsRisk } from "@/components/blocks/FleetsRisk";
import { FleetsNPS } from "@/components/blocks/FleetsNPS";
import { FleetsBrand } from "@/components/blocks/FleetsBrand";
import { FleetsESG } from "@/components/blocks/FleetsESG";

import { getTranslations } from "next-intl/server";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SEO_FLEETS" });

  const title = t("title");
  const description = t("description");
  const ogTitle = t("ogTitle");

  // Construct proper canonical URL
  const baseUrlPath = locale === "en" ? "/enterprise/fleets" : `/${locale}/enterprise/fleets`;
  const url = `https://tuggi.app${baseUrlPath}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en": "https://tuggi.app/enterprise/fleets",
        "es": "https://tuggi.app/es/enterprise/fleets",
        "pt-BR": "https://tuggi.app/pt-br/enterprise/fleets",
        "pt-PT": "https://tuggi.app/pt-pt/enterprise/fleets",
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: "TUGGI Enterprise",
      type: "website",
      images: [
        {
          url: "/images/og-image-fleets.jpg",
          width: 1200,
          height: 630,
          alt: "TUGGI Frotas - Aumente seu RevPA e NPS",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/images/og-image-fleets.jpg"],
    },
  };
}

export default async function FleetsPage() {
  return (
    <article className="min-h-screen">
      <FleetsHero />
      <FleetsFinancial />
      <FleetsRisk />
      <FleetsNPS />
      <FleetsBrand />
      <FleetsESG />
    </article>
  );
}
