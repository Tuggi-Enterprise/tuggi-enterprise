import { getTranslations, setRequestLocale } from "next-intl/server";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { getPartnerById } from "@/lib/partner";

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
    },
  };
}

export default async function DownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ID?: string; p?: string; partner_id?: string }>;
}) {
  const { locale } = await params;
  const { ID, p, partner_id } = await searchParams;
  const partnerId = ID || p || partner_id;

  setRequestLocale(locale);

  const partnerData = partnerId ? await getPartnerById(partnerId, locale) : null;

  return (
    <main>
      <PartnerHeroWrapper partnerData={partnerData} partnerId={partnerId} />
    </main>
  );
}
