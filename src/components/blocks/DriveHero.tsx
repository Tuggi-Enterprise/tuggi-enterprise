"use client";

import { useTranslations } from "next-intl";
import { Apple, Play } from "lucide-react";
import { DriveHeroAnimator } from "./DriveHeroAnimator";
import { sendGAEvent } from "@next/third-parties/google";

export function DriveHero() {
  const t = useTranslations("Drive.Hero");

  return (
    <section className="bg-tuggi-bg pt-32 pb-24 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-tuggi-dark tracking-tight mb-8 leading-tight">
              {t("title")}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed font-medium">
              {t("subtitle")}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => sendGAEvent({ event: 'click_download', value: 'app_store' })}
                className="flex items-center justify-center gap-3 bg-tuggi-dark text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg"
              >
                <Apple className="w-6 h-6" />
                <span className="flex flex-col items-start leading-none">
                   <span className="text-[10px] text-slate-300 uppercase tracking-widest">{t("downloadApp").split(" ")[0]}</span>
                  <span className="text-lg">App Store</span>
                </span>
              </button>
              
              <button 
                onClick={() => sendGAEvent({ event: 'click_download', value: 'google_play' })}
                className="flex items-center justify-center gap-3 bg-white text-tuggi-dark border border-gray-200 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-lg"
              >
                <Play className="w-6 h-6" />
                <span className="flex flex-col items-start leading-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t("downloadPlay").split(" ")[0]}</span>
                  <span className="text-lg">Google Play</span>
                </span>
              </button>
            </div>
          </div>

          {/* Phone Mockup with Live Animation */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-[320px] h-[640px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden">
              <DriveHeroAnimator />
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
