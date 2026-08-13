"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Languages as LanguagesIcon } from "lucide-react";
import type { Surface } from "./surface";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
/** Transform only, on purpose: the resting state is the no-JS state (#191). */
const item = {
  hidden: { y: 10 },
  show: { y: 0, transition: { duration: 0.35, ease: EASE } },
};

/**
 * Colours per surface — `DS-COR-004`. On dark the body is `slate-300` and not
 * `--color-tuggi-slate`, which measures 3.13:1 against `--color-tuggi-dark` and
 * fails SC 1.4.3; the pills keep their light fill and dark ink, so the one
 * thing a visitor scans stays at the contrast it was measured at.
 */
const SURFACE = {
  light: {
    section: "bg-white border-t border-gray-100",
    title: "text-tuggi-dark",
    body: "text-tuggi-slate",
  },
  dark: {
    section: "bg-tuggi-dark",
    title: "text-white",
    body: "text-slate-300",
  },
} as const satisfies Record<Surface, Record<string, string>>;

/**
 * Audio-languages showcase: a scannable strip of the supported languages so a
 * visitor can spot their own. Names are localized to the page language (a PT
 * reader sees "Mandarim", not "中文"). Text pills, not flag emoji — Windows
 * doesn't render regional-indicator flags. Reusable across pages.
 *
 * **Why it has a surface at all**, since the two callers ask for different
 * ones: `CoverageDensityMap` renders *two* sections — the dark map and the
 * white list that is its served alternative — so on the `/partners` hub this
 * block follows a white section, and two white neighbours read as one block
 * (spec §2 of `docs/design/spec-lp-parcerias-2026-08.md`, criterion 10).
 * `/drive` keeps the default and does not change.
 */
export function LanguagesStrip({ surface = "light" }: { surface?: Surface }) {
  const t = useTranslations("Languages");
  const languages = t.raw("langs") as string[];
  const skin = SURFACE[surface];

  return (
    <section className={`py-16 lg:py-20 ${skin.section}`} data-block="languages-strip">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-tuggi-primary/10 text-tuggi-primary flex items-center justify-center">
          <LanguagesIcon className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-3 ${skin.title}`}>
          {t("title")}
        </h2>
        <p className={`mb-10 max-w-2xl mx-auto leading-relaxed ${skin.body}`}>{t("subtitle")}</p>

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
