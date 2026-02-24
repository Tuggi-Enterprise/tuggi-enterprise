import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";
import { Link } from "@/i18n/routing";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center flex-col items-center">
          <div className="w-24 h-24 bg-tuggi-slate/5 rounded-full flex items-center justify-center mb-6">
            <Compass className="w-12 h-12 text-tuggi-slate" />
          </div>
          <h1 className="text-4xl font-bold text-tuggi-slate tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/"
            className="px-8 py-3 bg-tuggi-slate text-white rounded-full font-semibold hover:bg-tuggi-slate/90 transition-all text-sm"
          >
            {t("backHome")}
          </Link>
          <Link
            href="/contact"
            className="px-8 py-3 border border-tuggi-slate/20 text-tuggi-slate rounded-full font-semibold hover:bg-slate-50 transition-all text-sm"
          >
            {t("support")}
          </Link>
        </div>
      </div>
    </div>
  );
}
