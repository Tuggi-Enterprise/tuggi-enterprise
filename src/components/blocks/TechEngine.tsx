import { useTranslations } from "next-intl";
import { Compass, Box, ArrowRight, Rss } from "lucide-react";

export function TechEngine() {
  const t = useTranslations("Technology.Engine");

  return (
    <section className="py-24 bg-white border-b border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div>
            <div className="inline-flex items-center space-x-2 text-tuggi-primary font-semibold text-sm tracking-wider uppercase mb-4">
              <Compass className="w-5 h-5" />
              <span>THE BLACK BOX</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-6">
              {t("title")}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg mb-8">
              {t("desc")}
            </p>
          </div>

          {/* Abstract Engine Output Diagram */}
          <div className="relative">
            {/* Background elements */}
            <div className="absolute inset-0 bg-slate-50 rounded-2xl -z-10 transform translate-x-4 translate-y-4 border border-slate-100"></div>
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Inputs */}
              <div className="flex flex-col space-y-3 w-full md:w-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center md:text-left mb-2">{t("inputLabel")}</div>
                <div className="bg-slate-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span> lat, lng
                </div>
                <div className="bg-slate-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> heading
                </div>
                <div className="bg-slate-50 border border-gray-200 p-3 rounded-lg text-sm font-mono text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> speed
                </div>
              </div>

              {/* Data Flow */}
              <div className="hidden md:flex flex-col items-center text-slate-300">
                <ArrowRight className="w-8 h-8" />
              </div>

              {/* The Black Box */}
              <div className="bg-tuggi-dark text-white p-6 rounded-xl flex flex-col items-center justify-center border-2 border-tuggi-primary shadow-[0_0_20px_rgba(0,168,232,0.15)] w-full md:w-auto transform hover:scale-105 transition-transform duration-300">
                <Box className="w-10 h-10 text-tuggi-primary mb-3" />
                <span className="font-mono text-xs font-bold tracking-widest uppercase">TUGGI Engine</span>
              </div>

              {/* Data Flow */}
              <div className="hidden md:flex flex-col items-center text-slate-300">
                <ArrowRight className="w-8 h-8" />
              </div>

              {/* Output */}
              <div className="flex flex-col space-y-3 w-full md:w-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center md:text-right mb-2">{t("outputLabel")}</div>
                <div className="bg-tuggi-bg border border-tuggi-primary/20 p-4 rounded-lg flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm text-tuggi-primary">
                    <Rss className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-tuggi-dark">Audio.play()</span>
                    <span className="text-[10px] text-slate-500 font-mono">200 OK</span>
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
