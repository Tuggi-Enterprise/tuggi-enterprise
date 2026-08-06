import { useTranslations } from "next-intl";

export function FleetsNPS() {
  const t = useTranslations("Fleets.NPS");

  return (
    <section className="w-full py-24 bg-[#0B1220] px-4 sm:px-6 lg:px-8 border-b border-gray-800 flex flex-col items-center justify-center text-center relative overflow-hidden">

      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-tuggi-primary/20 rounded-full blur-3xl pointer-events-none mix-blend-screen opacity-50"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-tuggi-secondary/10 rounded-full blur-3xl pointer-events-none mix-blend-screen opacity-50"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10 flex flex-col items-center">

        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          {t("title")}
        </h2>

        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl leading-relaxed font-medium">
          {t("desc")}
        </p>

      </div>
    </section>
  );
}
