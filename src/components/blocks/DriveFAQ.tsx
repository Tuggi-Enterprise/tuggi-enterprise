"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function DriveFAQ() {
  const t = useTranslations("Drive.FAQ");

  const items = [1, 2, 3, 4, 5, 6] as const;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 bg-white border-t border-gray-100">
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
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary focus-visible:ring-offset-2 rounded-2xl"
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
                    {t(`a${i}`)}
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
