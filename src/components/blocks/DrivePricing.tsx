import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";

export function DrivePricing() {
  const t = useTranslations("Drive.Pricing");

  return (
    <section className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-600">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          
          {/* Column 1: Test Drive (Free Tier) */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col h-full hover:border-slate-300 transition-colors">
            <h3 className="text-2xl font-bold text-tuggi-dark mb-2">{t("freeTitle")}</h3>
            <p className="text-slate-500 mb-6 h-12">{t("freeDesc")}</p>
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-extrabold text-tuggi-dark tracking-tight">{t("freePrice")}</span>
            </div>
            
            <ul className="space-y-4 mb-10 text-slate-600 flex-1">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("freeFeat1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("freeFeat2")}</span>
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <XCircle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                <span>{t("freeLim1")}</span>
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <XCircle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                <span>{t("freeLim2")}</span>
              </li>
            </ul>

            <button className="w-full bg-white text-tuggi-primary font-semibold py-4 rounded-xl border-2 border-tuggi-primary hover:bg-tuggi-primary/5 transition-colors">
              {t("freeAction")}
            </button>
          </div>

          {/* Column 2: 7-Day Explorer Pass (The Highlighted Tier) */}
          <div className="bg-white rounded-3xl p-8 border-2 border-tuggi-primary shadow-xl flex flex-col h-full relative transform lg:scale-105 z-10">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-tuggi-primary text-white font-bold text-xs uppercase tracking-widest py-1.5 px-6 rounded-full shadow-md whitespace-nowrap">
              {t("mostPopular")}
            </div>
            
            <h3 className="text-2xl font-bold text-tuggi-dark mb-2">{t("pass1Title")}</h3>
            <p className="text-slate-500 mb-6 h-12">{t("pass1Desc")}</p>
            <div className="flex items-baseline mb-2">
              <span className="text-5xl font-extrabold text-tuggi-dark tracking-tight">{t("pass1Price")}</span>
            </div>
            <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 inline-block px-3 py-1 rounded-full mb-8 self-start uppercase tracking-wide">
              {t("pass1Renewal")}
            </p>
            
            <ul className="space-y-4 mb-10 text-slate-600 flex-1 font-medium">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat3")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat4")}</span>
              </li>
            </ul>

            <button className="w-full bg-tuggi-primary text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-colors shadow-lg">
              {t("pass1Action")}
            </button>
          </div>

          {/* Column 3: 30-Day Nomad Pass */}
          <div className="bg-tuggi-dark rounded-3xl p-8 border border-slate-800 shadow-md flex flex-col h-full">
            <h3 className="text-2xl font-bold text-white mb-2">{t("pass2Title")}</h3>
            <p className="text-slate-400 mb-6 h-12">{t("pass2Desc")}</p>
            <div className="flex items-baseline mb-2 text-white">
              <span className="text-4xl font-extrabold tracking-tight">{t("pass2Price")}</span>
            </div>
            <p className="text-xs font-semibold text-slate-300 bg-slate-800 inline-block px-3 py-1 rounded-full mb-8 self-start uppercase tracking-wide">
              {t("pass2Renewal")}
            </p>
            
            <ul className="space-y-4 mb-10 text-slate-300 flex-1">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{t("pass2Feat1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{t("pass2Feat2")}</span>
              </li>
            </ul>

            <button className="w-full bg-white text-tuggi-dark font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors">
              {t("pass2Action")}
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
