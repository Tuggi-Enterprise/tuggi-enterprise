import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("deletionTitle"),
    description: t("deletionDescription"),
  };
}

export default async function DataDeletionPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-4 text-[#0B1220]">Data Deletion Protocol</h1>
      <p className="text-[#5B6472] mb-6 leading-relaxed max-w-prose">
        You hold absolute control over your telemetry and account records. Submit a request using the button below to purge your ID across all Tuggi shards and connected partner datasets.
      </p>
      <button className="mt-4 px-6 py-3 bg-[#FF6F00] text-white font-semibold rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#FF6F00] focus:ring-offset-2">
        Execute Deletion Request
      </button>
    </>
  );
}
