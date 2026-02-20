import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("techTitle"),
    description: t("techDescription"),
  };
}

export default async function TechnologyPage() {
  return (
    <main className="py-20 lg:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#0B1220] tracking-tight">Technology</h1>
        <p className="text-lg text-[#5B6472] max-w-prose leading-relaxed">
          Built with robust Swift Architecture, Advanced Client-side Caching, and Geofenced Triggers to ensure offline-capability and 100% hands-free operations.
        </p>
      </section>
    </main>
  );
}
