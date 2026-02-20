import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  };
}

export default async function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-4 text-[#0B1220]">Privacy Policy</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-[#5B6472] mb-8 border-b border-gray-200 pb-4">Last updated: August 2026</p>
      <div className="space-y-6 text-[#5B6472] leading-relaxed max-w-prose">
        <p>We respect your privacy. TUGGI&apos;s proprietary geo-fence listeners run purely on-device (client-side) using background location. We explicitly avoid continuous location stream to servers, mathematically eliminating mass invasion risks.</p>
        <p>Server syncing occurs exclusively in interval batches strictly engineered to generate macroscopic metrics for the City OS dashboard.</p>
      </div>
    </>
  );
}
