import { useTranslations } from "next-intl";
import { ShieldAlert, Volume2, Eye } from "lucide-react";

export function FleetsRisk() {
  const t = useTranslations("Fleets.Risk");

  return (
    <section className="w-full py-24 bg-blue-50 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        
        {/* Copy Focus */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-tuggi-primary/20 rounded-full text-tuggi-primary font-semibold text-sm shadow-sm">
            <ShieldAlert className="w-4 h-4" />
            Risk Management
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate max-w-prose mx-auto lg:mx-0">
            {t("desc")}
          </p>
        </div>

        {/* Safety Visual Concept UI */}
        <div className="flex-1 w-full bg-white rounded-md shadow-sm border border-gray-200 p-8 flex flex-col gap-8 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl"></div>

          <div className="space-y-6 relative z-10 w-full">
            {/* Screen Distraction Graphic */}
            <div className="w-full bg-red-50 border border-red-100 p-4 rounded-md flex items-center justify-between opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h4 className="font-bold text-red-800 text-sm">Visual Distraction</h4>
                  <p className="text-xs text-red-600">Screen-based Apps</p>
                </div>
              </div>
              <span className="bg-red-200 text-red-800 px-3 py-1 text-xs font-bold uppercase rounded-sm tracking-wider">High Risk</span>
            </div>

            <div className="flex w-full justify-center">
              <div className="h-8 w-px bg-gray-300"></div>
            </div>

            {/* Audio Safe Graphic */}
            <div className="w-full bg-green-50 border border-green-200 p-4 rounded-md flex items-center justify-between shadow-sm transform scale-105 z-10 relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                  <Volume2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-green-800 text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Eyes on the Road
                  </h4>
                  <p className="text-xs text-green-600 font-semibold">100% Hands-Free Engine</p>
                </div>
              </div>
              <span className="bg-green-600 text-white px-3 py-1 text-xs font-bold uppercase rounded-sm tracking-wider">Zero Risk</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
