import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("securityTitle"),
    description: t("securityDescription"),
  };
}

export default async function SecuritySLAPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-4 text-[#0B1220]">Security SLA</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-[#5B6472] mb-8 border-b border-gray-200 pb-4">Service Level Agreements and Data Controls</p>
      <div className="space-y-6 text-[#5B6472] leading-relaxed max-w-prose">
        <p>This document governs the operational threshold of the TUGGI dashboard, guaranteeing maximum integrity against downtime.</p>
        <p>Our PostgreSQL cluster runs strictly with active read replicas and instant point-in-time recovery protocols, preserving an undisputed SLA of 99.99%.</p>
      </div>
    </>
  );
}
