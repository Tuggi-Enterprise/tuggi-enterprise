import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("driveTitle"),
    description: t("driveDescription"),
  };
}

export default async function DrivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Drive" });

  return (
    <article className="min-h-screen bg-[#F7F9FC] py-20 lg:py-24 flex flex-col items-center">
      <div className="max-w-3xl w-full px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0B1220] mb-8">
          {t("title")}
        </h1>
        <p className="text-lg leading-relaxed text-[#5B6472] mb-12 max-w-prose mx-auto">
          Experience the definitive audio guide, keeping your eyes on the road and your hands on the wheel. Fully 100% hands-free for drivers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#"
            className="px-8 py-3 bg-[#FF6F00] text-white rounded-md font-semibold border border-transparent hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#FF6F00] focus:ring-offset-2"
          >
            Download App
          </a>
        </div>
      </div>
    </article>
  );
}
