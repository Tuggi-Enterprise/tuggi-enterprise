import { useTranslations } from "next-intl";
import { QrCode, HandCoins } from "lucide-react";

export function FleetsFinancial() {
  const t = useTranslations("Fleets.Financial");

  return (
    <section className="w-full py-24 bg-tuggi-bg px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Two columns, in the order the mechanism happens: how the partner
            distributes, what he takes part in. They are exactly items 3 and 4
            of the closed list in BR-B2B-007 — QR/fingerprint attribution and a
            share of the revenue he attributed. The revenue column states the
            mechanism, never an outcome (BR-B2B-005).

            A third column used to sit in front of these two and price what
            the partner puts in. BR-B2B-007 item 7 leaves no room for a cost of
            entry, minimal or otherwise: nobody acquires, deploys or is invoiced
            for anything, so there is no figure to make small. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

          {/* Column 1: Instant Scalability */}
          <article className="bg-white p-10 border border-gray-200 rounded-md shadow-sm flex flex-col items-start gap-4 hover:border-tuggi-primary transition-colors">
            <div className="bg-blue-50 p-4 rounded-md">
              <QrCode className="w-8 h-8 text-tuggi-primary" />
            </div>
            <h3 className="text-xl font-bold text-tuggi-dark mt-2">
              {t("col2Title")}
            </h3>
            <p className="text-tuggi-slate leading-relaxed text-base">
              {t("col2Desc")}
            </p>
          </article>

          {/* Column 2: Revenue share */}
          <article className="bg-white p-10 border border-gray-200 rounded-md shadow-sm flex flex-col items-start gap-4 hover:border-tuggi-primary transition-colors">
            <div className="bg-blue-50 p-4 rounded-md">
              <HandCoins className="w-8 h-8 text-tuggi-primary" />
            </div>
            <h3 className="text-xl font-bold text-tuggi-dark mt-2">
              {t("col3Title")}
            </h3>
            <p className="text-tuggi-slate leading-relaxed text-base">
              {t("col3Desc")}
            </p>
          </article>

        </div>
      </div>
    </section>
  );
}
