import { useTranslations } from "next-intl";
import { ShieldAlert, Server } from "lucide-react";

export function TechData() {
  const t = useTranslations("Technology.Data");

  return (
    <section className="py-24 bg-tuggi-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          
          {/* Column 1: Anonymization */}
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
            <div className="w-12 h-12 bg-tuggi-primary/10 rounded-xl flex items-center justify-center mb-6">
              <ShieldAlert className="w-6 h-6 text-tuggi-primary" />
            </div>
            <h3 className="text-2xl font-bold text-tuggi-dark tracking-tight mb-4">
              {t("col1Title")}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {t("col1Desc")}
            </p>
          </div>

          {/* Column 2: Serverless Scale */}
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
            <div className="w-12 h-12 bg-tuggi-primary/10 rounded-xl flex items-center justify-center mb-6">
              <Server className="w-6 h-6 text-tuggi-primary" />
            </div>
            <h3 className="text-2xl font-bold text-tuggi-dark tracking-tight mb-4">
              {t("col2Title")}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {t("col2Desc")}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
