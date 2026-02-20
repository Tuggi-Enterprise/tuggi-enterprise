import { useTranslations } from "next-intl";
import { Apple, Play, Compass } from "lucide-react";

export function DriveConversion() {
  const t = useTranslations("Drive.Conversion");

  return (
    <section className="bg-tuggi-primary py-24 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <Compass className="w-16 h-16 text-white mx-auto mb-8 animate-pulse" />
        
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-12">
          {t("title")}
        </h2>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
          <button className="w-full sm:w-auto flex items-center justify-center gap-3 bg-tuggi-dark text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-900 transition-colors shadow-xl">
            <Apple className="w-6 h-6" />
            <span className="flex flex-col items-start leading-none">
              <span className="text-[10px] text-slate-300 uppercase tracking-widest">{t("downloadApp").split(" ")[0]}</span>
              <span className="text-lg">App Store</span>
            </span>
          </button>
          
          <button className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-tuggi-dark px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-xl">
            <Play className="w-6 h-6" />
            <span className="flex flex-col items-start leading-none">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t("downloadPlay").split(" ")[0]}</span>
              <span className="text-lg">Google Play</span>
            </span>
          </button>
        </div>

      </div>
    </section>
  );
}
