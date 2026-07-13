"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { PhoneFrame } from "./PhoneFrame";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

/**
 * Alternating feature rows: real app screenshot in a phone frame + copy.
 * On scroll each row reveals directionally (copy from its own side, phone
 * fades + rises) and the phone gets a gentle scroll parallax on desktop.
 * Copy comes first in the DOM (mobile reads headline → body → screenshot);
 * desktop swaps sides with `lg:order-*`.
 */
const FEATURES = [
  { n: 1, images: [{ src: "/images/app/poi-story.jpg", altKey: "feat1Alt" }] },
  { n: 2, images: [{ src: "/images/app/explore-nearby.jpg", altKey: "feat2Alt" }] },
  { n: 3, images: [{ src: "/images/app/event-detail.jpg", altKey: "feat3Alt" }] },
  { n: 4, images: [{ src: "/images/app/trail-detail.jpg", altKey: "feat4Alt" }] },
  { n: 5, images: [{ src: "/images/app/passport.jpg", altKey: "feat5Alt" }] },
  {
    n: 6,
    images: [
      { src: "/images/app/tools.jpg", altKey: "feat6AltTools" },
      { src: "/images/app/languages.jpg", altKey: "feat6AltLanguages" },
    ],
  },
] as const;

type Feature = (typeof FEATURES)[number];

/** md+ breakpoint via matchMedia (not a scroll listener); parallax is desktop-only. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function FeatureRow({ feature, idx }: { feature: Feature; idx: number }) {
  const t = useTranslations("Home.Showcase");
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yParallax = useTransform(scrollYProgress, [0, 1], [20, -20]);
  const parallaxOn = isDesktop && !reduce;

  const imageLeft = idx % 2 === 1; // first row: image on the right

  const copyVariants = {
    hidden: { opacity: 0, x: imageLeft ? 24 : -24 },
    show: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.1, ease: EASE } },
  };
  const phoneVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      {/* Copy — slides in from its own side */}
      <motion.div
        variants={copyVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className={`max-w-xl mx-auto lg:mx-0 text-center lg:text-left ${
          imageLeft ? "lg:order-2" : "lg:order-1"
        }`}
      >
        <h3 className="text-2xl sm:text-3xl font-bold text-tuggi-dark tracking-tight mb-4 leading-snug">
          {t(`feat${feature.n}Title`)}
        </h3>
        <p className="text-lg text-tuggi-slate leading-relaxed">{t(`feat${feature.n}Body`)}</p>
      </motion.div>

      {/* Phone(s) — scroll parallax (desktop) wrapping a fade+rise reveal */}
      <motion.div
        style={parallaxOn ? { y: yParallax } : undefined}
        className={imageLeft ? "lg:order-1" : "lg:order-2"}
      >
        <motion.div
          variants={phoneVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {feature.images.length === 1 ? (
            <PhoneFrame src={feature.images[0].src} alt={t(feature.images[0].altKey)} />
          ) : (
            <div className="flex justify-center gap-4 sm:gap-6">
              <PhoneFrame
                src={feature.images[0].src}
                alt={t(feature.images[0].altKey)}
                className="w-1/2 max-w-[200px]"
                sizes="(max-width: 640px) 42vw, 200px"
              />
              <PhoneFrame
                src={feature.images[1].src}
                alt={t(feature.images[1].altKey)}
                className="w-1/2 max-w-[200px] mt-10"
                sizes="(max-width: 640px) 42vw, 200px"
              />
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export function HomeFeatureShowcase() {
  return (
    <section className="bg-tuggi-bg py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-20 lg:gap-28">
        {FEATURES.map((f, idx) => (
          <FeatureRow key={f.n} feature={f} idx={idx} />
        ))}
      </div>
    </section>
  );
}
