import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

export function CityOSRegulatory() {
  const t = useTranslations("CityOS.Regulatory");

  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-white flex justify-center border-b border-gray-200">
      <div className="max-w-6xl w-full">
        <article className="bg-[#F7F9FC] border border-gray-200 p-6 md:p-8 rounded-md shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-6">
          
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100 shrink-0 z-10 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-tuggi-primary" />
          </div>
            
          <div className="flex-1 space-y-2 text-center md:text-left z-10">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-tuggi-dark">
              {t("title")}
            </h2>
            <p className="text-base text-tuggi-slate leading-relaxed font-medium max-w-4xl">
              {t("desc")}
            </p>
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-5 pointer-events-none">
            <ShieldCheck className="w-64 h-64 text-tuggi-primary" />
          </div>

        </article>
      </div>
    </section>
  );
}
