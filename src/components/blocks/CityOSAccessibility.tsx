import { useTranslations } from "next-intl";
import { Ear, EyeOff, Captions, ShieldCheck } from "lucide-react";

export function CityOSAccessibility() {
  const t = useTranslations("CityOS.Accessibility");

  return (
    <section className="w-full py-24 bg-white px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        
        {/* Copy Focus */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-tuggi-primary/20 rounded-full text-tuggi-primary font-semibold text-sm">
             <ShieldCheck className="w-4 h-4" />
             {t("tag")}
          </div>
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
                Accessibility OS
              </h3>
              <div className="w-8 h-4 bg-tuggi-primary rounded-full relative shadow-[0_0_10px_rgba(0,168,232,0.5)]">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              {/* Feature: Audio-first navigation */}
              <div className="bg-white/5 border border-white/10 rounded-md p-4 flex items-center gap-4 hover:border-tuggi-primary/50 transition-colors">
                <div className="bg-tuggi-primary/20 p-2 rounded-sm shrink-0">
                  <EyeOff className="w-6 h-6 text-tuggi-primary" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-white font-semibold text-sm tracking-wide">Audio-First Navigation</span>
                  <span className="text-gray-400 text-xs">VoiceOver Integration</span>
                </div>
                <div className="w-8 h-4 bg-tuggi-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Feature: Spatial Audio */}
              <div className="bg-white/5 border border-white/10 rounded-md p-4 flex items-center gap-4 hover:border-tuggi-primary/50 transition-colors">
                <div className="bg-tuggi-primary/20 p-2 rounded-sm shrink-0">
                  <Ear className="w-6 h-6 text-tuggi-primary" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-white font-semibold text-sm tracking-wide">Spatial Context</span>
                  <span className="text-gray-400 text-xs">Immersive Rendering</span>
                </div>
                <div className="w-8 h-4 bg-tuggi-primary rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

               {/* Feature: Closed Captions */}
               <div className="bg-white/5 border border-white/10 rounded-md p-4 flex items-center gap-4 hover:border-tuggi-primary/50 transition-colors">
                <div className="bg-tuggi-primary/20 p-2 rounded-sm shrink-0">
                  <Captions className="w-6 h-6 text-tuggi-primary" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-white font-semibold text-sm tracking-wide">Dynamic Subtitles</span>
                  <span className="text-gray-400 text-xs">Geolocated closed captions</span>
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
