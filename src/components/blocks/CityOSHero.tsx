import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BadgeCheck } from "lucide-react";
import { CityOSHeroAnimator } from "./CityOSHeroAnimator";

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
              <div className="ml-4 text-[10px] font-mono text-gray-500 tracking-widest">Tuggi - CITY OS</div>
            </div>
            {/* Interface Body — CMS Animation */}
            <div className="relative overflow-hidden h-64">
              <CityOSHeroAnimator />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
