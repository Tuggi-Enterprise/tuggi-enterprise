import { useTranslations } from "next-intl";
import { WifiOff, AlertTriangle, Globe, Captions } from "lucide-react";

export function DriveFeatures() {
  const t = useTranslations("Drive.Features");

  return (
    <section className="py-24 bg-tuggi-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
              <WifiOff className="w-7 h-7 text-tuggi-dark" />
            </div>
            <h3 className="text-2xl font-bold text-tuggi-dark mb-4">{t("feat1Title")}</h3>
            <p className="text-slate-600 leading-relaxed">{t("feat1Desc")}</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-tuggi-dark mb-4">{t("feat2Title")}</h3>
            <p className="text-slate-600 leading-relaxed">{t("feat2Desc")}</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-tuggi-primary/10 rounded-xl flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-tuggi-primary" />
            </div>
            <h3 className="text-2xl font-bold text-tuggi-dark mb-4">{t("feat3Title")}</h3>
            <p className="text-slate-600 leading-relaxed">{t("feat3Desc")}</p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mb-6">
              <Captions className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-tuggi-dark mb-4">{t("feat4Title")}</h3>
            <p className="text-slate-600 leading-relaxed">{t("feat4Desc")}</p>
          </div>

        </div>

      </div>
    </section>
  );
}
