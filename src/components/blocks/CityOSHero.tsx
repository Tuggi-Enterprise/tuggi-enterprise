import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BadgeCheck, Activity } from "lucide-react";

export function CityOSHero() {
  const t = useTranslations("CityOS.Hero");

  return (
    <section className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
        
        {/* Copy */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start space-y-8">
          <div className="inline-flex items-center gap-2 border border-tuggi-primary/30 bg-tuggi-primary/10 px-4 py-2 rounded-full text-sm font-semibold text-tuggi-primary uppercase tracking-wider">
            <BadgeCheck className="w-5 h-5" />
            DTI Compliance Engine
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-tuggi-dark leading-tight">
            {t("title")}
          </h1>
          <p className="text-xl text-tuggi-slate leading-relaxed max-w-2xl mx-auto lg:mx-0">
            {t("subtitle")}
          </p>
          <Link
            href="/contact"
            className="px-8 py-4 bg-tuggi-secondary text-white font-semibold rounded-md shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-tuggi-secondary focus:ring-offset-2 w-full sm:w-auto text-center"
          >
            {t("cta")}
          </Link>
        </div>

        {/* Dashboard UI & DTI Badge Mockup */}
        <div className="flex-1 w-full max-w-2xl relative">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-tuggi-primary/20 blur-3xl rounded-full"></div>
          
          <div className="bg-tuggi-dark rounded-md shadow-2xl border border-gray-800 flex flex-col overflow-hidden relative z-10">
             {/* Faux Header bar */}
             <div className="w-full h-8 bg-[#0B1220] border-b border-gray-800 flex items-center px-4 space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
              <div className="ml-4 text-[10px] font-mono text-gray-500 tracking-widest">SMART_DESTINATION_OS</div>
            </div>
            {/* Interface Body */}
            <div className="p-8 flex flex-col gap-8 bg-[#0E1525]">
              <div className="flex justify-between items-center border-b border-gray-800 pb-6">
                <h3 className="text-white font-semibold flex items-center gap-2 text-lg">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Territorial Governance Matrix
                </h3>
                <span className="text-xs font-mono text-tuggi-primary bg-[#0B1220] px-3 py-1 border border-gray-800 rounded-sm">
                  DTI: ACTIVE
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0B1220] border border-gray-800 p-4 rounded-sm flex flex-col gap-2">
                  <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Legal Compliance</span>
                  <span className="text-green-500 font-mono text-sm flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" /> 100% Hands-Free
                  </span>
                </div>
                <div className="bg-[#0B1220] border border-gray-800 p-4 rounded-sm flex flex-col gap-2">
                  <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Accessibility</span>
                  <span className="text-tuggi-primary font-mono text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" /> WCAG 2.1 AA
                  </span>
                </div>
              </div>

              <div className="h-24 w-full bg-gradient-to-r from-tuggi-primary/20 to-transparent border border-tuggi-primary/30 rounded-sm flex items-center px-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)", backgroundSize: "10px 10px" }}></div>
                <div className="z-10 text-white font-mono text-xs">
                  <p className="text-tuggi-primary">&gt; DEPLOYING GEO-TRIGGERS...</p>
                  <p className="text-gray-400 mt-1">STATUS: SYNCED TO MUNICIPAL GRID</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
