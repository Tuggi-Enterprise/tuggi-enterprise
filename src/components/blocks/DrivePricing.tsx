"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Store } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { usePlatform, type Platform } from "@/lib/conversionHooks";
import { PRODUCT_FACTS } from "@/lib/product-facts";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
/** Transform only, on purpose: the resting state is the no-JS state (#191). */
const item = {
  hidden: { y: 20 },
  show: { y: 0, transition: { duration: 0.45, ease: EASE } },
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

/** The GA dimension of `click_pass_cta`, and the catalogue of BR-MONETIZACAO-048.
 *  It reads `10h`/`25h`/`45h` and no longer `7d`/`30d`: the product is another
 *  one, and a funnel that kept the old names would compare hours against days. */
type PassId = "free" | "10h" | "25h" | "45h";

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

/**
 * One pass: the hour count is the big element, the usage caption sits under it.
 *
 * **No price, and no slot reserving room for one** — BR-MONETIZACAO-048's three
 * Consumables do not exist in either store yet (#297), so publishing a number
 * here would name a price nobody can be charged. Nothing on the card is
 * asynchronous any more, which is what retires the `—` skeleton and the
 * `/api/geo` request the section used to make on load. When #297 lands, the
 * price returns *below* the caption: the hour count stays the big element,
 * because it is what tells the three cards apart.
 *
 * Title and caption read as one line ("10 horas · um bate e volta"), which is
 * why the caption is lowercase and unpunctuated — BR-MONETIZACAO-048: a title
 * without its usage caption is a product the tourist cannot size.
 */
function PassCard({
  platform,
  pass,
  title,
  caption,
  actionLabel,
  spotlight,
  badge,
}: {
  platform: Platform;
  pass: PassId;
  title: string;
  caption: string;
  actionLabel: string;
  spotlight?: boolean;
  badge?: string;
}) {
  return (
    <div className={spotlight ? SPOTLIGHT_CARD : LIGHT_CARD}>
      {badge ? (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-tuggi-primary text-tuggi-dark font-bold text-[10px] uppercase tracking-widest py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap">
          {badge}
        </div>
      ) : null}
      <h3 className="text-3xl font-extrabold text-tuggi-dark">{title}</h3>
      <p className="mt-1 mb-8 text-sm text-slate-500 flex-1">{caption}</p>
      <PassCta
        platform={platform}
        pass={pass}
        actionLabel={actionLabel}
        primaryClass={spotlight ? PRIMARY_FILLED : PRIMARY_OUTLINE}
        secondaryClass={SECONDARY_LIGHT}
      />
    </div>
  );
}

export function DrivePricing() {
  const t = useTranslations("Drive.Pricing");
  const platform = usePlatform();
  const viewedRef = useRef(false);

  const onPricingInView = () => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    sendGAEvent({ event: "view_pricing" });
  };

  // `data-section` and not a copy locator: the guard in
  // tests/e2e/hour-catalogue.spec.ts measures this section's geometry in four
  // languages, and anchoring it on the headline would make the assertion move
  // with every translation — the mistake routing.spec.ts already pays for.
  return (
    <section data-section="drive-pricing" className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header + price anchor.
            The promise is the `h2` and the section name is the eyebrow, not the
            other way round: what converts is the sentence, so it is the largest
            element and the heading of the section. One `h2` per section (WCAG
            2.2 SC 1.3.1) — the eyebrow is a `p`, never a heading. Nothing here
            clamps, truncates or fixes a height: the headline grows downward,
            which is what keeps it whole down to 320 px (SC 1.4.10). */}
        <div className="text-center mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-tuggi-primary-text mb-3">
            {t("kicker")}
          </p>
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

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          onViewportEnter={onPricingInView}
        >
          {/* The three passes — BR-MONETIZACAO-048, in catalogue order.
              Three columns and not four: a fourth would narrow the column that
              converts and cancel the spotlight's `lg:scale-105`. `Explorar` is
              the wide card below, so on a phone the visitor no longer meets a
              free card as the first thing under a headline about not spending.
              DOM order is visual order at both widths — no `order-*` reversing
              keyboard and screen-reader reading. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

            <motion.div variants={item} className="flex">
              <PassCard
                platform={platform}
                pass="10h"
                title={t("pass1Title")}
                caption={t("pass1Desc")}
                actionLabel={t("pass1Action")}
              />
            </motion.div>

            {/* `recommended`, not "most popular": the three Consumables have
                never been sold, so popularity is a claim with no data behind
                it. An editorial recommendation is true by construction. */}
            <motion.div variants={item} className="flex relative z-10">
              <PassCard
                platform={platform}
                pass="25h"
                title={t("pass2Title")}
                caption={t("pass2Desc")}
                actionLabel={t("pass2Action")}
                spotlight
                badge={t("recommended")}
              />
            </motion.div>

            <motion.div variants={item} className="flex">
              <PassCard
                platform={platform}
                pass="45h"
                title={t("pass3Title")}
                caption={t("pass3Desc")}
                actionLabel={t("pass3Action")}
              />
            </motion.div>

          </div>

          {/* Said once, under the three cards, instead of nine repeated bullets
              — BR-MONETIZACAO-061 (single purchase) and 052 (hours from
              different passes add up, with no cap). */}
          <p className="text-center text-sm text-tuggi-slate mt-8">{t("passesNote")}</p>

          {/* ── Explorar — the free tier, wide, below the passes ── */}
          <motion.div variants={item} className="mt-8">
            <div className={LIGHT_CARD}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-xl font-bold text-tuggi-dark">{t("freeTitle")}</h3>
                <span className="text-xl font-extrabold text-tuggi-dark">{t("freePrice")}</span>
              </div>
              <ul className="mt-6 mb-8 grid gap-4 md:grid-cols-3 text-slate-600 text-sm">
                {["free1", "free2", "free3"].map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t(k, PRODUCT_FACTS)}</span>
                  </li>
                ))}
              </ul>
              <div className="md:max-w-xs">
                <PassCta
                  platform={platform}
                  pass="free"
                  actionLabel={t("freeAction")}
                  primaryClass={PRIMARY_OUTLINE}
                  secondaryClass={SECONDARY_LIGHT}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Store note — now the only place the page speaks about price at all */}
        <p className="text-center text-tuggi-slate text-sm mt-8 flex items-center justify-center gap-1.5">
          <Store className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {t("storeNote")}
        </p>

      </div>
    </section>
  );
}
