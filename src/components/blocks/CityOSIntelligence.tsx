import { useTranslations } from "next-intl";

export function CityOSIntelligence() {
  const t = useTranslations("CityOS.Intelligence");

  return (
    <section className="w-full py-24 bg-tuggi-bg px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-16">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate">
            {t("desc")}
          </p>
        </div>

      </div>
    </section>
  );
}
