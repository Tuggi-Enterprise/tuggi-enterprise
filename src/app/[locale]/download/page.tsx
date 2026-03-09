import { setRequestLocale } from "next-intl/server";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "pt-br" ? "Baixar Tuggi - Seu Copiloto Cultural" : "Download Tuggi - Your Cultural Copilot",
    description: "Baixe o app Tuggi e descubra o mundo enquanto dirige.",
    robots: {
        index: false, // Don't index partner landing pages to avoid cluttering SEO
        follow: true,
    }
  };
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <PartnerHeroWrapper />
    </main>
  );
}
