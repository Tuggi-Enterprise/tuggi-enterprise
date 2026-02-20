import { useTranslations } from "next-intl";
import { Apple, Play } from "lucide-react";

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
              <button className="flex items-center justify-center gap-3 bg-tuggi-dark text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg">
                <Apple className="w-6 h-6" />
                <span className="flex flex-col items-start leading-none">
                  <span className="text-[10px] text-slate-300 uppercase tracking-widest">{t("downloadApp").split(" ")[0]}</span>
                  <span className="text-lg">App Store</span>
                </span>
              </button>
              
              <button className="flex items-center justify-center gap-3 bg-white text-tuggi-dark border border-gray-200 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-lg">
                <Play className="w-6 h-6" />
                <span className="flex flex-col items-start leading-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t("downloadPlay").split(" ")[0]}</span>
                  <span className="text-lg">Google Play</span>
                </span>
              </button>
            </div>
          </div>

          {/* Abstract Visual Simulation */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="w-[320px] h-[640px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              
              {/* Fake Waze Map UI in background */}
              <div className="absolute inset-0 bg-[#E5E9E2]">
                <div className="absolute top-[20%] left-[-20%] w-[150%] h-[150%] border-[20px] border-[#CBD1BE] rounded-full opacity-50"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500 border-4 border-white shadow-lg"></div>
              </div>

              {/* Status Bar */}
              <div className="h-8 w-full bg-slate-900/10 backdrop-blur-md absolute top-0 flex items-center justify-center pointer-events-none">
                <div className="w-1/3 h-4 bg-black rounded-b-xl"></div>
              </div>

              {/* Foreground TUGGI Element (Notification) */}
              <div className="absolute top-16 left-4 right-4 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-gray-100 flex items-start gap-4 transform transition-transform animate-bounce-slow">
                <div className="w-10 h-10 bg-tuggi-dark rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-tuggi-primary font-bold text-xs">T.</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-tuggi-dark leading-tight">The Colosseum</h4>
                  <p className="text-xs text-slate-500 mt-1">Playing audio... (2:15)</p>
                  
                  {/* Fake Audio Waveform */}
                  <div className="flex gap-1 mt-3 items-end h-3">
                     <span className="w-1 h-3 bg-tuggi-primary rounded-full animate-pulse"></span>
                     <span className="w-1 h-1 bg-tuggi-primary rounded-full animate-pulse delay-75"></span>
                     <span className="w-1 h-2 bg-tuggi-primary rounded-full animate-pulse delay-150"></span>
                     <span className="w-1 h-3 bg-tuggi-primary rounded-full animate-pulse delay-200"></span>
                     <span className="w-1 h-1 bg-tuggi-primary rounded-full animate-pulse delay-300"></span>
                     <span className="w-1 h-2 bg-tuggi-primary rounded-full animate-pulse delay-[400ms]"></span>
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
