import { useTranslations } from "next-intl";
import { ArrowLeftRight, RadioReceiver, Siren } from "lucide-react";

export function CityOSSustainability() {
  const t = useTranslations("CityOS.Sustainability");

  return (
    <section className="w-full py-24 bg-tuggi-bg px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row gap-16 items-center">
        
        {/* UI Mockup - Map Split */}
        <div className="flex-1 w-full bg-white rounded-md shadow-sm border border-gray-200 flex flex-col overflow-hidden h-[450px]">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h4 className="text-tuggi-dark font-bold text-sm tracking-wider uppercase flex items-center gap-2">
              <ArrowLeftRight className="text-tuggi-primary w-5 h-5" />
              Dynamic Routing Protocol
            </h4>
            <span className="text-xs bg-tuggi-primary/10 text-tuggi-primary border border-tuggi-primary/20 font-semibold px-2 py-1 rounded-sm">Active Triggers</span>
          </div>
          
          {/* Mockup Body */}
          <div className="flex-1 flex flex-col p-8 gap-8 relative items-center justify-center bg-gray-50 border-t border-dashed border-gray-200 mx-6 mb-6">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.5) 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
            
            <div className="flex flex-col gap-6 w-full z-10">
              {/* Feature 1 UI: AI Routing */}
              <div className="bg-white border border-red-200 rounded-md p-4 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-1">
                     <div className="h-full bg-red-500 w-[95%]"></div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-red-700">Historical Center: 95% Saturated</span>
                </div>
              </div>

              {/* Connector */}
              <div className="flex justify-center -my-3 opacity-50 relative z-20">
                <span className="bg-white border border-tuggi-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-tuggi-primary shadow-sm flex items-center gap-2">
                  <ArrowLeftRight className="w-3 h-3" /> Re-routing flow
                </span>
              </div>

              {/* Feature 2 UI: Audio Geofence / Emergencies */}
              <div className="bg-white border border-green-200 rounded-md p-4 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                  <RadioReceiver className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-1">
                     <div className="h-full bg-green-500 w-[30%]"></div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-green-700">Peripheral Zone: 30% Load</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Copy */}
        <div className="flex-1 lg:pl-4 space-y-10 text-center lg:text-left">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark mb-4">
              {t("title")}
            </h2>
            <p className="text-lg leading-relaxed text-tuggi-slate max-w-prose mx-auto lg:mx-0">
              {t("desc")}
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-4 items-start text-left">
              <div className="bg-tuggi-bg border border-gray-200 p-3 rounded-md shrink-0">
                <ArrowLeftRight className="w-6 h-6 text-tuggi-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-tuggi-dark">{t("feat1Title")}</h3>
                <p className="text-base text-tuggi-slate leading-relaxed">{t("feat1Desc")}</p>
              </div>
            </div>

            <div className="flex gap-4 items-start text-left">
              <div className="bg-tuggi-bg border border-gray-200 p-3 rounded-md shrink-0">
                <Siren className="w-6 h-6 text-tuggi-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-tuggi-dark">{t("feat2Title")}</h3>
                <p className="text-base text-tuggi-slate leading-relaxed">{t("feat2Desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
