import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Leaf, QrCode } from "lucide-react";

export function FleetsESG() {
  const t = useTranslations("Fleets.ESG");

  return (
    <section className="w-full py-24 bg-tuggi-bg border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-4xl mx-auto bg-white rounded-md shadow-sm border border-gray-200 p-12 text-center relative overflow-hidden flex flex-col items-center">
        
        {/* Abstract vector shape */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="bg-green-50 p-4 rounded-full mb-8 inline-block shadow-sm ring-1 ring-green-500/20">
          <Leaf className="w-10 h-10 text-green-600" />
        </div>

        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark mb-4">
          {t("title")}
        </h2>

        <p className="text-lg leading-relaxed text-tuggi-slate mb-12 max-w-2xl">
          {t("desc")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center text-center">
          <Link
            href="/contact"
            className="px-8 py-4 bg-tuggi-dark text-white font-semibold rounded-md shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-tuggi-dark focus:ring-offset-2 w-full sm:w-auto text-center flex items-center justify-center gap-2"
          >
            {t("cta")}
          </Link>
        </div>

        {/* QR Code Graphic Hint */}
        <div className="mt-16 flex flex-col items-center pt-8 border-t border-gray-100 w-full">
           <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-tuggi-slate">
             <QrCode className="w-5 h-5 text-tuggi-primary" /> {t("cacDeployment")}
           </div>
        </div>

      </div>
    </section>
  );
}
