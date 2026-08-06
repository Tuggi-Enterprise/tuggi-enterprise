import { useTranslations } from "next-intl";
import { Banknote, QrCode } from "lucide-react";

export function FleetsFinancial() {
  const t = useTranslations("Fleets.Financial");

  return (
    <section className="w-full py-24 bg-tuggi-bg px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Two columns, not three: the revenue-per-vehicle card was removed
            with its copy (BR-B2B-007) and no replacement was written. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

          {/* Column 1: Minimal CAPEX */}
          <article className="bg-[#0B1220] p-10 border border-gray-800 rounded-md shadow-lg flex flex-col items-start gap-4 ring-1 ring-tuggi-primary/30">
            <div className="bg-tuggi-primary/20 p-4 rounded-md">
              <Banknote className="w-8 h-8 text-tuggi-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mt-2">
              {t("col1Title")}
            </h3>
            <p className="text-gray-400 leading-relaxed text-base">
              {t("col1Desc")}
            </p>
          </article>

          {/* Column 2: Instant Scalability */}
          <article className="bg-white p-10 border border-gray-200 rounded-md shadow-sm flex flex-col items-start gap-4 hover:border-tuggi-primary transition-colors">
            <div className="bg-blue-50 p-4 rounded-md">
              <QrCode className="w-8 h-8 text-tuggi-primary" />
            </div>
            <h3 className="text-xl font-bold text-tuggi-dark mt-2">
              {t("col2Title")}
            </h3>
            <p className="text-tuggi-slate leading-relaxed text-base">
              {t("col2Desc")}
            </p>
          </article>

        </div>
      </div>
    </section>
  );
}
