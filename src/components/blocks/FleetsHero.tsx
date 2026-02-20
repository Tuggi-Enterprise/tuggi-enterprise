import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LineChart, Smartphone, CarFront } from "lucide-react";

export function FleetsHero() {
  const t = useTranslations("Fleets.Hero");

  return (
    <section className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
        
        {/* Copy Focus */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-tuggi-primary/20 rounded-full text-tuggi-primary font-semibold text-sm">
            <LineChart className="w-5 h-5" />
            B2B2C API Platform
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-tuggi-dark leading-tight">
            {t("title")}
          </h1>
          <p className="text-xl text-tuggi-slate leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-4">
            {t("subtitle")}
          </p>
          <Link
            href="/contact"
            className="px-8 py-4 bg-tuggi-secondary text-white font-semibold rounded-md shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-tuggi-secondary focus:ring-offset-2 w-full sm:w-auto text-center"
          >
            {t("cta")}
          </Link>
        </div>

        {/* High-fidelity Mockup */}
        <div className="flex-1 w-full max-w-2xl relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl transform rotate-2"></div>
          
          <div className="bg-[#0B1220] rounded-xl shadow-2xl border border-gray-800 p-2 relative z-10 overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-tuggi-primary/10 rounded-full blur-3xl"></div>
            
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-800">
               <div className="flex space-x-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
               </div>
               <span className="text-xs text-gray-500 font-mono">RENTAL_REVPA_DASHBOARD</span>
            </div>

            <div className="p-8 space-y-8 relative z-10">
               <div className="flex justify-between items-end">
                 <div className="space-y-1">
                   <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Ancillary Revenue</p>
                   <h3 className="text-3xl text-white font-bold flex items-center gap-2">
                     $142,500 <span className="text-sm font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">+24% RevPA</span>
                   </h3>
                 </div>
                 <LineChart className="w-8 h-8 text-tuggi-primary" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/5 border border-white/10 p-4 rounded-md">
                   <div className="flex items-center gap-2 mb-2">
                     <CarFront className="w-4 h-4 text-gray-400" />
                     <span className="text-xs text-gray-400 font-semibold uppercase">Active Fleets</span>
                   </div>
                   <p className="text-xl text-white font-bold">4,205</p>
                 </div>
                 <div className="bg-white/5 border border-white/10 p-4 rounded-md">
                   <div className="flex items-center gap-2 mb-2">
                     <Smartphone className="w-4 h-4 text-tuggi-primary" />
                     <span className="text-xs text-tuggi-primary font-semibold uppercase">Premium Upgrades</span>
                   </div>
                   <p className="text-xl text-white font-bold">12,400</p>
                 </div>
               </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
