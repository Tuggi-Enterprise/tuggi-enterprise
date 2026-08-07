"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { PhoneFrame } from "./PhoneFrame";
import { PRODUCT_FACTS } from "@/lib/product-facts";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

/**
 * The product blocks of the home — spec §6.3, card #194.
 *
 * They were six identical rows, screenshot on one side and copy on the other,
 * alternating sides. The repetition breaks the reading at about the fourth, so
 * they are now **five blocks in four visual units**:
 *
 *  - **`feat1` left the page.** The hero now serves that same screenshot
 *    (`poi-story.jpg`, spec §6.4), where the name of the place, "Ouvir a
 *    história" and "Ler transcrição" are all already visible — keeping the block
 *    meant printing one screenshot twice within two screens of scroll, which
 *    reads as a mounting error. The half of its copy that is not in the hero,
 *    the synchronized caption, is said twice more on the same page, in
 *    `Home.Context.p2` and `Home.FAQ.a5`. Its `Home.Showcase.feat1*` keys went
 *    with it: an orphan message key is code with no caller (CLAUDE.md §6).
 *  - **The passport went last**, which is the answer to "down or out". It closes
 *    well, handing over to the proof block below it — "your trip becomes a
 *    history" → what the archive is — and it opens badly: to a visitor who has
 *    not installed anything, a passport is value that only exists after a lot of
 *    use.
 *  - **`feat3` and `feat4` became a pair of cards**, side by side in one row.
 *    They are siblings in meaning (content beyond the tourist point: events and
 *    ready-made routes), they sit exactly where the reading collapses, and they
 *    are the two most dispensable — cards say "this is a bonus" without deleting
 *    them.
 *
 * The sides are declared, not derived from the index: with a pair in the middle
 * the parity of a loop stops matching what the eye sees, and the promise is that
 * no two phone-and-text rows in a row put the phone on the same side.
 */
type Row = {
  kind: "row";
  n: number;
  images: readonly { src: string; altKey: string }[];
  imageSide: "left" | "right";
};

type Pair = {
  kind: "pair";
  items: readonly { n: number; src: string; altKey: string }[];
};

const BLOCKS: readonly (Row | Pair)[] = [
  {
    kind: "row",
    n: 2,
    images: [{ src: "/images/app/explore-nearby.jpg", altKey: "feat2Alt" }],
    imageSide: "right",
  },
  {
    kind: "pair",
    items: [
      { n: 3, src: "/images/app/event-detail.jpg", altKey: "feat3Alt" },
      { n: 4, src: "/images/app/trail-detail.jpg", altKey: "feat4Alt" },
    ],
  },
  {
    kind: "row",
    n: 6,
    images: [
      { src: "/images/app/tools.jpg", altKey: "feat6AltTools" },
      { src: "/images/app/languages.jpg", altKey: "feat6AltLanguages" },
    ],
    imageSide: "left",
  },
  {
    kind: "row",
    n: 5,
    images: [{ src: "/images/app/passport.jpg", altKey: "feat5Alt" }],
    imageSide: "right",
  },
];

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

// Transform only, on purpose: the resting state is the no-JS state (#191).
// The copy slides on the y axis, not the x it used to: a resting x offset is
// 24px of horizontal overflow on a 390px screen, and the phone below it
// already rises.
const copyVariants = {
  hidden: { y: 16 },
  show: { y: 0, transition: { duration: 0.5, delay: 0.1, ease: EASE } },
};
const phoneVariants = {
  hidden: { y: 16 },
  show: { y: 0, transition: { duration: 0.5, ease: EASE } },
};

function FeatureRow({ block }: { block: Row }) {
  const t = useTranslations("Home.Showcase");
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yParallax = useTransform(scrollYProgress, [0, 1], [20, -20]);
  const parallaxOn = isDesktop && !reduce;

  const imageLeft = block.imageSide === "left";

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      {/* Copy — rises into place */}
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
          {t(`feat${block.n}Title`)}
        </h3>
        <p className="text-lg text-tuggi-slate leading-relaxed">
          {t(`feat${block.n}Body`, PRODUCT_FACTS)}
        </p>
      </motion.div>

      {/* Phone(s) — scroll parallax (desktop) wrapping a rise reveal */}
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
          {block.images.length === 1 ? (
            <PhoneFrame src={block.images[0].src} alt={t(block.images[0].altKey)} />
          ) : (
            <div className="flex justify-center gap-4 sm:gap-6">
              <PhoneFrame
                src={block.images[0].src}
                alt={t(block.images[0].altKey)}
                className="w-1/2 max-w-[200px]"
                sizes="(max-width: 640px) 42vw, 200px"
              />
              <PhoneFrame
                src={block.images[1].src}
                alt={t(block.images[1].altKey)}
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

/**
 * The two blocks that stop being rows. One row, two columns from `md` up, one
 * column below it; `items-stretch` so the two cards end at the same height
 * whichever language is longest. No border and no card surface: the screenshot
 * already frames itself, and a box around a box is the "layout error" reading
 * the spec asks these two to avoid.
 */
function FeaturePair({ block }: { block: Pair }) {
  const t = useTranslations("Home.Showcase");

  return (
    <motion.div
      variants={copyVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-stretch"
    >
      {block.items.map((item) => (
        <div key={item.n} className="flex flex-col text-center">
          <PhoneFrame
            src={item.src}
            alt={t(item.altKey)}
            className="max-w-[200px]"
            sizes="(max-width: 768px) 55vw, 200px"
          />
          <h3 className="mt-8 text-2xl font-bold text-tuggi-dark tracking-tight mb-3 leading-snug">
            {t(`feat${item.n}Title`)}
          </h3>
          <p className="text-lg text-tuggi-slate leading-relaxed max-w-md mx-auto">
            {t(`feat${item.n}Body`, PRODUCT_FACTS)}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

export function HomeFeatureShowcase() {
  return (
    <section className="bg-tuggi-bg py-20 lg:py-28">
      <div className="page-shell flex flex-col gap-20 lg:gap-28">
        {BLOCKS.map((block) =>
          block.kind === "row" ? (
            <FeatureRow key={`row-${block.n}`} block={block} />
          ) : (
            <FeaturePair key="pair" block={block} />
          ),
        )}
      </div>
    </section>
  );
}
