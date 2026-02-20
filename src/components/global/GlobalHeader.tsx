"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

export function GlobalHeader({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("Header");
  const pathname = usePathname();

  const locales = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "pt-br", label: "PT-BR" },
    { code: "pt-pt", label: "PT-PT" },
  ];

  // Safeguard: Ensure pathname is completely stripped of any leftover locale prefix
  const cleanPathname = pathname.replace(/^\/(?:en|es|pt-br|pt-pt)(?=\/|$)/, "") || "/";

  return (
    <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" aria-label="Main Navigation">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm flex items-center">
            <Image
              src="/tuggi-logos/logo_tuggi_full.png"
              alt="TUGGI Logo"
              width={140}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Center: Navigation */}
        <div className="hidden md:flex items-center gap-8">
          
          {/* Dropdown for Platform */}
          <div className="relative group/platform">
            <button
              className="text-sm font-medium text-slate-600 hover:text-tuggi-dark transition-colors focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm py-2 flex items-center gap-1"
              aria-haspopup="true"
            >
              <span>{t("navPlatform")}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover/platform:text-tuggi-dark transition-colors" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-lg shadow-lg opacity-0 invisible group-hover/platform:opacity-100 group-hover/platform:visible transition-all duration-200 z-50 overflow-hidden">
              <ul className="py-2">
                <li>
                  <Link href="/enterprise/city-os" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary transition-colors focus:outline-none focus:bg-slate-50">
                    {t("navCityOs")}
                  </Link>
                </li>
                <li>
                  <Link href="/enterprise/fleets" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary transition-colors focus:outline-none focus:bg-slate-50">
                    {t("navFleets")}
                  </Link>
                </li>
                <li>
                  <Link href="/technology" className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary transition-colors focus:outline-none focus:bg-slate-50">
                    {t("navTech")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <Link href="/drive" className="text-sm font-medium text-slate-600 hover:text-tuggi-dark transition-colors focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm py-2">
            {t("navB2c")}
          </Link>

          <Link href="/purpose" className="text-sm font-medium text-slate-600 hover:text-tuggi-dark transition-colors focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm py-2">
            {t("navPurpose")}
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-6">
          <div className="relative group">
            <button className="text-sm font-medium text-slate-600 hover:text-tuggi-dark uppercase flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm" aria-haspopup="true">
              <span>{currentLocale}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-tuggi-dark transition-colors" />
            </button>
            <div className="absolute right-0 mt-2 w-28 bg-white border border-gray-100 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
              <ul className="py-1">
                {locales.map((loc) => (
                  <li key={loc.code}>
                    <Link
                      href={cleanPathname}
                      locale={loc.code as "en" | "es" | "pt-br" | "pt-pt"}
                      className={`block px-4 py-2 text-sm font-medium ${
                        currentLocale === loc.code ? "text-tuggi-primary bg-slate-50" : "text-slate-600 hover:bg-slate-50 hover:text-tuggi-dark"
                      } focus:outline-none focus:bg-slate-50 transition-colors`}
                    >
                      {loc.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Link href="/drive" className="bg-[#FF6F00] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-[#e66400] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F00] focus:ring-offset-2">
            {t("downloadApp")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
