"use client";

import { useLocale, useTranslations } from "next-intl";
import { useGeoPricing } from "@/lib/conversionHooks";
import { formatPrice, type PassKey } from "@/lib/pricing";

/**
 * The published price of the three hour passes, inside an article.
 *
 * **The article never types a number.** It reads `resolvePricing`
 * (BR-MONETIZACAO-069), which publishes an amount only in the three base
 * markets we set ourselves — BRL, USD and EUR — and answers `null` everywhere
 * else, including for a visitor whose country we do not know. Outside a base
 * market the row says "in the store" and the note points at the two stores,
 * **with no number**: there is no conversion, no estimate and no "from" price
 * borrowed from another market. A published price is a binding offer, and the
 * two stores already charge different amounts from each other in one territory.
 *
 * The pass names and the two store notes come from `Drive.Pricing.*` and not
 * from a second set of strings: the catalogue is one fact, `hour-catalogue.
 * spec.ts` already guards those keys in four languages, and a copy of them
 * inside this section is the second implementation the guard would not see.
 *
 * It is a client component for the same reason `DrivePricing` is: the market is
 * a property of the visitor, resolved after paint, and this page is static.
 */
const PASSES: { key: PassKey; titleKey: "pass1Title" | "pass2Title" | "pass3Title" }[] = [
  { key: "10h", titleKey: "pass1Title" },
  { key: "25h", titleKey: "pass2Title" },
  { key: "45h", titleKey: "pass3Title" },
];

export function ArticlePriceTable({ caption }: { caption: string }) {
  const t = useTranslations("Drive.Pricing");
  const tTable = useTranslations("Updates.priceTable");
  const locale = useLocale();
  const pricing = useGeoPricing();

  return (
    <div className="my-10" data-block="article-price-table">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <caption className="caption-top pb-3 text-left text-sm font-bold text-tuggi-dark">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-gray-200">
            <th
              scope="col"
              className="w-1/2 py-3 pr-4 text-xs font-bold uppercase tracking-wider text-tuggi-slate"
            >
              {tTable("columnPass")}
            </th>
            <th
              scope="col"
              className="w-1/2 py-3 pl-4 text-xs font-bold uppercase tracking-wider text-tuggi-slate"
            >
              {tTable("columnPrice")}
            </th>
          </tr>
        </thead>
        <tbody>
          {PASSES.map(({ key, titleKey }) => (
            <tr key={key} className="border-b border-gray-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-tuggi-dark">
                {t(titleKey)}
              </th>
              <td className="py-3 pl-4 text-tuggi-dark tabular-nums">
                {pricing
                  ? formatPrice(pricing.prices[key], pricing.currency, locale)
                  : t("priceInStore")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-sm text-tuggi-slate">
        {pricing ? t("storeNoteWithPrice") : t("storeNoteNoPrice")}
      </p>
    </div>
  );
}
