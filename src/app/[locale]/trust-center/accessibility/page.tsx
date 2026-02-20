import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("accessibilityTitle"),
    description: t("accessibilityDescription"),
  };
}

export default async function AccessibilityPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-4 text-[#0B1220]">Accessibility Statement</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-[#5B6472] mb-8 border-b border-gray-200 pb-4">WCAG 2.2 AA Compliance</p>
      <div className="space-y-6 text-[#5B6472] leading-relaxed max-w-prose">
        <p>TUGGI is structurally an audio-first interface perfectly suited for vision impairment. For graphical outputs, the interface natively complies with rigid contrast ratios above 4.5:1.</p>
        <p>We supply a secondary Closed Captions (text) feature. Note: This visual overlay feature exists EXCLUSIVELY for passengers with hearing impairments. The driver experience inherently remains 100% audio-driven and hands-free.</p>
      </div>
    </>
  );
}
