"use client";

import { useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Store } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { formatPrice, type CountryPricing, type PassKey } from "@/lib/pricing";
import { usePlatform, useGeoPricing, type Platform } from "@/lib/conversionHooks";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};
const CARD_LIFT =
  "transition-[transform,box-shadow] duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0";

type PassId = "7d" | "30d" | "annual";

/** Price with reserved height so nothing shifts while geo resolves (skeleton "—"). */
function PriceSlot({
  pricing,
  locale,
  passKey,
  periodLabel,
  dark,
}: {
  pricing: CountryPricing | null;
  locale: string;
  passKey: PassKey;
  periodLabel: string;
  dark?: boolean;
}) {
  const price = pricing ? formatPrice(pricing.prices[passKey], pricing.currency, locale) : null;
  return (
    <div className="min-h-[3rem] mb-6 flex flex-wrap items-baseline gap-x-1.5" aria-live="polite">
      {price ? (
        <>
          <span className={`text-3xl font-extrabold ${dark ? "text-white" : "text-tuggi-dark"}`}>
            {price}
          </span>
          <span className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {periodLabel}
          </span>
        </>
      ) : (
        <span
          className="text-3xl font-extrabold text-slate-300 animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        >
          —
        </span>
      )}
    </div>
  );
}

/** One primary CTA (device-appropriate store); the Google Play secondary shows
 *  on desktop only, in a reserved slot so mobile ↔ desktop never shifts height. */
function PassCta({
  platform,
  pass,
  actionLabel,
  primaryClass,
  secondaryClass,
}: {
  platform: Platform;
  pass: PassId;
  actionLabel: string;
  primaryClass: string;
  secondaryClass: string;
}) {
  const primaryStore = platform === "android" ? "play_store" : "app_store";
  const primaryHref = platform === "android" ? PLAY_STORE_URL : APP_STORE_URL;
  const fire = (store: "app_store" | "play_store") =>
    sendGAEvent({ event: "click_pass_cta", pass, store });

  return (
    <div className="flex flex-col gap-2 mt-2">
      <a
        href={primaryHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => fire(primaryStore)}
        className={primaryClass}
      >
        {actionLabel}
      </a>
      {/* Secondary slot: desktop shows Google Play; height reserved on mobile. */}
      <div className="min-h-[2.75rem]">
        {platform === "desktop" && (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => fire("play_store")}
            className={secondaryClass}
          >
            Google Play
          </a>
        )}
      </div>
    </div>
  );
}

export function DrivePricing() {
  const t = useTranslations("Drive.Pricing");
  const locale = useLocale();
  const pricing = useGeoPricing();
  const platform = usePlatform();
  const viewedRef = useRef(false);

  const onPricingInView = () => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    sendGAEvent({ event: "view_pricing" });
  };

  return (
    <section className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header + price anchor */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-600">{t("subtitle")}</p>
          <p className="mt-3 text-sm text-tuggi-slate max-w-xl mx-auto">{t("anchor")}</p>
        </div>

        {/* Risk-reversal chips (replaces the old green banner; hero keeps its copy) */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-14 text-sm font-semibold text-tuggi-slate">
          {[t("chip1"), t("chip2"), t("chip3")].map((chip) => (
            <span key={chip} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              {chip}
            </span>
          ))}
        </div>

        {/* 3 pass cards */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          onViewportEnter={onPricingInView}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch"
        >

          {/* ── Card 1: 7-Day Pass ── */}
          <motion.div variants={item} className="flex">
            <div className={`w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 hover:shadow-md ${CARD_LIFT}`}>
              <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("pass1Title")}</h3>
              <p className="text-slate-500 mb-4 text-sm leading-relaxed">{t("pass1Desc")}</p>
              <PriceSlot pricing={pricing} locale={locale} passKey="d7" periodLabel={t("periodOnce")} />
              <p className="text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wide">
                {t("pass1Renewal")}
              </p>
              <ul className="space-y-4 mb-8 text-slate-600 flex-1 text-sm">
                {["pass1Feat1", "pass1Feat2", "pass1Feat3"].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <PassCta
                platform={platform}
                pass="7d"
                actionLabel={t("pass1Action")}
                primaryClass="w-full text-center bg-white text-tuggi-primary-text font-bold py-4 rounded-xl border-2 border-tuggi-primary hover:bg-tuggi-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary/50"
                secondaryClass="block w-full text-center bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
            </div>
          </motion.div>

          {/* ── Card 2: 30-Day Pass (Most Popular) ── */}
          <motion.div variants={item} className="flex relative z-10">
            <div className={`w-full bg-white rounded-3xl p-8 border-2 border-tuggi-primary shadow-xl flex flex-col relative lg:scale-105 hover:shadow-2xl ${CARD_LIFT}`}>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-tuggi-primary text-white font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
                {t("mostPopular")}
              </div>
              <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("pass2Title")}</h3>
              <p className="text-slate-500 mb-4 text-sm leading-relaxed">{t("pass2Desc")}</p>
              <PriceSlot pricing={pricing} locale={locale} passKey="d30" periodLabel={t("periodOnce")} />
              <p className="text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wide">
                {t("pass2Renewal")}
              </p>
              <ul className="space-y-4 mb-8 text-slate-600 flex-1 text-sm font-medium">
                {["pass2Feat1", "pass2Feat2", "pass2Feat3"].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <PassCta
                platform={platform}
                pass="30d"
                actionLabel={t("pass2Action")}
                primaryClass="w-full text-center bg-tuggi-primary text-tuggi-dark font-bold py-4 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-primary"
                secondaryClass="block w-full text-center bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
            </div>
          </motion.div>

          {/* ── Card 3: Annual Pass (Best Value) ── */}
          <motion.div variants={item} className="flex">
            <div className={`w-full bg-tuggi-dark rounded-3xl p-8 border border-slate-800 shadow-md flex flex-col relative hover:bg-slate-900 ${CARD_LIFT}`}>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
                {t("bestValue")}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t("pass3Title")}</h3>
              <p className="text-slate-400 mb-4 text-sm leading-relaxed">{t("pass3Desc")}</p>
              <PriceSlot pricing={pricing} locale={locale} passKey="annual" periodLabel={t("periodYear")} dark />
              <p className="text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wide">
                {t("pass3Renewal")}
              </p>
              <ul className="space-y-4 mb-8 text-slate-300 flex-1 text-sm">
                {["pass3Feat1", "pass3Feat2", "pass3Feat3"].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <PassCta
                platform={platform}
                pass="annual"
                actionLabel={t("pass3Action")}
                primaryClass="w-full text-center bg-white text-tuggi-dark font-bold py-4 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark"
                secondaryClass="block w-full text-center bg-white/10 text-white font-semibold py-3 rounded-xl border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />
            </div>
          </motion.div>

        </motion.div>

        {/* Single store note — price source of truth */}
        <p className="text-center text-slate-400 text-sm mt-10 flex items-center justify-center gap-1.5">
          <Store className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {t("storeNote")}
        </p>

      </div>
    </section>
  );
}
