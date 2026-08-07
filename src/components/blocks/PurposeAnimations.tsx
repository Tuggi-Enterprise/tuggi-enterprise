"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Decorative arc for /purpose.
 *
 * The two loops here run forever, start on their own and sit next to page
 * content — WCAG 2.1 SC 2.2.2 (level A) asks for a way to pause, stop or hide
 * that. This page is not under HomeMotionConfig, so the gate has to be local:
 * `useReducedMotion` reads prefers-reduced-motion and the animation resolves to
 * its finished state instead of looping. Same shape, no movement — which is
 * what globals.css already does for .tuggi-gps-ring and .tuggi-eq-bar.
 *
 * The svg is aria-hidden: it carries no information, only mood.
 */
export function FreedomAnimation() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="hidden lg:flex justify-end items-center h-full">
      <div className="w-80 h-80 relative flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full opacity-60" aria-hidden="true">
          <motion.path
            d="M 20,100 Q 50,20 100,100 T 180,100"
            fill="transparent"
            stroke="#00A8E8"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 4,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse",
                  }
            }
          />
          <motion.circle
            cx="100" cy="100" r="4"
            fill="#0B1220"
            initial={{ scale: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { delay: 2, duration: 2, repeat: Infinity, repeatType: "reverse" }
            }
          />
        </svg>
      </div>
    </div>
  );
}
