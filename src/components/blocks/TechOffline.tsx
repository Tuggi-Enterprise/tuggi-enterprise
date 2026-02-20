import { useTranslations } from "next-intl";
import { HardDriveDownload, CloudOff } from "lucide-react";

export function TechOffline() {
  const t = useTranslations("Technology.Offline");

  return (
    <section className="py-24 bg-tuggi-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Visual Icon Group */}
        <div className="flex justify-center items-center space-x-6 mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
             <CloudOff className="w-8 h-8" />
          </div>
          <div className="w-20 h-20 bg-tuggi-primary rounded-2xl shadow-lg flex items-center justify-center text-white transform -translate-y-2">
             <HardDriveDownload className="w-10 h-10" />
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-6">
          {t("title")}
        </h2>
        
        <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
          {t("desc")}
        </p>

      </div>
    </section>
  );
}
