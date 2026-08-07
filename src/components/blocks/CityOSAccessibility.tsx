import { useTranslations } from "next-intl";
import { Ear, EyeOff, Captions } from "lucide-react";

export function CityOSAccessibility() {
  const t = useTranslations("CityOS.Accessibility");
  // The mock panel has its own sub-namespace: its labels are interface of a
  // simulated screen, not section copy, and mixing them invites a rewrite of
  // one to be read as a rewrite of the other.
  const tPanel = useTranslations("CityOS.Accessibility.Panel");

  // bg-tuggi-bg, not white: the hero above this section is white, and the two
  // sections that used to alternate between them were removed — the two whites
  // ended up touching, separated by a single border. Inverting this pair with
  // CityOSIntelligence restores white → light → white.
  return (
    <section className="w-full py-24 bg-tuggi-bg px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        
        {/* Copy Focus */}
        {/* The eyebrow badge above this heading promised the municipality a
            lift in its accessibility rating — an outcome, the same class as the
            revenue and satisfaction lifts BR-B2B-007 item 4 rules out. It went;
            the heading is the first thing in the column now. */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate max-w-prose mx-auto lg:mx-0">
            {t("desc")}
          </p>
        </div>

        {/* Concept UI Setup */}
        <div className="flex-1 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-[#0B1220] rounded-md shadow-lg border border-gray-800 p-8 flex flex-col gap-6 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-tuggi-primary/10 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                {tPanel("title")}
              </h3>
              <div className="w-8 h-4 bg-tuggi-primary rounded-full relative shadow-[0_0_10px_rgba(0,168,232,0.5)]">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              {/* Feature row 1 */}
              <div className="bg-white/5 border border-white/10 rounded-md p-4 flex items-center gap-4 hover:border-tuggi-primary/50 transition-colors">
                <div className="bg-tuggi-primary/20 p-2 rounded-sm shrink-0">
                  <EyeOff className="w-6 h-6 text-tuggi-primary" aria-hidden="true" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-white font-semibold text-sm tracking-wide">{tPanel("feat1Title")}</span>
                  <span className="text-gray-400 text-xs">{tPanel("feat1Desc")}</span>
                </div>
                <div className="w-8 h-4 bg-tuggi-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Feature row 2 */}
              <div className="bg-white/5 border border-white/10 rounded-md p-4 flex items-center gap-4 hover:border-tuggi-primary/50 transition-colors">
                <div className="bg-tuggi-primary/20 p-2 rounded-sm shrink-0">
                  <Ear className="w-6 h-6 text-tuggi-primary" aria-hidden="true" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-white font-semibold text-sm tracking-wide">{tPanel("feat2Title")}</span>
                  <span className="text-gray-400 text-xs">{tPanel("feat2Desc")}</span>
                </div>
                <div className="w-8 h-4 bg-tuggi-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

               {/* Feature row 3 */}
               <div className="bg-white/5 border border-white/10 rounded-md p-4 flex items-center gap-4 hover:border-tuggi-primary/50 transition-colors">
                <div className="bg-tuggi-primary/20 p-2 rounded-sm shrink-0">
                  <Captions className="w-6 h-6 text-tuggi-primary" aria-hidden="true" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-white font-semibold text-sm tracking-wide">{tPanel("feat3Title")}</span>
                  <span className="text-gray-400 text-xs">{tPanel("feat3Desc")}</span>
                </div>
                <div className="w-8 h-4 bg-tuggi-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
