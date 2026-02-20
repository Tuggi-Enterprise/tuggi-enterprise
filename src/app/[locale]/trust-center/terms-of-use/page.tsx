import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("termsTitle"),
    description: t("termsDescription"),
  };
}

export default async function TermsOfUsePage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-4 text-[#0B1220]">Terms of Use</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-[#5B6472] mb-8 border-b border-gray-200 pb-4">Last updated: August 2026</p>
      <div className="space-y-6 text-[#5B6472] leading-relaxed max-w-prose">
        <p>1. Acceptance of Terms: By downloading and operating the TUGGI software, you agree to comply with these terms.</p>
        <p>2. Liability Limitations: Our geospatial audio engine serves informational purposes only. Do not navigate roads using this product. The platform guarantees 100% hands-free driver operations.</p>
        <p>3. Enterprise Licensing: B2G and B2B clients operate under tailored Master Service Agreements with rigid SLA constraints.</p>
      </div>
    </>
  );
}
