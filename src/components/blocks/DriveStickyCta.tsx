"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { usePlatform } from "@/lib/conversionHooks";

/**
 * Mobile-only sticky CTA. Appears after the hero scrolls out and hides again
 * while the final CTA is in view (so it never covers the footer CTAs). Fixed
 * position → no CLS. Device-appropriate store. Slides via transform; static
 * under reduced motion. Never shown on desktop.
 */
export function DriveStickyCta() {
  const t = useTranslations("Drive.Sticky");
  const platform = usePlatform();
  const [pastHero, setPastHero] = useState(false);
  const [finalInView, setFinalInView] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("drive-hero");
    const finalCta = document.getElementById("drive-final-cta");
    const observers: IntersectionObserver[] = [];
    if (hero) {
      const o = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { threshold: 0 });
      o.observe(hero);
      observers.push(o);
    }
    if (finalCta) {
      const o = new IntersectionObserver(([e]) => setFinalInView(e.isIntersecting), { threshold: 0 });
      o.observe(finalCta);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const visible = pastHero && !finalInView;
  const store = platform === "android" ? "play_store" : "app_store";
  const href = platform === "android" ? PLAY_STORE_URL : APP_STORE_URL;

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 motion-reduce:transition-none ${
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-tuggi-dark/95 backdrop-blur px-4 py-3 shadow-2xl ring-1 ring-white/10">
        <span className="flex-1 text-sm font-semibold leading-snug text-white">{t("text")}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={visible ? undefined : -1}
          onClick={() => sendGAEvent({ event: "click_store", placement: "sticky", store })}
          className="shrink-0 rounded-xl bg-tuggi-primary text-tuggi-dark font-bold px-5 py-2.5 text-sm transition-transform active:scale-95 motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {t("cta")}
        </a>
      </div>
    </div>
  );
}
