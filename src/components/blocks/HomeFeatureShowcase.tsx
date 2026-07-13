"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { PhoneFrame } from "./PhoneFrame";

/**
 * Alternating feature rows: real app screenshot in a phone frame + copy.
 * Subtle scroll-in animation via framer-motion, disabled when the visitor
 * prefers reduced motion. Copy comes first in the DOM (so mobile reads
 * headline → body → screenshot); desktop swaps sides with `lg:order-*`.
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

export function HomeFeatureShowcase() {
  const t = useTranslations("Home.Showcase");
  const reduceMotion = useReducedMotion();

  const variants = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <section className="bg-tuggi-bg py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-20 lg:gap-28">
        {FEATURES.map((f, idx) => {
          const imageLeft = idx % 2 === 1; // first row: image on the right

          return (
            <motion.div
              key={f.n}
              variants={variants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
              className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
            >
              {/* Copy */}
              <div
                className={`max-w-xl mx-auto lg:mx-0 text-center lg:text-left ${
                  imageLeft ? "lg:order-2" : "lg:order-1"
                }`}
              >
                <h3 className="text-2xl sm:text-3xl font-bold text-tuggi-dark tracking-tight mb-4 leading-snug">
                  {t(`feat${f.n}Title`)}
                </h3>
                <p className="text-lg text-tuggi-slate leading-relaxed">{t(`feat${f.n}Body`)}</p>
              </div>

              {/* Phone(s) */}
              <div className={imageLeft ? "lg:order-1" : "lg:order-2"}>
                {f.images.length === 1 ? (
                  <PhoneFrame src={f.images[0].src} alt={t(f.images[0].altKey)} />
                ) : (
                  <div className="flex justify-center gap-4 sm:gap-6">
                    <PhoneFrame
                      src={f.images[0].src}
                      alt={t(f.images[0].altKey)}
                      className="w-1/2 max-w-[200px]"
                      sizes="(max-width: 640px) 42vw, 200px"
                    />
                    <PhoneFrame
                      src={f.images[1].src}
                      alt={t(f.images[1].altKey)}
                      className="w-1/2 max-w-[200px] mt-10"
                      sizes="(max-width: 640px) 42vw, 200px"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
