import { getTranslations, setRequestLocale } from "next-intl/server";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Download" });
  
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    robots: {
        index: false,
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
