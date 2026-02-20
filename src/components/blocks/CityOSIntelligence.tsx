import { useTranslations } from "next-intl";
import { BarChart3, Globe2 } from "lucide-react";

export function CityOSIntelligence() {
  const t = useTranslations("CityOS.Intelligence");

  return (
    <section className="w-full py-24 bg-tuggi-bg px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-16">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate">
            {t("desc")}
          </p>
        </div>

        {/* UI Mockup - 3 column dashboard vibe */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Visuals: Heatmaps */}
          <div className="lg:col-span-8 bg-[#0B1220] rounded-md shadow-md border border-gray-800 p-8 relative overflow-hidden flex flex-col group hover:border-tuggi-primary transition-all duration-300">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-tuggi-secondary/10 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6 z-10">
              <div className="space-y-1">
                <h3 className="text-white text-xl font-bold tracking-tight flex items-center gap-2">
                  <BarChart3 className="text-tuggi-primary w-6 h-6" /> {t("heatmaps")}
                </h3>
                <p className="text-gray-400 text-sm font-medium">{t("heatmapsDesc")}</p>
              </div>
              <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-sm text-xs font-mono font-bold tracking-widest uppercase">Live View</span>
            </div>

            <div className="flex-1 w-full bg-[#131b2c] border border-gray-800 rounded-sm relative overflow-hidden min-h-[250px] p-6">
              {/* Pseudo chart lines */}
              <div className="flex h-full w-full items-end gap-2 justify-between px-2 pt-10">
                {[40, 60, 45, 80, 50, 95, 75, 60, 85, 55, 100, 70].map((height, i) => (
                  <div key={i} className="w-full bg-tuggi-primary/20 rounded-t-sm relative group-hover:bg-tuggi-primary/30 transition-colors" style={{ height: `${height}%` }}>
                    {height > 80 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-tuggi-secondary shadow-[0_0_10px_rgba(255,111,0,0.8)]"></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#131b2c] to-transparent h-2/3 bottom-0 pointer-events-none"></div>
            </div>
          </div>

          {/* Demographic Column */}
          <div className="lg:col-span-4 bg-white rounded-md shadow-sm border border-gray-200 p-8 flex flex-col group hover:border-tuggi-primary transition-all duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h3 className="text-tuggi-dark text-xl font-bold tracking-tight flex items-center gap-2">
                  <Globe2 className="text-tuggi-primary w-6 h-6" /> {t("demographics")}
                </h3>
                <p className="text-tuggi-slate text-sm font-medium">{t("demographicsDesc")}</p>
              </div>
            </div>

            <div className="flex flex-col gap-6 mt-auto">
              {/* English Data */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-tuggi-dark">English (EN)</span>
                  <span className="text-tuggi-slate font-mono text-xs">45%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-tuggi-primary w-[45%]"></div>
                </div>
              </div>

               {/* Spanish Data */}
               <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-tuggi-dark">Spanish (ES)</span>
                  <span className="text-tuggi-slate font-mono text-xs">30%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-tuggi-primary w-[30%]"></div>
                </div>
              </div>

              {/* Portuguese Data */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-tuggi-dark">Portuguese (PT)</span>
                  <span className="text-tuggi-slate font-mono text-xs">15%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-tuggi-primary w-[15%]"></div>
                </div>
              </div>

              {/* Others */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-tuggi-dark">Others</span>
                  <span className="text-tuggi-slate font-mono text-xs">10%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-gray-300 w-[10%]"></div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
