import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { QrCode, Ticket, Shield } from "lucide-react";

export function CityOSMandate() {
  const t = useTranslations("CityOS.Mandate");

  return (
    <section className="w-full py-24 bg-white px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Infographic Visuals */}
        <div className="w-full flex justify-center mb-16 px-4">
          <div className="w-full max-w-3xl flex items-center justify-between border-b-2 border-dashed border-gray-300 pb-12 relative px-4">
            
            {/* Asset 1: Parking Meter */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="w-20 h-20 bg-tuggi-bg rounded-md flex items-center justify-center border border-gray-200 shadow-sm relative group overflow-hidden">
                <div className="absolute inset-0 bg-tuggi-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <QrCode className="w-10 h-10 text-tuggi-primary" />
              </div>
              <span className="text-xs font-semibold text-tuggi-slate uppercase tracking-wider text-center">Parking Integration</span>
            </div>

            {/* Asset 2: Toll Booth */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="w-24 h-24 bg-tuggi-dark rounded-md flex items-center justify-center border border-gray-800 shadow-md relative overflow-hidden group">
                <div className="absolute inset-0 bg-tuggi-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <Ticket className="w-12 h-12 text-white" />
              </div>
              <span className="text-xs font-bold text-tuggi-dark uppercase tracking-wider text-center">Highway Toll Booths</span>
            </div>

            {/* Asset 3: Access Totem */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="w-20 h-20 bg-tuggi-bg rounded-md flex items-center justify-center border border-gray-200 shadow-sm relative group overflow-hidden">
                <div className="absolute inset-0 bg-tuggi-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <Shield className="w-10 h-10 text-tuggi-primary" />
              </div>
              <span className="text-xs font-semibold text-tuggi-slate uppercase tracking-wider text-center">Historical Access Totems</span>
            </div>

            {/* Connector Dots */}
            <div className="absolute bottom-0 translate-y-1/2 left-[20%] w-4 h-4 rounded-full bg-tuggi-secondary border-2 border-white shadow-sm z-20"></div>
            <div className="absolute bottom-0 translate-y-1/2 left-[50%] w-4 h-4 rounded-full bg-tuggi-primary animate-pulse z-20"></div>
            <div className="absolute bottom-0 translate-y-1/2 left-[80%] w-4 h-4 rounded-full bg-tuggi-secondary border-2 border-white shadow-sm z-20"></div>

          </div>
        </div>

        {/* Copy */}
        <div className="text-center space-y-8 flex flex-col items-center px-4 w-full">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate max-w-prose">
            {t("desc")}
          </p>
          <div className="pt-8 w-full flex justify-center">
            <Link 
              href="/contact" 
              className="px-8 py-4 bg-tuggi-secondary text-white font-semibold rounded-md shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-tuggi-secondary focus:ring-offset-2 flex whitespace-nowrap"
            >
              {t("cta")}
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
