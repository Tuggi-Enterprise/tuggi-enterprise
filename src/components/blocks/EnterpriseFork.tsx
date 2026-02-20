import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Building2, CarFront, ArrowRight } from "lucide-react";

export function EnterpriseFork() {
  const t = useTranslations("Home.EnterpriseFork");

  return (
    <section className="w-full py-24 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 flex flex-col items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          
          {/* Card 1: B2G Route */}
          <Link href="/enterprise/city-os" className="group flex flex-col p-10 bg-white border border-gray-200 rounded-md shadow-sm hover:border-tuggi-primary hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-tuggi-primary focus:ring-offset-2">
            <div className="w-16 h-16 bg-tuggi-bg text-tuggi-primary flex items-center justify-center rounded-sm mb-8 group-hover:bg-tuggi-primary group-hover:text-white transition-colors duration-300">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-tuggi-dark mb-4">
              {t("b2gTitle")}
            </h3>
            <p className="text-lg text-tuggi-slate leading-relaxed mb-8 flex-1">
              {t("b2gDesc")}
            </p>
            <div className="mt-auto flex items-center space-x-2 text-tuggi-primary font-semibold">
              <span>{t("b2gLinkLabel")}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: B2B Route */}
          <Link href="/enterprise/fleets" className="group flex flex-col p-10 bg-white border border-gray-200 rounded-md shadow-sm hover:border-tuggi-primary hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-tuggi-primary focus:ring-offset-2">
            <div className="w-16 h-16 bg-tuggi-bg text-tuggi-primary flex items-center justify-center rounded-sm mb-8 group-hover:bg-tuggi-primary group-hover:text-white transition-colors duration-300">
              <CarFront className="w-8 h-8" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-tuggi-dark mb-4">
              {t("b2bTitle")}
            </h3>
            <p className="text-lg text-tuggi-slate leading-relaxed mb-8 flex-1">
              {t("b2bDesc")}
            </p>
            <div className="mt-auto flex items-center space-x-2 text-tuggi-primary font-semibold">
              <span>{t("b2bLinkLabel")}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
}
