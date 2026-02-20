import { useTranslations } from "next-intl";
import { BadgeCheck, FileClock, Globe } from "lucide-react";

export function CityOSWhiteLabel() {
  const t = useTranslations("CityOS.WhiteLabel");

  return (
    <section className="w-full py-24 bg-tuggi-bg px-4 sm:px-6 lg:px-8 border-b border-gray-200 flex flex-col items-center">
      <div className="max-w-7xl mx-auto w-full">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          
          {/* Card 1: Co-branding */}
          <article className="bg-white p-10 border border-gray-200 rounded-md shadow-sm flex flex-col gap-4 group hover:border-tuggi-primary transition-all duration-300">
            <div className="bg-blue-50 w-16 h-16 rounded-md flex items-center justify-center text-tuggi-primary mb-2 group-hover:bg-tuggi-primary group-hover:text-white transition-colors duration-300">
              <BadgeCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-tuggi-dark">
              {t("coBrandingTitle")}
            </h3>
            <p className="text-base text-tuggi-slate leading-relaxed">
              {t("coBrandingDesc")}
            </p>
          </article>

          {/* Card 2: Audit Trail */}
          <article className="bg-[#0B1220] p-10 border border-gray-800 rounded-md shadow-lg flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs text-gray-500 font-mono border-b border-gray-800 pb-2 mb-2">
              <FileClock className="w-5 h-5 text-tuggi-secondary" />
              <span>sys/sec_log_tail</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {t("auditTitle")}
            </h3>
            <p className="text-base text-gray-400 leading-relaxed mb-4">
              {t("auditDesc")}
            </p>

            {/* Terminal mock log */}
            <div className="pt-2 px-3 pb-3 bg-black rounded border border-gray-800 shadow-inner overflow-hidden mt-auto">
              <ul className="text-[10px] sm:text-xs font-mono text-gray-400 space-y-2 opacity-80">
                <li className="flex gap-2"><span className="text-green-500 shrink-0">GET</span> <span className="truncate">/api/v1/narratives/421</span> <span className="text-gray-600">admin@city.gov</span></li>
                <li className="flex gap-2"><span className="text-tuggi-secondary shrink-0">PUT</span> <span className="truncate">/api/v1/traces/993</span> <span className="text-gray-600">mod@city.gov</span></li>
                <li className="flex gap-2 border-l-2 border-tuggi-primary pl-2 text-gray-300"><span className="text-blue-400 shrink-0">COMMIT</span> <span className="truncate">Hash 8f921d...</span> <span className="text-gray-500">2026-02-20T14:12Z</span></li>
              </ul>
            </div>
          </article>

          {/* Card 3: Multilanguage Pipeline */}
          <article className="bg-white p-10 border border-gray-200 rounded-md shadow-sm flex flex-col gap-4 group hover:border-tuggi-primary transition-all duration-300">
            <div className="bg-blue-50 w-16 h-16 rounded-md flex items-center justify-center text-tuggi-primary mb-2 group-hover:bg-tuggi-primary group-hover:text-white transition-colors duration-300">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-tuggi-dark">
              {t("aiTitle")}
            </h3>
            <p className="text-base text-tuggi-slate leading-relaxed">
              {t("aiDesc")}
            </p>
          </article>

        </div>
      </div>
    </section>
  );
}
