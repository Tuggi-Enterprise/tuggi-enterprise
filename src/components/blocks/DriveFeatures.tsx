"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { WifiOff, Globe, Accessibility as AccessibilityIcon } from "lucide-react";
import { PRODUCT_FACTS } from "@/lib/product-facts";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

/**
 * "Included in every pass" — three cards: offline, multilingual audio, and a
 * single merged accessibility card (captions for deaf/HoH + audio-first for low
 * vision). The old "Fines & Hazard Alerts" card was removed (feature doesn't
 * exist) and the two accessibility cards were merged into one.
 */
export function DriveFeatures() {
  const t = useTranslations("Drive.Features");
  const a = useTranslations("Drive.Accessibility");

  const cards = [
    { icon: WifiOff, title: t("feat1Title"), body: t("feat1Desc") },
    { icon: Globe, title: t("feat3Title"), body: t("feat3Desc", PRODUCT_FACTS) },
    { icon: AccessibilityIcon, title: a("title"), body: a("body") },
  ];

  return (
    <section className="py-24 bg-tuggi-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight">
            {t("title")}
          </h2>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {cards.map((card, i) => (
            <motion.div
              key={i}
              variants={item}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start transition-shadow hover:shadow-md"
            >
              <div className="w-14 h-14 bg-tuggi-primary/10 rounded-xl flex items-center justify-center mb-6">
                <card.icon className="w-7 h-7 text-tuggi-primary" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold text-tuggi-dark mb-4">{card.title}</h3>
              <p className="text-slate-600 leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
