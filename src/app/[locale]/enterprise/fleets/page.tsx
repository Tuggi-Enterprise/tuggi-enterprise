import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("fleetsTitle"),
    description: t("fleetsDescription"),
  };
}

export default async function FleetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Enterprise" });

  return (
    <main className="min-h-screen py-20 lg:py-24 bg-[#F7F9FC] text-[#0B1220]">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[#0B1220]">
          {t("fleetsTitle")}
        </h1>
        <p className="text-lg leading-relaxed text-[#5B6472] mb-10 max-w-prose">
          Ancillary revenue channel for car rental companies. Turn your fleet into a network of smart, location-aware travel companions through a 100% hands-free system ensuring driver safety.
        </p>
      </section>
    </main>
  );
}
