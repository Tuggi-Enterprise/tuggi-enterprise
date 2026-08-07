import { useTranslations } from "next-intl";
import { PRODUCT_FACTS } from "@/lib/product-facts";

/**
 * Anonymous market-category comparison — objection handling for a hesitant
 * buyer, not a pitch. No competitor or navigation-app names; each category is
 * described by what it is, never by what it lacks (a neutral "—" marks
 * not-applicable cells). Real <table> with scope'd headers; horizontally
 * scrollable on small screens. The TUGGI column is highlighted.
 *
 * No motion, and therefore no client boundary. The six rows used to stagger in
 * with an opacity-only variant, which meant the whole table read blank until an
 * IntersectionObserver fired: on a 390px screen a realistic fling left 3 of the
 * 6 rows invisible, and a jump to the end left all 6 (#191). Reinstating the
 * stagger as a transform is not an option either — translating a <tr> breaks
 * the vertical border that runs down the highlighted column.
 */
export function DriveComparison() {
  const t = useTranslations("Drive.Comparison");

  const rows = [
    { label: t("rowCost"), guide: t("costGuide"), audio: t("costAudio"), tuggi: t("costTuggi") },
    { label: t("rowLang"), guide: t("langGuide"), audio: t("langAudio"), tuggi: t("langTuggi", PRODUCT_FACTS) },
    { label: t("rowRoute"), guide: t("routeGuide"), audio: t("routeAudio"), tuggi: t("routeTuggi") },
    { label: t("rowDrive"), guide: null, audio: t("driveAudio"), tuggi: t("driveTuggi") },
    { label: t("rowOffline"), guide: null, audio: t("offlineAudio"), tuggi: t("offlineTuggi") },
    { label: t("rowCaptions"), guide: null, audio: t("captionsAudio"), tuggi: t("captionsTuggi") },
  ];

  const Dash = () => (
    <>
      <span aria-hidden="true" className="text-gray-300">—</span>
      <span className="sr-only">{t("notApplicable")}</span>
    </>
  );

  return (
    <section className="bg-tuggi-bg py-20 lg:py-24 border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight text-center mb-12">
          {t("title")}
        </h2>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr>
                <td className="w-1/4 p-4" />
                <th
                  scope="col"
                  className="w-1/4 p-4 align-bottom text-sm font-bold text-tuggi-dark"
                >
                  {t("colGuide")}
                </th>
                <th
                  scope="col"
                  className="w-1/4 p-4 align-bottom text-sm font-bold text-tuggi-dark"
                >
                  {t("colAudio")}
                </th>
                <th
                  scope="col"
                  className="w-1/4 rounded-t-2xl border-x-2 border-t-2 border-tuggi-primary/30 bg-white p-4 align-bottom text-base font-extrabold text-tuggi-primary-text"
                >
                  {t("colTuggi")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const last = i === rows.length - 1;
                return (
                  <tr key={i} className="align-middle">
                    <th
                      scope="row"
                      className="border-t border-gray-200 p-4 text-sm font-bold text-tuggi-dark"
                    >
                      {row.label}
                    </th>
                    <td className="border-t border-gray-200 p-4 text-sm text-tuggi-slate">
                      {row.guide ?? <Dash />}
                    </td>
                    <td className="border-t border-gray-200 p-4 text-sm text-tuggi-slate">
                      {row.audio}
                    </td>
                    <td
                      className={`border-x-2 border-tuggi-primary/30 bg-tuggi-primary/5 p-4 text-sm font-semibold text-tuggi-dark ${
                        last ? "rounded-b-2xl border-b-2" : ""
                      }`}
                    >
                      {row.tuggi}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-sm text-tuggi-slate">{t("footnote")}</p>
      </div>
    </section>
  );
}
