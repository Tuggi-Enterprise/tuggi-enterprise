"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Languages as LanguagesIcon } from "lucide-react";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

/**
 * Audio-languages showcase: a scannable strip of the supported languages so a
 * visitor can spot their own. Names are localized to the page language (a PT
 * reader sees "Mandarim", not "中文"). Text pills, not flag emoji — Windows
 * doesn't render regional-indicator flags. Reusable across pages.
 */
export function LanguagesStrip() {
  const t = useTranslations("Languages");
  const languages = t.raw("langs") as string[];

  return (
    <section className="bg-white py-16 lg:py-20 border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-tuggi-primary/10 text-tuggi-primary flex items-center justify-center">
          <LanguagesIcon className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-tuggi-dark tracking-tight mb-3">
          {t("title")}
        </h2>
        <p className="text-tuggi-slate mb-10 max-w-2xl mx-auto leading-relaxed">{t("subtitle")}</p>

        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {languages.map((lang) => (
            <motion.li
              key={lang}
              variants={item}
              className="rounded-full border border-gray-200 bg-tuggi-bg px-4 py-2 text-sm font-semibold text-tuggi-dark"
            >
              {lang}
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
