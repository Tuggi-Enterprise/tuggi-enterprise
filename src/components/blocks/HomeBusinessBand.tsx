"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

/**
 * Single compact B2B/B2G band — deliberately quiet so it never competes with
 * the B2C story above. Two text links into the internal vertical pages. Keeps
 * the original EnterpriseFork GA events (`click_enterprise_fork`).
 */
export function HomeBusinessBand() {
  const t = useTranslations("Home.Business");

  return (
    <section className="bg-tuggi-bg py-14 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white rounded-3xl border border-gray-200 px-8 py-8 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-tuggi-dark mb-2">{t("title")}</h2>
            <p className="text-tuggi-slate leading-relaxed">{t("body")}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 lg:gap-8 shrink-0">
            <Link
              href="/enterprise/fleets"
              onClick={() => sendGAEvent({ event: "click_enterprise_fork", value: "b2b_fleets" })}
              className="group inline-flex items-center gap-2 font-semibold text-tuggi-primary-text hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2 rounded"
            >
              <span>{t("fleetsLink")}</span>
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 transition-transform"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/enterprise/city-os"
              onClick={() => sendGAEvent({ event: "click_enterprise_fork", value: "b2g_city_os" })}
              className="group inline-flex items-center gap-2 font-semibold text-tuggi-primary-text hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2 rounded"
            >
              <span>{t("cityOsLink")}</span>
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 transition-transform"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
