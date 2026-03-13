import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-8">
          
          {/* Column 1: 7-Day Pass */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-all hover:shadow-md">
            <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("pass1Title")}</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">{t("pass1Desc")}</p>
            
            <div className="flex flex-col mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-tuggi-dark tracking-tight">{t("pass1Price")}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-sm font-semibold text-tuggi-primary-text bg-tuggi-primary/10 px-2 py-0.5 rounded-md">
                  {t("pass1PerDay")} / {t("perDay")}
                </span>
              </div>
            </div>
            
            <p className="text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wide">
              {t("pass1Renewal")}
            </p>
            
            <ul className="space-y-4 mb-10 text-slate-600 flex-1 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat3")}</span>
              </li>
            </ul>

            <button className="w-full bg-white text-tuggi-primary-text font-bold py-4 rounded-xl border-2 border-tuggi-primary hover:bg-tuggi-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary/50">
              {t("pass1Action")}
            </button>
          </div>

          {/* Column 2: 30-Day Pass (Most Popular) */}
          <div className="bg-white rounded-3xl p-8 border-2 border-tuggi-primary shadow-xl flex flex-col relative transform lg:scale-105 z-10 transition-all hover:shadow-2xl">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-tuggi-primary text-white font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
              {t("mostPopular")}
            </div>
            
            <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("pass2Title")}</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">{t("pass2Desc")}</p>
            
            <div className="flex flex-col mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-tuggi-dark tracking-tight">{t("pass2Price")}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-sm font-semibold text-tuggi-primary-text bg-tuggi-primary/10 px-2 py-0.5 rounded-md">
                  {t("pass2PerDay")} / {t("perDay")}
                </span>
              </div>
            </div>
            
            <p className="text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wide">
              {t("pass2Renewal")}
            </p>
            
            <ul className="space-y-4 mb-10 text-slate-600 flex-1 text-sm font-medium">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" />
                <span>{t("pass2Feat1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" />
                <span>{t("pass2Feat2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t("pass1Feat3")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t("pass1Feat4")}</span>
              </li>
            </ul>

            <button className="w-full bg-tuggi-primary text-white font-bold py-4 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-primary">
              {t("pass2Action")}
            </button>
          </div>

          {/* Column 3: Annual Pass (Best Value meta) */}
          <div className="bg-tuggi-dark rounded-3xl p-8 border border-slate-800 shadow-md flex flex-col relative transition-all hover:bg-slate-900">
             <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
              {t("bestValue")}
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{t("pass3Title")}</h3>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">{t("pass3Desc")}</p>
            
            <div className="flex flex-col mb-8 text-white">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">{t("pass3Price")}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  {t("pass3PerDay")} / {t("perDay")}
                </span>
              </div>
            </div>
            
            <p className="text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wide">
              {t("pass3Renewal")}
            </p>
            
            <ul className="space-y-4 mb-10 text-slate-300 flex-1 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("pass3Feat1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("pass3Feat2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat1")}</span>
              </li>
            </ul>

            <button className="w-full bg-white text-tuggi-dark font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark">
              {t("pass3Action")}
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
