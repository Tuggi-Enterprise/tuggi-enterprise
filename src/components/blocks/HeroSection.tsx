"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function HeroSection() {
  const t = useTranslations("Home.Hero");

  return (
    <section className="relative w-full py-24 lg:py-32 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0B1220] mb-6 leading-tight">
          {t("title")}
        </h1>
        <p className="text-xl md:text-2xl text-[#5B6472] mb-10 max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>
        <div 
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          style={{ display: 'flex', flexDirection: 'row', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link
            href="/drive"
            className="px-8 py-4 bg-[#FF6F00] text-white font-semibold rounded-md shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#FF6F00] focus:ring-offset-2 w-full sm:w-auto text-center"
          >
            {t("downloadApp")}
          </Link>
          <Link
            href="/contact"
            className="px-8 py-4 bg-transparent border-2 border-[#00A8E8] text-[#007AA5] font-semibold rounded-md hover:bg-[#00A8E8] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A8E8] focus:ring-offset-2 w-full sm:w-auto text-center"
          >
            {t("contactSales")}
          </Link>
        </div>
      </div>
    </section>
  );
}
