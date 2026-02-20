import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("cityOsTitle"),
    description: t("cityOsDescription"),
  };
}

export default async function CityOSPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Enterprise" });

  return (
    <main className="min-h-screen py-20 lg:py-24 bg-white text-[#0B1220]">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          {t("cityOsTitle")}: Territorial Governance & Hands-Free Audio
        </h1>
        <p className="text-lg leading-relaxed text-[#5B6472] max-w-prose">
          Empowering governments with white-label audio solutions for smart cities. Provide contextual tourism information through a 100% hands-free audio experience, ensuring drivers remain focused on the road to avoid traffic violations and reduce municipal legal liabilities.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article className="bg-[#F7F9FC] p-8 rounded-md shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-[#00A8E8]">Smart Cities</h3>
            <p className="text-[#5B6472] leading-relaxed">Context-aware public information broadcast securely via audio guides, strictly operating without screen interaction.</p>
          </article>
          <article className="bg-[#F7F9FC] p-8 rounded-md shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-[#00A8E8]">White Label</h3>
            <p className="text-[#5B6472] leading-relaxed">Brand it as your city&apos;s official application with customized triggers and municipal dashboards.</p>
          </article>
          <article className="bg-[#F7F9FC] p-8 rounded-md shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-[#00A8E8]">Accessibility</h3>
            <p className="text-[#5B6472] leading-relaxed">Includes Closed Captions (text) capabilities, built EXCLUSIVELY for passengers with hearing impairments.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
