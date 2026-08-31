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
 * **The usage caption travels with the name, at every width.** A pass is
 * "10 horas" AND "um bate e volta" (BR-MONETIZACAO-048, amendment of
 * 2026-08-24, item 3): the hour count sizes the product and the caption is what
 * says which trip it is for. It sits under the title inside the same row header
 * — the shape `DrivePricing` already publishes — so nothing has to be dropped
 * when the column narrows to 360 px.
 *
 * **And the nature of the charge is stated beside the product, never globally**
 * (BR-MONETIZACAO-004). `Drive.Pricing.passesNote` says "one-time payment" and
 * is silent on renewal, which is half the pair; `Updates.priceTable.note` says
 * both. The article's last section states the other product's nature — the
 * monthly subscription's — in its own sentence, and there is no third place
 * where this site says how it charges.
 *
 * The pass names and the two store notes come from `Drive.Pricing.*` and not
 * from a second set of strings: the catalogue is one fact, `hour-catalogue.
 * spec.ts` already guards those keys in four languages, and a copy of them
 * inside this section is the second implementation the guard would not see.
 *
 * It is a client component for the same reason `DrivePricing` is: the market is
 * a property of the visitor, resolved after paint, and this page is static.
 */
const PASSES: {
  key: PassKey;
  titleKey: "pass1Title" | "pass2Title" | "pass3Title";
  descKey: "pass1Desc" | "pass2Desc" | "pass3Desc";
}[] = [
  { key: "10h", titleKey: "pass1Title", descKey: "pass1Desc" },
  { key: "25h", titleKey: "pass2Title", descKey: "pass2Desc" },
  { key: "45h", titleKey: "pass3Title", descKey: "pass3Desc" },
];

export function ArticlePriceTable() {
  const t = useTranslations("Drive.Pricing");
  const tTable = useTranslations("Updates.priceTable");
  const locale = useLocale();
  const pricing = useGeoPricing();

  return (
    <div className="my-10" data-block="article-price-table">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <caption className="caption-top pb-3 text-left text-sm font-bold text-tuggi-dark">
          {tTable("caption")}
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
          {PASSES.map(({ key, titleKey, descKey }) => (
            <tr key={key} className="border-b border-gray-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-tuggi-dark">
                {t(titleKey)}
                <span className="block font-normal text-tuggi-slate">{t(descKey)}</span>
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

      <p className="mt-3 text-sm text-tuggi-slate">{tTable("note")}</p>
      <p className="mt-2 text-sm text-tuggi-slate">
        {pricing ? t("storeNoteWithPrice") : t("storeNoteNoPrice")}
      </p>
    </div>
  );
}
