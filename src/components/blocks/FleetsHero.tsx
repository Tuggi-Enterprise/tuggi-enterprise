import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LineChart } from "lucide-react";

export function FleetsHero() {
  const t = useTranslations("Fleets.Hero");

  return (
    <section className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col">

        {/* Copy Focus */}
        <div className="max-w-3xl text-center lg:text-left flex flex-col items-center lg:items-start space-y-6">
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

      </div>
    </section>
  );
}
