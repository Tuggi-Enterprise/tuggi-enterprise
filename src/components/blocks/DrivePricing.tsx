import { useTranslations } from "next-intl";
import { CheckCircle2, Gift, Store } from "lucide-react";

const APP_STORE_URL =
  "https://apps.apple.com/app/tuggi-drive/id6744379818";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.tuggidrive.app";

export function DrivePricing() {
  const t = useTranslations("Drive.Pricing");

  return (
    <section className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-600">{t("subtitle")}</p>
        </div>

        {/* Free lead — the strongest conversion hook, above the cards */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-5 text-center mb-14 max-w-2xl mx-auto">
          <Gift
            className="w-6 h-6 text-emerald-600 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-emerald-800 font-semibold text-base leading-snug">
            {t("freeLead")}
          </p>
        </div>

        {/* 3 pass cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

          {/* ── Card 1: 7-Day Pass ── */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-all hover:shadow-md">
            <h3 className="text-xl font-bold text-tuggi-dark mb-2">
              {t("pass1Title")}
            </h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              {t("pass1Desc")}
            </p>

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

            {/* Store CTAs */}
            <div className="flex flex-col gap-2">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-white text-tuggi-primary-text font-bold py-4 rounded-xl border-2 border-tuggi-primary hover:bg-tuggi-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary/50"
              >
                {t("pass1Action")}
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center text-slate-400 font-medium py-2 text-xs hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg"
              >
                Google Play →
              </a>
            </div>
          </div>

          {/* ── Card 2: 30-Day Pass (Most Popular) ── */}
          <div className="bg-white rounded-3xl p-8 border-2 border-tuggi-primary shadow-xl flex flex-col relative transform lg:scale-105 z-10 transition-all hover:shadow-2xl">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-tuggi-primary text-white font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
              {t("mostPopular")}
            </div>

            <h3 className="text-xl font-bold text-tuggi-dark mb-2">
              {t("pass2Title")}
            </h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              {t("pass2Desc")}
            </p>

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
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat3")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" />
                <span>{t("pass1Feat4")}</span>
              </li>
            </ul>

            <div className="flex flex-col gap-2">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-tuggi-primary text-tuggi-dark font-bold py-4 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-primary"
              >
                {t("pass2Action")}
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center text-slate-400 font-medium py-2 text-xs hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg"
              >
                Google Play →
              </a>
            </div>
          </div>

          {/* ── Card 3: Annual Pass (Best Value) ── */}
          <div className="bg-tuggi-dark rounded-3xl p-8 border border-slate-800 shadow-md flex flex-col relative transition-all hover:bg-slate-900">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
              {t("bestValue")}
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {t("pass3Title")}
            </h3>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              {t("pass3Desc")}
            </p>

            {/* Qualitative price line — only on annual, no hard currency */}
            <p className="text-emerald-400 font-semibold text-sm mb-8">
              {t("pass3PriceLine")}
            </p>

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

            <div className="flex flex-col gap-2">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-white text-tuggi-dark font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark"
              >
                {t("pass3Action")}
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center text-slate-500 font-medium py-2 text-xs hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-600 rounded-lg"
              >
                Google Play →
              </a>
            </div>
          </div>

        </div>

        {/* Single store note — price source of truth */}
        <p className="text-center text-slate-400 text-sm mt-10 flex items-center justify-center gap-1.5">
          <Store className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {t("storeNote")}
        </p>

      </div>
    </section>
  );
}
