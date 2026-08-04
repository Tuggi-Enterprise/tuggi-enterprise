"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

/**
 * How much room the consent banner is taking at the bottom of the viewport,
 * published on <html> as a CSS length ("0px" when the banner is not showing).
 *
 * This banner is legally required and sits above everything (z-[100]), so any
 * other bottom-fixed element has to stack on top of it instead of being covered
 * — a covered element is unclickable, which cost us the download CTA on the
 * /d/<slug> QR landing page. Consumers read this variable as their `bottom`
 * offset; they must not keep their own copy of the consent state, and they must
 * not assume a fixed height (the copy wraps to 2 or 3 lines depending on the
 * locale, and the iOS safe-area inset is part of the measurement).
 */
export const COOKIE_BANNER_HEIGHT_VAR = "--cookie-banner-height";

export const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("CookieBanner");

  useEffect(() => {
    const consent = localStorage.getItem("tuggi_cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  // Publish the banner's real height while it is up, and clear it as soon as
  // the visitor accepts or declines. offsetHeight (not getBoundingClientRect)
  // on purpose: the entrance/exit animation is a transform, and a transformed
  // box would report a height the layout below does not actually need.
  useEffect(() => {
    const root = document.documentElement;
    const reset = () => root.style.setProperty(COOKIE_BANNER_HEIGHT_VAR, "0px");

    const banner = bannerRef.current;
    if (!showBanner || !banner) {
      reset();
      return;
    }

    const publish = () =>
      root.style.setProperty(COOKIE_BANNER_HEIGHT_VAR, `${banner.offsetHeight}px`);

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(banner);

    return () => {
      observer.disconnect();
      reset();
    };
  }, [showBanner]);

  const handleAccept = () => {
    localStorage.setItem("tuggi_cookie_consent", "true");
    document.cookie = "tuggi_cookie_consent=true; path=/; max-age=31536000";
    setShowBanner(false);
    // Reload to fire GA if needed, or we can use a state to render GA in the layout
    window.location.reload();
  };

  const handleDecline = () => {
    localStorage.setItem("tuggi_cookie_consent", "false");
    document.cookie = "tuggi_cookie_consent=false; path=/; max-age=31536000";
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          ref={bannerRef}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          // Bottom padding is spelled out per side (instead of `p-4 md:p-6`) so
          // it can carry the iOS home-indicator inset. Because the height above
          // is measured rather than assumed, whatever stacks on top of the
          // banner clears the home indicator too.
          className="fixed bottom-0 left-0 right-0 z-[100] px-4 pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] md:px-6 md:pt-6 md:pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]"
        >
          <div className="max-w-7xl mx-auto bg-tuggi-dark text-white p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
            <p className="text-sm md:text-base text-slate-300 max-w-3xl text-center md:text-left leading-relaxed">
              {t("text")}
            </p>
            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={handleDecline}
                className="px-6 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {t("decline")}
              </button>
              <button
                onClick={handleAccept}
                className="px-8 py-2.5 bg-tuggi-primary text-tuggi-dark rounded-full text-sm font-bold hover:bg-tuggi-primary/90 transition-all shadow-lg shadow-tuggi-primary/20"
              >
                {t("accept")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
