import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { HeroSection } from "@/components/blocks/HeroSection";
import { InteractiveSimulator } from "@/components/blocks/InteractiveSimulator";
import { EnterpriseFork } from "@/components/blocks/EnterpriseFork";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("homeTitle");
  const description = t("homeDescription");
  const url = `https://tuggi.app/${locale === "en" ? "" : locale}`;

  return {
    title,
    description,
    metadataBase: new URL("https://tuggi.app"),
    alternates: {
      canonical: url,
      languages: {
        "en": "/en",
        "es": "/es",
        "pt-BR": "/pt-br",
        "pt-PT": "/pt-pt",
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "TUGGI",
      type: "website",
      images: [
        {
          url: "/images/og-image-tuggi.jpg",
          width: 1200,
          height: 630,
          alt: "TUGGI - The Cultural Copilot for Drivers",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/og-image-tuggi.jpg"],
    },
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
