"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { ChevronDown, Menu, X, Smartphone } from "lucide-react";
import { VISIBLE_NAV_ITEMS } from "@/lib/nav";
import type { SiteLocale } from "@/i18n/locales";

export function GlobalHeader({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("Header");
  // Accessible names for the landmarks and the icon-only controls below.
  // They used to be English string literals inside pt, es and it documents —
  // a screen reader announced them with the page's voice (SC 3.1.2).
  const tA11y = useTranslations("A11y");
  // With `pathnames` declared, this is the INTERNAL pathname ("/destinations"),
  // not the URL the visitor sees — which is exactly what the locale switcher
  // needs: `<Link locale>` re-resolves the slug for the target language.
  const pathname = usePathname();
  const params = useParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocaleOpen, setIsLocaleOpen] = useState(false);

  const locales: { code: SiteLocale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "pt", label: "PT" },
    { code: "it", label: "IT" },
  ];

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsLocaleOpen(false);
  }, [pathname]);

  // Handle click outside to close the locale dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setIsLocaleOpen(false);
      }
    };
    if (isLocaleOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLocaleOpen]);

  return (
    <>
      <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        {/* These two landmark names are still English literals, and that is a known
            open finding (SC 3.1.2), not an oversight. tests/e2e/routing.spec.ts
            locates the desktop row and the mobile panel by
            `nav[aria-label="Main Navigation"]` / `"Mobile Navigation"` to assert
            they list the same destinations; translating them turns one of those
            assertions red and — worse — makes the "no unpublished item in the
            menu" one pass against an empty locator. Moving that spec to a
            data-* hook is `qa`'s call, and the translated names go in with it.
            The icon-only controls below do not have that coupling and are
            already translated. */}
        <nav className="page-shell h-20 flex items-center justify-between" aria-label="Main Navigation">

          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-tuggi-primary-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg"
              aria-label={isMobileMenuOpen ? tA11y("closeMenu") : tA11y("openMenu")}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm flex items-center transform transition-transform active:scale-95">
              <Image
                src="/images/logo_tuggi_full.png"
                alt="TUGGI Logo"
                width={98}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Center: Navigation (Desktop) — the same registry the panel below
              renders, so the two widths cannot drift apart again. */}
          <div className="hidden lg:flex items-center gap-8">
            {VISIBLE_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-nav-item={item.labelKey}
                className="text-sm font-semibold text-slate-600 hover:text-tuggi-primary-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm py-2 whitespace-nowrap"
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Locale Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLocaleOpen(!isLocaleOpen)}
                className="text-sm font-bold text-slate-500 hover:text-tuggi-primary-text uppercase flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg px-2 py-1.5 transition-colors"
                aria-expanded={isLocaleOpen}
              >
                <span>{currentLocale.toUpperCase()}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isLocaleOpen ? 'rotate-180 text-tuggi-primary' : ''}`} />
              </button>
              <div className={`absolute right-0 mt-3 w-36 bg-white border border-gray-100 rounded-2xl shadow-2xl transition-all duration-200 z-50 overflow-hidden ${isLocaleOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1'}`}>
                <div className="p-1">
                  {locales.map((loc) => (
                    <Link
                      key={loc.code}
                      // @ts-expect-error -- next-intl validates that `params`
                      // match the `pathname`; on the current route they always
                      // do, so the runtime check is the one that matters. This
                      // is the documented locale-switcher pattern for a routing
                      // config with `pathnames`.
                      href={{ pathname, params }}
                      locale={loc.code}
                      onClick={() => {
                        document.cookie = `NEXT_LOCALE=${loc.code}; path=/; max-age=31536000`;
                        setIsLocaleOpen(false);
                      }}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                        currentLocale === loc.code
                          ? "text-tuggi-primary bg-blue-50/50"
                          : "text-slate-600 hover:bg-slate-50 hover:text-tuggi-primary-text"
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
              href="/download"
              className="hidden sm:block bg-tuggi-secondary text-tuggi-dark font-bold rounded-xl px-7 py-3 hover:bg-tuggi-secondary-hover transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 active:scale-95"
            >
              {t("downloadApp")}
            </Link>

            <Link
              href="/download"
              className="sm:hidden bg-tuggi-secondary text-tuggi-dark p-3 rounded-xl hover:bg-tuggi-secondary-hover transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark active:scale-95"
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-white z-[110] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col h-full ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
            <Image
              src="/images/logo_tuggi_full.png"
              alt="TUGGI Logo"
              width={86}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-lg"
            aria-label={tA11y("closeMenu")}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto bg-white py-4">
          <nav className="flex flex-col" aria-label="Mobile Navigation">
            {VISIBLE_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-nav-item={item.labelKey}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-6 py-5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-50 transition-colors"
              >
                <span>{t(item.labelKey)}</span>
                <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Corporate CTA Footer */}
        <div className="p-6 bg-slate-50 border-t border-gray-100 shrink-0">
          <Link
            href="/download"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 bg-tuggi-secondary text-tuggi-dark font-bold rounded-xl px-6 py-4 text-sm transition-all hover:bg-tuggi-secondary-hover shadow-lg shadow-orange-500/10 active:scale-[0.98]"
          >
            <Smartphone className="w-4 h-4" />
            {t("downloadApp")}
          </Link>
        </div>
      </div>
    </>
  );
}
