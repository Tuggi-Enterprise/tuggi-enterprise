"use client";

import { useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Store } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { formatPrice, type CountryPricing, type PassKey } from "@/lib/pricing";
import { usePlatform, useGeoPricing, type Platform } from "@/lib/conversionHooks";
import { PRODUCT_FACTS } from "@/lib/product-facts";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};
const CARD_LIFT =
  "transition-[transform,box-shadow] duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0";

const LIGHT_CARD =
  "w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 hover:shadow-md " +
  CARD_LIFT;
const SPOTLIGHT_CARD =
  "w-full bg-white rounded-3xl p-8 border-2 border-tuggi-primary shadow-xl flex flex-col relative lg:scale-105 hover:shadow-2xl " +
  CARD_LIFT;
const PRIMARY_OUTLINE =
  "w-full text-center bg-white text-tuggi-primary-text font-bold py-4 rounded-xl border-2 border-tuggi-primary hover:bg-tuggi-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text";
const PRIMARY_FILLED =
  "w-full text-center bg-tuggi-primary text-tuggi-dark font-bold py-4 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-primary";
const SECONDARY_LIGHT =
  "block w-full text-center bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300";

type PassId = "free" | "7d" | "30d";

/** Price with reserved height so nothing shifts while geo resolves (skeleton "—").
 *  `free` renders 0 in the detected currency (needs the currency, so still waits). */
function PriceSlot({
  pricing,
  locale,
  passKey,
  free,
  periodLabel,
}: {
  pricing: CountryPricing | null;
  locale: string;
  passKey?: PassKey;
  free?: boolean;
  periodLabel?: string;
}) {
  const amount = free ? 0 : passKey ? pricing?.prices[passKey] : undefined;
  const price =
    pricing != null && amount != null ? formatPrice(amount, pricing.currency, locale) : null;
  return (
    <div className="min-h-[3rem] mb-6 flex flex-wrap items-baseline gap-x-1.5" aria-live="polite">
      {price ? (
        <>
          <span className="text-3xl font-extrabold text-tuggi-dark">{price}</span>
          {periodLabel ? <span className="text-sm text-slate-500">{periodLabel}</span> : null}
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

/** One primary CTA (device-appropriate store); Google Play secondary on desktop
 *  only, in a reserved slot so mobile ↔ desktop never shifts height. */
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

        {/* Risk-reversal chips (hero keeps its own copy) */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-14 text-sm font-semibold text-tuggi-slate">
          {[t("chip1"), t("chip2"), t("chip3")].map((chip) => (
            <span key={chip} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              {chip}
            </span>
          ))}
        </div>

        {/* Cards: Free · 7-Day (spotlight) · 30-Day */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          onViewportEnter={onPricingInView}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch"
        >

          {/* ── Free ── */}
          <motion.div variants={item} className="flex">
            <div className={LIGHT_CARD}>
              <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("freeTitle")}</h3>
              <PriceSlot pricing={pricing} locale={locale} free />
              <ul className="space-y-4 mb-8 text-slate-600 flex-1 text-sm">
                {["free1", "free2", "free3"].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t(k, PRODUCT_FACTS)}</span>
                  </li>
                ))}
              </ul>
              <PassCta
                platform={platform}
                pass="free"
                actionLabel={t("freeAction")}
                primaryClass={PRIMARY_OUTLINE}
                secondaryClass={SECONDARY_LIGHT}
              />
            </div>
          </motion.div>

          {/* ── 7-Day Pass (Spotlight) ── */}
          <motion.div variants={item} className="flex relative z-10">
            <div className={SPOTLIGHT_CARD}>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-tuggi-primary text-tuggi-dark font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
                {t("mostPopular")}
              </div>
              <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("pass1Title")}</h3>
              <PriceSlot pricing={pricing} locale={locale} passKey="d7" periodLabel={t("periodOnce")} />
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">{t("pass1Desc")}</p>
              <ul className="space-y-4 mb-8 text-slate-600 flex-1 text-sm font-medium">
                {["pass1Feat1", "pass1Feat2", "pass1Feat3"].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-tuggi-primary-text flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t(k, PRODUCT_FACTS)}</span>
                  </li>
                ))}
              </ul>
              <PassCta
                platform={platform}
                pass="7d"
                actionLabel={t("pass1Action")}
                primaryClass={PRIMARY_FILLED}
                secondaryClass={SECONDARY_LIGHT}
              />
            </div>
          </motion.div>

          {/* ── 30-Day Pass ── */}
          <motion.div variants={item} className="flex">
            <div className={LIGHT_CARD}>
              <h3 className="text-xl font-bold text-tuggi-dark mb-2">{t("pass2Title")}</h3>
              <PriceSlot pricing={pricing} locale={locale} passKey="d30" periodLabel={t("periodOnce")} />
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">{t("pass2Desc")}</p>
              <ul className="space-y-4 mb-8 text-slate-600 flex-1 text-sm">
                {["pass2Feat1", "pass2Feat2", "pass2Feat3"].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t(k, PRODUCT_FACTS)}</span>
                  </li>
                ))}
              </ul>
              <PassCta
                platform={platform}
                pass="30d"
                actionLabel={t("pass2Action")}
                primaryClass={PRIMARY_OUTLINE}
                secondaryClass={SECONDARY_LIGHT}
              />
            </div>
          </motion.div>

        </motion.div>

        {/* Quiet annual pointer (no link, no button) */}
        <p className="text-center text-sm text-tuggi-slate mt-8">{t("annualNote")}</p>

        {/* Store note — price source of truth */}
        <p className="text-center text-tuggi-slate text-sm mt-4 flex items-center justify-center gap-1.5">
          <Store className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {t("storeNote")}
        </p>

      </div>
    </section>
  );
}
