"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rowVar = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

/**
 * Anonymous market-category comparison — objection handling for a hesitant
 * buyer, not a pitch. No competitor or navigation-app names; each category is
 * described by what it is, never by what it lacks (a neutral "—" marks
 * not-applicable cells). Real <table> with scope'd headers; horizontally
 * scrollable on small screens. The TUGGI column is highlighted.
 */
export function DriveComparison() {
  const t = useTranslations("Drive.Comparison");

  const rows = [
    { label: t("rowCost"), guide: t("costGuide"), audio: t("costAudio"), tuggi: t("costTuggi") },
    { label: t("rowLang"), guide: t("langGuide"), audio: t("langAudio"), tuggi: t("langTuggi") },
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
          <motion.table
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="w-full min-w-[640px] border-separate border-spacing-0 text-left"
          >
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
                  className="w-1/4 rounded-t-2xl border-x-2 border-t-2 border-tuggi-primary/30 bg-tuggi-primary/5 p-4 align-bottom text-base font-extrabold text-tuggi-primary-text"
                >
                  {t("colTuggi")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const last = i === rows.length - 1;
                return (
                  <motion.tr key={i} variants={rowVar} className="align-middle">
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
                  </motion.tr>
                );
              })}
            </tbody>
          </motion.table>
        </div>

        <p className="mt-6 text-center text-sm text-tuggi-slate">{t("footnote")}</p>
      </div>
    </section>
  );
}
