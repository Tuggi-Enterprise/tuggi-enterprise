import { useTranslations } from "next-intl";
import { Play, Star } from "lucide-react";

export function DriveSamples() {
  const t = useTranslations("Drive.Samples");

  const samples = [
    { title: t("sample1Title"), location: t("sample1Loc") },
    { title: t("sample2Title"), location: t("sample2Loc") },
    { title: t("sample3Title"), location: t("sample3Loc") },
  ];

  return (
    <section className="w-full py-24 bg-tuggi-dark text-white px-4 sm:px-6 lg:px-8 border-b border-gray-800">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center max-w-3xl mb-16 space-y-4">
          <span className="inline-block px-4 py-1.5 bg-tuggi-primary/20 text-tuggi-primary rounded-full text-sm font-bold uppercase tracking-widest border border-tuggi-primary/30">
            {t("tag")}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-xl text-gray-400 leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-16">
          {samples.map((sample, index) => (
            <article key={index} className="bg-[#161F32] p-8 rounded-xl border border-gray-800 flex flex-col gap-6 group hover:border-tuggi-primary transition-all duration-300">
              <div className="flex items-center gap-6">
                <button 
                  className="w-14 h-14 bg-tuggi-primary rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-tuggi-primary/20 hover:scale-105 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark"
                  aria-label={`${t("tag")}: ${sample.title}`}
                >
                  <Play className="w-6 h-6 text-white ml-1 fill-white" aria-hidden="true" />
                </button>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-tuggi-primary transition-colors">
                    {sample.title}
                  </h3>
                  <span className="text-sm text-gray-500 font-medium">
                    {sample.location}
                  </span>
                </div>
              </div>

              {/* Waveform Mockup */}
              <div className="flex items-end gap-[3px] h-10 w-full px-2">
                {[...Array(24)].map((_, i) => {
                   const heights = [40, 20, 60, 30, 80, 45, 70, 25, 50, 90, 40, 65, 30, 85, 50, 75, 20, 45, 60, 35, 70, 40, 55, 30];
                   return (
                     <div 
                       key={i} 
                       className={`flex-1 bg-tuggi-primary/30 rounded-t-full group-hover:bg-tuggi-primary/50 transition-colors duration-500`}
                       style={{ height: `${heights[i % heights.length]}%` }}
                     ></div>
                   )
                })}
              </div>
            </article>
          ))}
        </div>

        {/* Social Proof Footer */}
        <div className="flex items-center gap-2 text-tuggi-primary font-semibold tracking-wide bg-[#161F32] px-6 py-3 rounded-full border border-gray-800 shadow-xl">
          <Star className="w-5 h-5 fill-tuggi-primary" aria-hidden="true" />
          <span className="text-sm md:text-base">
            {t("socialProof")}
          </span>
        </div>

      </div>
    </section>
  );
}
