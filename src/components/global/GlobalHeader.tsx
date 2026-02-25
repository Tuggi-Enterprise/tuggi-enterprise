"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { ChevronDown, Menu, X, Globe, Smartphone, Building2, Cpu, Compass } from "lucide-react";

export function GlobalHeader({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("Header");
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocaleOpen, setIsLocaleOpen] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);

  const locales = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "pt-br", label: "PT-BR" },
    { code: "pt-pt", label: "PT-PT" },
  ];

  // Safeguard: Ensure pathname is completely stripped of any leftover locale prefix
  const cleanPathname = pathname.replace(/^\/(?:en|es|pt-br|pt-pt)(?=\/|$)/, "") || "/";

  // Close menus on resize or route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsLocaleOpen(false);
    setIsPlatformOpen(false);
  }, [pathname]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setIsLocaleOpen(false);
        setIsPlatformOpen(false);
      }
    };
    if (isLocaleOpen || isPlatformOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLocaleOpen, isPlatformOpen]);

  return (
    <>
      <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between" aria-label="Main Navigation">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-lg"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-sm flex items-center transform transition-transform active:scale-95">
              <Image
                src="/images/logo_tuggi_full.png"
                alt="TUGGI Logo"
                width={140}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Center: Navigation (Desktop) */}
          <div className="hidden md:flex items-center gap-10">
            
            {/* Dropdown for Platform */}
            <div className="relative group">
              <button
                onClick={() => setIsPlatformOpen(!isPlatformOpen)}
                onMouseEnter={() => setIsPlatformOpen(true)}
                className="text-sm font-semibold text-slate-600 hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-sm py-2 flex items-center gap-1.5"
                aria-haspopup="true"
                aria-expanded={isPlatformOpen}
              >
                <span>{t("navPlatform")}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isPlatformOpen ? 'rotate-180 text-tuggi-primary' : ''}`} />
              </button>
              <div 
                onMouseLeave={() => setIsPlatformOpen(false)}
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl transition-all duration-200 z-50 overflow-hidden ${isPlatformOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1'}`}
              >
                <div className="p-2 space-y-1">
                  <Link href="/enterprise/city-os" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    {t("navCityOs")}
                  </Link>
                  <Link href="/enterprise/fleets" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    {t("navFleets")}
                  </Link>
                  <Link href="/technology" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                      <Cpu className="w-4 h-4" />
                    </div>
                    {t("navTech")}
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/drive" className="text-sm font-semibold text-slate-600 hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-sm py-2">
              {t("navB2c")}
            </Link>

            <Link href="/purpose" className="text-sm font-semibold text-slate-600 hover:text-tuggi-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-sm py-2">
              {t("navPurpose")}
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Locale Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsLocaleOpen(!isLocaleOpen)}
                className="text-sm font-bold text-slate-500 hover:text-tuggi-primary uppercase flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-lg px-2 py-1.5 transition-colors"
                aria-expanded={isLocaleOpen}
              >
                <span>{currentLocale === 'pt-br' ? 'PT-BR' : currentLocale.toUpperCase()}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isLocaleOpen ? 'rotate-180 text-tuggi-primary' : ''}`} />
              </button>
              <div className={`absolute right-0 mt-3 w-36 bg-white border border-gray-100 rounded-2xl shadow-2xl transition-all duration-200 z-50 overflow-hidden ${isLocaleOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1'}`}>
                <div className="p-1">
                  {locales.map((loc) => (
                    <Link
                      key={loc.code}
                      href={cleanPathname}
                      locale={loc.code as "en" | "es" | "pt-br" | "pt-pt"}
                      onClick={() => {
                        document.cookie = `NEXT_LOCALE=${loc.code}; path=/; max-age=31536000`;
                        setIsLocaleOpen(false);
                      }}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                        currentLocale === loc.code 
                          ? "text-tuggi-primary bg-blue-50/50" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary"
                      }`}
                    >
                      {loc.label}
                      {currentLocale === loc.code && <div className="w-1.5 h-1.5 rounded-full bg-tuggi-primary" />}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link 
              href="/drive" 
              className="hidden sm:block bg-[#FF6F00] text-white font-bold rounded-xl px-7 py-3 hover:bg-[#E65F00] transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F00] focus:ring-offset-2 active:scale-95"
            >
              {t("downloadApp")}
            </Link>
            
            <Link 
              href="/drive" 
              className="sm:hidden bg-[#FF6F00] text-white p-3 rounded-xl hover:bg-[#E65F00] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F00] active:scale-95"
              aria-label={t("downloadApp")}
            >
              <Smartphone className="w-5 h-5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div 
        className={`fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-white z-[110] shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col h-full ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
            <Image
              src="/images/logo_tuggi_full.png"
              alt="TUGGI Logo"
              width={110}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-lg"
            aria-label="Close Menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto bg-white py-4">
          <nav className="flex flex-col">
            <Link 
              href="/enterprise/city-os" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-6 py-5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
            >
              <span>{t("navCityOs")}</span>
              <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
            </Link>
            <Link 
              href="/enterprise/fleets" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-6 py-5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
            >
              <span>{t("navFleets")}</span>
              <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
            </Link>
            <Link 
              href="/technology" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-6 py-5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
            >
              <span>{t("navTech")}</span>
              <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
            </Link>
            <Link 
              href="/drive" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-6 py-5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
            >
              <span>{t("navB2c")}</span>
              <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
            </Link>
            <Link 
              href="/purpose" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-6 py-5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
            >
              <span>{t("navPurpose")}</span>
              <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
            </Link>
            <Link 
              href="/contact" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-6 py-5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
            >
              <span>{t("navContact")}</span>
              <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
            </Link>
          </nav>
        </div>

        {/* Corporate CTA Footer */}
        <div className="p-6 bg-slate-50 border-t border-gray-100 shrink-0">
          <Link 
            href="/drive" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 bg-[#FF6F00] text-white font-bold rounded-xl px-6 py-4 text-sm transition-all hover:bg-[#E65F00] shadow-lg shadow-orange-500/10 active:scale-[0.98]"
          >
            <Smartphone className="w-4 h-4" />
            {t("downloadApp")}
          </Link>
        </div>
      </div>
    </>
  );
}
