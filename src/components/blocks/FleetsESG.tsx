import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Leaf } from "lucide-react";

export function FleetsESG() {
  const t = useTranslations("Fleets.ESG");

  // bg-white, not bg-tuggi-bg: a dark section used to sit between this one and
  // FleetsFinancial (also bg-tuggi-bg) and carried the alternation. It went out
  // with the satisfaction metric it promised (BR-B2B-007 item 4), so the
  // alternation moves here.
  return (
    <section className="w-full py-24 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
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

      </div>
    </section>
  );
}
