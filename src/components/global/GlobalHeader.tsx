"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";

export function GlobalHeader({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("Header");
  const pathname = usePathname();

  const locales = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "pt-br", label: "PT-BR" },
    { code: "pt-pt", label: "PT-PT" },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-tuggi-bg border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" aria-label="Main Navigation">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-tuggi-primary focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm">
            TUGGI
          </Link>
        </div>

        {/* Center: Navigation */}
        <div className="hidden md:flex space-x-8">
          <Link href="/" className="text-sm font-semibold text-tuggi-slate hover:text-tuggi-primary transition-colors focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm">
            {t("navPlatform")}
          </Link>
          <Link href="/purpose" className="text-sm font-semibold text-tuggi-slate hover:text-tuggi-primary transition-colors focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm">
            {t("navPurpose")}
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-6">
          <div className="relative group">
            <button className="text-sm font-bold text-tuggi-slate hover:text-tuggi-primary uppercase flex items-center focus:outline-none focus:ring-2 focus:ring-tuggi-primary rounded-sm" aria-haspopup="true">
              {currentLocale} ▼
            </button>
            <div className="absolute right-0 mt-2 w-24 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <ul className="py-1">
                {locales.map((loc) => (
                  <li key={loc.code}>
                    <Link
                      href={pathname}
                      locale={loc.code as any}
                      className={`block px-4 py-2 text-sm font-semibold ${
                        currentLocale === loc.code ? "text-tuggi-primary bg-gray-50" : "text-tuggi-slate hover:bg-gray-50 hover:text-tuggi-primary"
                      } focus:outline-none focus:bg-gray-50`}
                    >
                      {loc.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button className="px-5 py-2.5 bg-tuggi-secondary text-white text-sm font-semibold rounded-md shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-tuggi-secondary focus:ring-offset-2">
            {t("downloadApp")}
          </button>
        </div>
      </nav>
    </header>
  );
}
