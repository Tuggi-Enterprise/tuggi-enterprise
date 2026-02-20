import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0B1220] mb-6 text-center max-w-prose">
        {t("welcome")}
      </h1>
      <p className="text-lg leading-relaxed text-[#5B6472] mb-12 max-w-3xl text-center">
        {t("title")}
      </p>
      
      {/* Interactive Simulator Placeholder */}
      <article className="w-full max-w-3xl bg-white rounded-md shadow-sm border border-gray-200 flex flex-col items-center p-8">
        <div className="w-16 h-16 bg-[#F7F9FC] border border-gray-200 text-[#00A8E8] rounded-md flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0B1220] mb-4">Trigger Simulator</h2>
        <button className="px-6 py-3 bg-[#FF6F00] text-white font-semibold rounded-md hover:bg-opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6F00]">
          Simulate Audio Trigger
        </button>
      </article>
    </section>
  );
}
