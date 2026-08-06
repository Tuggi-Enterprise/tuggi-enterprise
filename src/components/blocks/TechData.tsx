import { useTranslations } from "next-intl";
import { Server } from "lucide-react";

export function TechData() {
  const t = useTranslations("Technology.Data");

  // One column, and the missing one is deliberate: the first card claimed "100%
  // anonymized telemetry" and strict adherence to GDPR/LGPD. It is an absolute
  // about personal data, and no vigent BR-* describes what the site telemetry
  // collects or how it is anonymized — BR-USUARIO-017 and 018 define
  // anonymization on account deletion, which is a different fact. It does not
  // come back softened; it comes back with a rule.
  return (
    <section className="py-24 bg-tuggi-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:gap-16">

          {/* Serverless Scale */}
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
            <div className="w-12 h-12 bg-tuggi-primary/10 rounded-xl flex items-center justify-center mb-6">
              <Server className="w-6 h-6 text-tuggi-primary" />
            </div>
            <h3 className="text-2xl font-bold text-tuggi-dark tracking-tight mb-4">
              {t("col2Title")}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {t("col2Desc")}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
