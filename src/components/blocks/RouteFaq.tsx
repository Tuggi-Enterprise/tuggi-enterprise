"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

interface RouteFaqProps {
  items: FaqItem[];
}

/**
 * Accessible FAQ using native <details>/<summary> (keyboard + no-JS friendly).
 * The same Q&A is emitted as FAQPage JSON-LD by the page for rich results.
 */
export function RouteFaq({ items }: RouteFaqProps) {
  const t = useTranslations("Tours");
  if (!items.length) return null;

  return (
    <section className="py-16 bg-tuggi-bg" aria-labelledby="faq-heading">
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 id="faq-heading" className="text-3xl md:text-4xl font-black text-tuggi-dark mb-8">
          {t("faqTitle")}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-gray-100 bg-white p-5"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-tuggi-dark">
                {item.question}
                <ChevronDown className="w-5 h-5 text-tuggi-primary transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-tuggi-slate leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
