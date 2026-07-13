"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Download, Compass, Volume2 } from "lucide-react";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};
const badge = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
};

/**
 * "How it works" — three steps that stagger in on scroll, each number badge
 * scaling in with it. On desktop a thin SVG line draws left→right (pathLength)
 * to connect the steps. Client because it animates; under reduced motion the
 * steps just fade (MotionConfig) and the connector renders already-drawn.
 */
export function HomeHowItWorks() {
  const t = useTranslations("Home.HowItWorks");
  const reduce = useReducedMotion();

  const steps = [
    { icon: Download, text: t("step1") },
    { icon: Compass, text: t("step2") },
    { icon: Volume2, text: t("step3") },
  ];

  return (
    <section className="bg-white py-20 lg:py-24 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight text-center mb-14">
          {t("title")}
        </h2>

        <div className="relative">
          {/* Connector between the three icons (desktop only). Spans from the
              first icon's centre (~16.6%) to the last's, sitting behind them. */}
          <svg
            aria-hidden="true"
            className="hidden md:block absolute left-[16.6%] right-[16.6%] top-7 h-2 w-auto overflow-visible text-tuggi-primary/30"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
          >
            {reduce ? (
              <line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <motion.line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
              />
            )}
          </svg>

          <motion.ol
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
          >
            {steps.map((step, i) => (
              <motion.li
                key={i}
                variants={item}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-tuggi-bg text-tuggi-primary flex items-center justify-center">
                    <step.icon className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <motion.span
                    variants={badge}
                    className="absolute z-20 -top-2 -right-2 w-7 h-7 rounded-full bg-tuggi-primary text-white text-sm font-bold flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </motion.span>
                </div>
                <p className="text-lg text-tuggi-slate leading-relaxed max-w-xs">{step.text}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
