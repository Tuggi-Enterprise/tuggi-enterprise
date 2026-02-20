import { useTranslations } from "next-intl";
import { Activity, RadioReceiver } from "lucide-react";

export function CityOSDecompression() {
  const t = useTranslations("CityOS.Decompression");

  return (
    <section className="w-full py-24 bg-white px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row gap-16 items-center">
        
        {/* Data Viz / Trigger Deployment Layout */}
        <div className="flex-1 w-full bg-tuggi-bg rounded-md shadow-sm border border-gray-200 p-8 flex flex-col gap-6 relative overflow-hidden h-[450px]">
          {/* Dashboard Header */}
          <div className="flex border-b border-gray-300 pb-4 items-center justify-between">
            <h4 className="text-tuggi-dark font-bold text-lg flex items-center gap-2">
              <Activity className="text-tuggi-secondary w-5 h-5" />
              Real-Time Flow Dynamics
            </h4>
            <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-sm">Zone Alpha: Congested</span>
          </div>
          
          {/* Dynamic Map/Graph Structure */}
          <div className="flex-1 relative flex justify-center items-center p-6 border border-dashed border-gray-300 bg-white">
            <div className="flex flex-col gap-8 w-full">
              {/* Congested Zone */}
              <div className="w-full flex items-center gap-4 group">
                <div className="w-12 h-12 bg-red-50 text-red-700 flex items-center justify-center shrink-0 border border-red-200 rounded-md shadow-sm">
                  <RadioReceiver className="w-6 h-6" />
                </div>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[95%] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                </div>
                <span className="font-mono text-xs font-semibold text-tuggi-slate w-16 text-right">95% Load</span>
              </div>
              
              {/* Redistribution Action */}
              <div className="w-full flex flex-col items-center scale-90 opacity-70">
                <div className="h-8 w-px bg-gray-300"></div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest my-1 border border-gray-200 px-2 py-0.5 rounded-sm bg-white">Instant Story Re-routing</span>
                <div className="h-8 w-px bg-tuggi-primary"></div>
              </div>
              
              {/* Peripheral Zone */}
              <div className="w-full flex items-center gap-4 group">
                <div className="w-12 h-12 bg-tuggi-primary text-white flex items-center justify-center shrink-0 shadow-md rounded-md">
                  <RadioReceiver className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div className="h-full bg-tuggi-primary w-[30%]"></div>
                </div>
                <span className="font-mono text-xs font-semibold text-tuggi-primary w-16 text-right">30% Load</span>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Copy */}
        <div className="flex-1 lg:pl-10 space-y-6 text-center lg:text-left">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark mb-6">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate max-w-prose mx-auto lg:mx-0">
            {t("desc")}
          </p>
        </div>
      </div>
    </section>
  );
}
