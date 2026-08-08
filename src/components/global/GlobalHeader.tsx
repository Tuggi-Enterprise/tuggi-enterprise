"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { ChevronDown, Menu, X, Smartphone } from "lucide-react";
import { VISIBLE_NAV_ITEMS } from "@/lib/nav";
import type { SiteLocale } from "@/i18n/locales";

/**
 * The stops a focus trap has to cycle through. Deliberately narrow: everything
 * the drawer renders is a link or a button, and a wider selector would start
 * catching things whose focusability depends on state we do not control.
 */
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const localeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  /**
   * Closing the drawer from inside it — the X, the backdrop, Escape — has to
   * hand the focus back to the control that opened it. Without this the drawer
   * goes `inert` under the focused element and the focus falls to <body>, so
   * the next Tab restarts at the top of the document (SC 2.4.3).
   *
   * A navigation is the one close that must NOT do it: the visitor is leaving
   * the page, and those call setIsMobileMenuOpen directly.
   */
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

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

  /**
   * SC 1.4.13, "dismissible": additional content that appears over the page has
   * to go away without moving the pointer, and Escape is the mechanism the
   * criterion names. The panel closes and the focus returns to its trigger —
   * dismissing it by dropping the focus to <body> would trade one failure for
   * another (SC 2.4.3).
   */
  useEffect(() => {
    if (!isLocaleOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsLocaleOpen(false);
      localeButtonRef.current?.focus();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isLocaleOpen]);

  /**
   * The drawer is a modal dialog, and this is the half of that promise the
   * markup cannot make on its own (audit finding 8, SC 2.4.3 and SC 2.4.7).
   *
   * `aria-modal` tells assistive technology to ignore what is behind the
   * dialog, but it does nothing to the Tab order: without a trap, Tab walks out
   * of the drawer into the links the backdrop covers, where the focus ring is
   * invisible. So: focus in on open, cycle at both edges, Escape closes, and
   * `inert` on the closed drawer keeps the off-screen copy of the menu out of
   * the Tab order at mobile widths — `-translate-x-full` never removed it.
   */
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const stops = () => Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
    stops()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const list = stops();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      const outside = !(active instanceof HTMLElement) || !drawer.contains(active);

      if (event.shiftKey ? active === first || outside : active === last || outside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen, closeMobileMenu]);

  return (
    <>
      <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        {/* `data-nav-scope` is the locator tests/e2e/routing.spec.ts uses to tell
            the desktop row from the mobile panel. It used to key off the two
            landmark names, which is why they stayed English literals long after
            the rest of the header was translated: a translated name turned one
            assertion red and made another pass against an empty locator. The
            hook is invariant across locales, so the names are free to be copy
            again — and the spec asserts the hook resolves to exactly one nav,
            which is what keeps "empty locator" from reading as "nothing to
            find".

            Neither name says "navigation". BR-COMUNICACAO-004 item 1 forbids
            that word as something Tuggi delivers (BR-MAPA-005), and the sweep
            in non-objective-sweep.spec.ts reads src/messages — so the English
            literals were invisible to it and the translated ones were not. The
            landmark role is announced anyway; the name does not have to repeat
            it. */}
        <nav
          data-nav-scope="desktop"
          className="page-shell h-20 flex items-center justify-between"
          aria-label={tA11y("mainMenu")}
        >

          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <button
              ref={menuButtonRef}
              data-menu-trigger
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-tuggi-primary-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg"
              aria-label={isMobileMenuOpen ? tA11y("closeMenu") : tA11y("openMenu")}
              aria-expanded={isMobileMenuOpen}
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
                ref={localeButtonRef}
                data-locale-trigger
                onClick={() => setIsLocaleOpen(!isLocaleOpen)}
                className="text-sm font-bold text-slate-500 hover:text-tuggi-primary-text uppercase flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg px-2 py-1.5 transition-colors"
                aria-expanded={isLocaleOpen}
              >
                <span>{currentLocale.toUpperCase()}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isLocaleOpen ? 'rotate-180 text-tuggi-primary' : ''}`} />
              </button>
              {/* `invisible` when closed is what keeps these four links out of
                  the Tab order, and the audit checked it on purpose — it is the
                  one thing about this dropdown that was already right. */}
              <div
                data-locale-panel
                className={`absolute right-0 mt-3 w-36 bg-white border border-gray-100 rounded-2xl shadow-2xl transition-all duration-200 z-50 overflow-hidden ${isLocaleOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1'}`}
              >
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
                      data-locale-selected={currentLocale === loc.code || undefined}
                      onClick={() => {
                        document.cookie = `NEXT_LOCALE=${loc.code}; path=/; max-age=31536000`;
                        setIsLocaleOpen(false);
                      }}
                      // DS-COR-002: brand cyan is a surface colour, and as ink
                      // it takes the darkened pair. `text-tuggi-primary` on
                      // `bg-blue-50/50` measures 2.57:1 — text-sm bold is not
                      // "large text" (the WCAG 2.2 floor is 18.66 px bold), so
                      // the minimum is 4.5:1. `-primary-text` on the same
                      // surface measures 4.64:1. The dot below stays: it is
                      // what keeps the selection from being colour alone.
                      className={`flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                        currentLocale === loc.code
                          ? "text-tuggi-primary-text bg-blue-50/50"
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
              href={{ pathname: "/d/[slug]", params: { slug: "tuggi" } }}
              data-download-cta="header-desktop"
              className="hidden sm:block bg-tuggi-secondary text-tuggi-dark font-bold rounded-xl px-7 py-3 hover:bg-tuggi-secondary-hover transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 active:scale-95"
            >
              {t("downloadApp")}
            </Link>

            <Link
              href={{ pathname: "/d/[slug]", params: { slug: "tuggi" } }}
              data-download-cta="header-compact"
              className="sm:hidden bg-tuggi-secondary text-tuggi-dark p-3 rounded-xl hover:bg-tuggi-secondary-hover transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark active:scale-95"
              aria-label={t("downloadApp")}
            >
              <Smartphone className="w-5 h-5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Backdrop — decorative. Its click is a shortcut, not the
          keyboard path out: that is Escape and the close button below. */}
      {isMobileMenuOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={tA11y("menu")}
        // The panel never leaves the DOM — it slides. `inert` is what makes the
        // closed, off-screen copy stop being tabbable at mobile widths, where
        // `lg:hidden` does not apply; `-translate-x-full` alone kept every link
        // in the Tab order behind the page.
        inert={!isMobileMenuOpen}
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
            onClick={closeMobileMenu}
            className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text"
            aria-label={tA11y("closeMenu")}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto bg-white py-4">
          <nav data-nav-scope="mobile" className="flex flex-col" aria-label={tA11y("sitePages")}>
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
            href={{ pathname: "/d/[slug]", params: { slug: "tuggi" } }}
            data-download-cta="header-drawer"
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
