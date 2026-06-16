import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { getPartnerById } from "@/lib/partner";
import { resolveWelcomeLang } from "@/lib/ptDialect";

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
  searchParams: Promise<{ ID?: string; p?: string; partner_id?: string; lang?: string }>;
}) {
  const { locale } = await params;
  const { ID, p, partner_id, lang } = await searchParams;
  const partnerId = ID || p || partner_id;

  setRequestLocale(locale);

  // Resolve the welcome dialect (pt-br vs pt-pt) from geo/?lang, decoupled from
  // the unified "pt" UI locale (see src/lib/ptDialect.ts).
  const [h, c] = await Promise.all([headers(), cookies()]);
  const dbLang = resolveWelcomeLang(locale, {
    langParam: lang,
    country: h.get("x-vercel-ip-country"),
    acceptLanguage: h.get("accept-language"),
    cookie: c.get("NEXT_LOCALE")?.value,
  });

  const partnerData = partnerId ? await getPartnerById(partnerId, dbLang) : null;

  return (
    <main>
      <PartnerHeroWrapper partnerData={partnerData} partnerId={partnerId} />
    </main>
  );
}
