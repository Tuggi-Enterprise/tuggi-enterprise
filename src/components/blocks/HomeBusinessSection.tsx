"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

/**
 * "TUGGI para o seu negócio" — item 8 of the home, spec §6.1 (card #194).
 *
 * It was `HomeBusinessBand`: a thin grey strip, deliberately quiet so it would
 * never compete with the B2C story. That was the right call while it sat at the
 * bottom of a page nobody read to the end, and it is the wrong one now — this
 * is **the only B2B entrance on the site's highest-traffic page**, and a
 * partner who never sees it is a partner who never distributes (BR-B2B-004: the
 * partner brings the traveller). So it gets room, and the two destinations stop
 * being two text links at the end of a sentence and become the two things there
 * are to choose between.
 *
 * **No new claim is made here.** The section says what it already said — the
 * heading, the one line under it and the two labels — because what a public
 * surface may assert to a partner is a closed list (BR-B2B-007) and copy is the
 * `design`'s. What changed is how much of the page it occupies, which is form.
 *
 * The GA events keep the names they had since the `EnterpriseFork` this block
 * replaced twice over (`click_enterprise_fork`, `b2b_fleets` / `b2g_city_os`):
 * renaming them would split one series into two with nothing marking where.
 */

const DESTINATIONS = [
  { href: "/enterprise/fleets", labelKey: "fleetsLink", event: "b2b_fleets" },
  { href: "/destinations", labelKey: "cityOsLink", event: "b2g_city_os" },
] as const;

export function HomeBusinessSection() {
  const t = useTranslations("Home.Business");

  return (
    <section data-block="business" className="bg-tuggi-bg py-20 lg:py-24">
      <div className="page-shell">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-tuggi-slate leading-relaxed">{t("body")}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {DESTINATIONS.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              onClick={() =>
                sendGAEvent({ event: "click_enterprise_fork", value: destination.event })
              }
              // The whole card is the target, not a link at the end of it
              // (DS-A11Y-002): on a phone the card is the only comfortable
              // 44 px there is. Hover is a lift, and reduced motion keeps it
              // still.
              className="group flex items-center justify-between gap-6 rounded-3xl border border-gray-200 bg-white px-8 py-8 shadow-sm transition-transform duration-150 hover:-translate-y-1 motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2"
            >
              <span className="text-xl font-bold text-tuggi-dark leading-snug">
                {t(destination.labelKey)}
              </span>
              <ArrowRight
                className="w-6 h-6 shrink-0 text-tuggi-primary-text transition-transform group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
