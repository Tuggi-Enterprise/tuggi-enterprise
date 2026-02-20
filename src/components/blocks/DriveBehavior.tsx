"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Languages, Lock, Navigation, Play } from "lucide-react";

export function DriveBehavior() {
  const t = useTranslations("Drive.Behavior");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 bg-white border-y border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Steps List */}
          <div className="flex flex-col space-y-6">
            
            {/* Step 1 */}
            <div 
              className={`p-6 rounded-2xl border transition-all duration-300 ${activeStep === 0 ? "bg-tuggi-bg border-tuggi-primary/30 shadow-md" : "bg-white border-gray-100 opacity-60"}`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep === 0 ? "bg-tuggi-primary text-white" : "bg-gray-100 text-slate-400"}`}>
                  <Languages className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-tuggi-dark">{t("step1Title")}</h3>
              </div>
              <p className="text-slate-600 pl-14 leading-relaxed">{t("step1Desc")}</p>
            </div>

            {/* Step 2 */}
            <div 
              className={`p-6 rounded-2xl border transition-all duration-300 ${activeStep === 1 ? "bg-tuggi-bg border-tuggi-primary/30 shadow-md" : "bg-white border-gray-100 opacity-60"}`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep === 1 ? "bg-tuggi-dark text-white" : "bg-gray-100 text-slate-400"}`}>
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-tuggi-dark">{t("step2Title")}</h3>
              </div>
              <p className="text-slate-600 pl-14 leading-relaxed">{t("step2Desc")}</p>
            </div>

            {/* Step 3 */}
            <div 
              className={`p-6 rounded-2xl border transition-all duration-300 ${activeStep === 2 ? "bg-tuggi-bg border-tuggi-primary/30 shadow-md" : "bg-white border-gray-100 opacity-60"}`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep === 2 ? "bg-emerald-500 text-white" : "bg-gray-100 text-slate-400"}`}>
                  <Navigation className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-tuggi-dark">{t("step3Title")}</h3>
              </div>
              <p className="text-slate-600 pl-14 leading-relaxed">{t("step3Desc")}</p>
            </div>

          </div>

          {/* Visual Simulator */}
          <div className="relative bg-slate-100 rounded-3xl overflow-hidden h-96 shadow-inner border border-gray-200">
            
            {/* Visual State 1: Languages */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${activeStep === 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <div className="grid grid-cols-2 gap-4">
                 {['English', 'Español', 'Português', 'Français'].map(lang => (
                   <div key={lang} className="bg-white px-6 py-3 rounded-lg shadow-sm font-semibold text-tuggi-dark border border-gray-200">{lang}</div>
                 ))}
              </div>
            </div>

            {/* Visual State 2: Lock */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${activeStep === 1 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
               <Lock className="w-20 h-20 text-slate-300 mb-6" />
               <div className="text-lg font-bold text-slate-400">Screen Locked</div>
            </div>

            {/* Visual State 3: Drive */}
            <div className={`absolute inset-0 bg-[#E5E9E2] transition-opacity duration-500 ${activeStep === 2 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <div className="w-full h-full relative">
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Road */}
                  <path d="M 50 400 Q 200 200 400 50" fill="none" stroke="#CBD1BE" strokeWidth="30" strokeLinecap="round" />
                  {/* Geofence */}
                  <circle cx="250" cy="180" r="80" fill="rgba(0, 168, 232, 0.15)" stroke="#00A8E8" strokeWidth="2" strokeDasharray="4 4"/>
                </svg>
                
                {/* Car traversing */}
                <div className="absolute top-[180px] left-[250px] transform -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-tuggi-dark rounded-md border-2 border-white shadow-md animate-[spin_10s_linear_infinite]" style={{ animationDirection: 'reverse' }}></div>
                
                {/* Audio Trigger bubble */}
                <div className="absolute top-[80px] left-[280px] bg-white p-3 rounded-xl shadow-lg border border-tuggi-primary flex items-center gap-3 animate-pulse">
                   <div className="w-6 h-6 bg-tuggi-primary rounded-full flex items-center justify-center">
                     <Play className="w-3 h-3 text-white ml-0.5" />
                   </div>
                   <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden">
                     <div className="bg-tuggi-primary h-full w-1/2"></div>
                   </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
