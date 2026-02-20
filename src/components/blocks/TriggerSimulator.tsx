"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { MapPin, Volume2, Car, Navigation } from "lucide-react";

export function TriggerSimulator() {
  const t = useTranslations("Home.Simulator");
  const [progress, setProgress] = useState(0);
  const [isTriggered, setIsTriggered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setTimeout(() => setProgress(0), 4000); // Wait 4 seconds after triggering before repeating 
          return 100;
        }
        const next = Math.min(prev + 0.8, 100);
        if (next >= 75) {
          setIsTriggered(true);
        } else {
          setIsTriggered(false);
        }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full py-24 bg-tuggi-bg flex flex-col items-center border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-16 items-center">
        {/* Copy */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center space-x-2 text-tuggi-primary font-semibold tracking-wider text-sm uppercase">
            <Volume2 className="w-5 h-5" />
            <span>{t("tag")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg text-tuggi-slate leading-relaxed max-w-prose">
            {t("subtitle")}
          </p>
        </div>

        {/* Visualizer Interface */}
        <div className="flex-1 w-full bg-[#0B1220] rounded-md shadow-sm border border-gray-800 p-8 relative overflow-hidden h-[400px] flex items-center justify-center">
          {/* Faux Map Matrix Background */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(#5B6472 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }} />
          
          <div className="relative w-full max-w-md h-32 flex items-center">
            {/* Nav Route Line */}
            <div className="absolute left-0 right-0 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-tuggi-primary transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Geofence / Trigger Target Area */}
            <div className="absolute right-[25%] -translate-y-1/2 top-1/2 flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full border-2 border-tuggi-primary absolute -top-8 -left-8 ${isTriggered ? 'animate-ping opacity-50' : 'opacity-20'}`} />
              <div className="w-4 h-4 bg-tuggi-primary rounded-full relative z-10 shadow-[0_0_15px_rgba(0,168,232,0.8)]" />
              <MapPin className="text-tuggi-primary w-6 h-6 absolute -top-8 z-20" />
            </div>

            {/* Simulated Live Vehicle Marker */}
            <div 
              className="absolute -translate-y-1/2 top-1/2 transition-all duration-75 ease-linear flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20"
              style={{ left: `calc(${progress}% - 16px)` }}
            >
              <Navigation className="w-4 h-4 text-tuggi-dark" strokeWidth={3} />
            </div>
          </div>

          {/* Floating Context Payload Overlay */}
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-md border backdrop-blur-md transition-all duration-500 flex items-center space-x-3 ${isTriggered ? 'bg-tuggi-primary/20 border-tuggi-primary text-white' : 'bg-gray-800/80 border-gray-700 text-tuggi-slate'}`}>
            {isTriggered ? (
              <>
                <Volume2 className="w-5 h-5 text-tuggi-primary animate-pulse" />
                <span className="font-semibold text-sm whitespace-nowrap">{t("playing")}</span>
              </>
            ) : (
              <>
                <Car className="w-5 h-5 text-tuggi-slate" />
                <span className="font-semibold text-sm whitespace-nowrap">{t("approaching")}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
