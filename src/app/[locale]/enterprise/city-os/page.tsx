import { CityOSHero } from "@/components/blocks/CityOSHero";
import { CityOSRegulatory } from "@/components/blocks/CityOSRegulatory";
import { CityOSSustainability } from "@/components/blocks/CityOSSustainability";
import { CityOSAccessibility } from "@/components/blocks/CityOSAccessibility";
import { CityOSIntelligence } from "@/components/blocks/CityOSIntelligence";
import { CityOSMandate } from "@/components/blocks/CityOSMandate";

import { getTranslations } from "next-intl/server";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SEO_CITY_OS" });

  const title = t("title");
  const description = t("description");
  const ogTitle = t("ogTitle");
  
  // Construct proper canonical
  const baseUrlPath = locale === "en" ? "/enterprise/city-os" : `/${locale}/enterprise/city-os`;
  const url = `https://tuggi.app${baseUrlPath}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en": "https://tuggi.app/enterprise/city-os",
        "es": "https://tuggi.app/es/enterprise/city-os",
        "pt-BR": "https://tuggi.app/pt-br/enterprise/city-os",
        "pt-PT": "https://tuggi.app/pt-pt/enterprise/city-os",
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
      siteName: "TUGGI City OS",
      type: "website",
      images: [
        {
          url: "/images/og-image-city-os.jpg",
          width: 1200,
          height: 630,
          alt: "TUGGI City OS - Infraestrutura para Destinos Turísticos Inteligentes",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/images/og-image-city-os.jpg"],
    },
  };
}

export default async function CityOSPage() {
  return (
    <article className="min-h-screen">
      <CityOSHero />
      <CityOSRegulatory />
      <CityOSSustainability />
      <CityOSAccessibility />
      <CityOSIntelligence />
      <CityOSMandate />
    </article>
  );
}
