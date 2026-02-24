"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

export const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const t = useTranslations("CookieBanner");

  useEffect(() => {
    const consent = localStorage.getItem("tuggi_cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
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
                className="px-8 py-2.5 bg-tuggi-primary text-white rounded-full text-sm font-bold hover:bg-tuggi-primary/90 transition-all shadow-lg shadow-tuggi-primary/20"
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
