import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("purposeTitle"),
    description: t("purposeDescription"),
  };
}

export default async function PurposePage() {
  return (
    <main className="py-20 lg:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#0B1220] tracking-tight">The Audio Thesis</h1>
        <p className="text-lg text-[#5B6472] max-w-3xl leading-relaxed">
          We believe audio is the ultimate contextual interface. It overlays the digital realm onto the physical world seamlessly without distracting you from the present. Driving our core belief that 100% hands-free operations mitigate liabilities and focus attention where it belongs.
        </p>
      </section>
    </main>
  );
}
