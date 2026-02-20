import { useTranslations } from "next-intl";
import { PaintRoller, Sparkles, Map } from "lucide-react";

export function FleetsBrand() {
  const t = useTranslations("Fleets.Brand");

  return (
    <section className="w-full py-24 bg-white px-4 sm:px-6 lg:px-8 border-b border-gray-200 flex flex-col items-center">
      <div className="max-w-7xl mx-auto w-full space-y-16">
        
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate">
            {t("desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <article className="bg-[#F7F9FC] p-8 border border-gray-200 rounded-md shadow-sm group hover:border-tuggi-primary transition-colors flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-tuggi-primary mb-6 shadow-sm group-hover:bg-tuggi-primary group-hover:text-white transition-colors">
              <Sparkles className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-tuggi-dark mb-2">White-Label UI</h4>
            <p className="text-sm text-tuggi-slate leading-relaxed">Implement your own visual identity over our robust tech engine.</p>
          </article>
          
          <article className="bg-[#F7F9FC] p-8 border border-gray-200 rounded-md shadow-sm group hover:border-tuggi-primary transition-colors flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-tuggi-primary mb-6 shadow-sm group-hover:bg-tuggi-primary group-hover:text-white transition-colors">
              <PaintRoller className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-tuggi-dark mb-2">Custom Voice</h4>
            <p className="text-sm text-tuggi-slate leading-relaxed">Differentiate your premium vehicles with tailored audio guides.</p>
          </article>
          
          <article className="bg-[#F7F9FC] p-8 border border-gray-200 rounded-md shadow-sm group hover:border-tuggi-primary transition-colors flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-tuggi-primary mb-6 shadow-sm group-hover:bg-tuggi-primary group-hover:text-white transition-colors">
              <Map className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-tuggi-dark mb-2">Exclusive Routes</h4>
            <p className="text-sm text-tuggi-slate leading-relaxed">Sponsor unique private routes that competitors cannot match.</p>
          </article>

        </div>
      </div>
    </section>
  );
}
