"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";
import { PRODUCT_FACTS } from "@/lib/product-facts";

/**
 * Accessible FAQ accordion driven by a next-intl namespace with enumerated
 * keys: `title`, `q1..qN`, `a1..aN`. Pair it with a FAQPage JSON-LD built from
 * the same keys (see drive/page.tsx and page.tsx) for AI/search citation.
 *
 * `analyticsId` is opt-in and card #306 is the first caller — hypothesis 4 of
 * §7 of the conversion spec, and the only instrumentation on the partner funnel
 * that says **which** anxiety stops it instead of guessing. Absent means no
 * event and identical behaviour, which is what keeps the home and `/drive`
 * untouched by this card.
 */
export function FaqSection({
  namespace,
  count,
  analyticsId,
}: {
  namespace: string;
  count: number;
  analyticsId?: string;
}) {
  const t = useTranslations(namespace);
  const items = Array.from({ length: count }, (_, i) => i + 1);
  const [open, setOpen] = useState<number | null>(null);

  function toggle(index: number, isOpen: boolean) {
    setOpen(isOpen ? null : index);
    // Opening is the signal; closing is not. A question nobody opens comes off
    // the list, and the most opened one moves up into the body of the page.
    if (!isOpen && analyticsId) {
      sendGAEvent({ event: "faq_open", analytics_id: analyticsId, question: index });
    }
  }

  return (
    <section data-block="faq" className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-12 text-center">
          {t("title")}
        </h2>

        <dl className="flex flex-col gap-4">
          {items.map((i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all duration-200 ${
                  isOpen
                    ? "border-tuggi-primary/40 bg-tuggi-bg shadow-sm"
                    : "border-gray-200 bg-white hover:border-tuggi-primary/20"
                }`}
              >
                <dt>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => toggle(i, isOpen)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2 rounded-2xl"
                  >
                    <span className="text-base font-bold text-tuggi-dark leading-snug">
                      {t(`q${i}`)}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-5 h-5 flex-shrink-0 text-tuggi-primary transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </dt>
                <dd
                  id={`faq-answer-${i}`}
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <p className="px-6 pb-5 text-slate-600 leading-relaxed text-sm">
                    {t(`a${i}`, PRODUCT_FACTS)}
                  </p>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
