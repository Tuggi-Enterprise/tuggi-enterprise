import { useTranslations } from "next-intl";

export function CityOSHero() {
  const t = useTranslations("CityOS.Hero");

  return (
    <section className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
        
        {/* Copy */}
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-tuggi-dark mb-6 leading-tight">
            {t("title")}
          </h1>
          <p className="text-xl text-tuggi-slate leading-relaxed max-w-prose mx-auto lg:mx-0">
            {t("subtitle")}
          </p>
        </div>

        {/* CMS Dashboard UI Mockup */}
        <div className="flex-1 w-full max-w-2xl bg-tuggi-dark rounded-md shadow-lg border border-gray-800 p-1 relative overflow-hidden flex flex-col">
          {/* Faux Browser/Header bar */}
          <div className="w-full h-8 bg-gray-900 border-b border-gray-800 flex items-center px-4 space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <div className="ml-4 text-xs font-mono text-gray-500 tracking-widest">TUGGI_CITY_OS_ENVIRONMENT</div>
          </div>
          {/* Interface Body */}
          <div className="p-6 flex flex-col gap-6 bg-[#0E1525]">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tuggi-primary animate-pulse"></span>
                POI & Trigger Management
              </h3>
              <div className="text-xs text-tuggi-slate px-3 py-1 bg-gray-800 rounded-sm">Active Grid: Zone 4</div>
            </div>
            
            {/* Heat map mockup */}
            <div className="h-48 w-full border border-gray-800 rounded-sm relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }}></div>
              
              {/* Hotspots */}
              <div className="absolute top-[30%] left-[20%] w-24 h-24 bg-tuggi-secondary/20 rounded-full blur-xl"></div>
              <div className="absolute top-[60%] left-[70%] w-32 h-32 bg-tuggi-primary/20 rounded-full blur-xl"></div>
              
              {/* Data points */}
              <div className="relative z-10 w-full px-6 flex flex-col gap-3">
                <div className="w-full bg-gray-900/80 border border-gray-800 p-3 rounded-sm flex justify-between items-center text-xs text-gray-400">
                  <span className="text-white font-mono">TG_REF_001</span>
                  <span>Cathedral Square</span>
                  <span className="text-tuggi-primary">1.2km Radius</span>
                </div>
                <div className="w-full bg-gray-900/80 border border-gray-800 p-3 rounded-sm flex justify-between items-center text-xs text-gray-400">
                  <span className="text-white font-mono">TG_REF_002</span>
                  <span>Port Authority</span>
                  <span className="text-tuggi-secondary">OVERLOAD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
