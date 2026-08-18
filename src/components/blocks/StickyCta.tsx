"use client";

import { useEffect, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { APP_STORE_URL, buildPlayStoreUrl } from "@/lib/app-meta";
import {
  useAttributionClickId,
  useAttributionClipboardWrite,
  usePlatform,
} from "@/lib/conversionHooks";

interface StickyCtaProps {
  /** Short line of copy, already translated. */
  text: string;
  /** Button label, already translated. */
  cta: string;
  /** Id of the element that must scroll out of view before the bar appears. */
  afterId: string;
  /** Id of the page's own final CTA — the bar hides while it is on screen. */
  untilId: string;
  /** GA `placement` value, so each page's bar is measurable on its own. */
  placement: string;
}

/**
 * Mobile-only sticky CTA. Appears after the hero scrolls out and hides again
 * while the page's final CTA is in view (so it never covers it). Fixed position
 * → no CLS. Device-appropriate store. Slides via transform; static under
 * reduced motion. Never shown on desktop, where a long page can keep its CTA in
 * a sticky column instead.
 */
export function StickyCta({ text, cta, afterId, untilId, placement }: StickyCtaProps) {
  const platform = usePlatform();
  const clickId = useAttributionClickId();
  const writeClipboardToken = useAttributionClipboardWrite();
  const [pastHero, setPastHero] = useState(false);
  const [finalInView, setFinalInView] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const watch = (id: string, set: (v: boolean) => void, invert: boolean) => {
      const el = document.getElementById(id);
      if (!el) return;
      const o = new IntersectionObserver(([e]) => set(invert ? !e.isIntersecting : e.isIntersecting), {
        threshold: 0,
      });
      o.observe(el);
      observers.push(o);
    };
    watch(afterId, setPastHero, true);
    watch(untilId, setFinalInView, false);
    return () => observers.forEach((o) => o.disconnect());
  }, [afterId, untilId]);

  const visible = pastHero && !finalInView;
  const store = platform === "android" ? "play_store" : "app_store";
  // The Android leg carries the first touch in the Play referrer (BR-B2B-002);
  // iOS has no referrer channel, so this bar writes the same token to the
  // pasteboard inside the tap (contract §5). It used to rely on the partner
  // page having written it, which credited nobody for a visitor who scanned a
  // QR and left from any other page of the site.
  const href = platform === "android" ? buildPlayStoreUrl(clickId) : APP_STORE_URL;

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 motion-reduce:transition-none ${
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-tuggi-dark/95 backdrop-blur px-4 py-3 shadow-2xl ring-1 ring-white/10">
        <span className="flex-1 text-sm font-semibold leading-snug text-white">{text}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={visible ? undefined : -1}
          onClick={() => {
            if (href === APP_STORE_URL) void writeClipboardToken();
            sendGAEvent({ event: "click_store", placement, store });
          }}
          className="shrink-0 rounded-xl bg-tuggi-primary text-tuggi-dark font-bold px-5 py-2.5 text-sm transition-transform active:scale-95 motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {cta}
        </a>
      </div>
    </div>
  );
}
