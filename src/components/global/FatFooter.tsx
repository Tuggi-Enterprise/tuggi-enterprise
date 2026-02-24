import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";

export function FatFooter() {
  const t = useTranslations("Footer");

  return (
    <footer className="bg-tuggi-dark text-tuggi-slate border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Logo & Manifesto column */}
          <div className="lg:col-span-4 flex flex-col space-y-6 lg:pr-8">
            <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-sm w-max">
              <Image 
                src="/images/logo_tuggi_full_white.png" 
                alt="TUGGI Logo White" 
                width={150} 
                height={32} 
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              The Cultural Copilot for Drivers. 100% Hands-Free Contextual Routing.
            </p>
          </div>

          {/* Column 1: TUGGI Drive (B2C) */}
          <div className="lg:col-span-2 flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-white uppercase mb-6">
              {t("driveB2c")}
            </h3>
            <Link href="/drive" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("appDownload")}
            </Link>
            <Link href="/drive" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("plans")}
            </Link>
            <div className="flex flex-col gap-3 mt-6">
              <a 
                href="https://apps.apple.com/app/tuggi-drive/id6744379818"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-lg w-max"
              >
                <Image 
                  src="/images/badges/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={120}
                  height={35}
                  className="h-9 w-auto"
                />
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=com.tuggidrive.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary rounded-lg w-max"
              >
                <Image 
                  src="/images/badges/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={120}
                  height={35}
                  className="h-9 w-auto"
                />
              </a>
            </div>
          </div>

          {/* Column 2: Enterprise (B2B/B2G) */}
          <div className="lg:col-span-2 flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-white uppercase mb-6">
              {t("enterprise")}
            </h3>
            <Link href="/enterprise/city-os" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("cityOs")}
            </Link>
            <Link href="/enterprise/fleets" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("fleets")}
            </Link>
            <Link href="/technology" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("technology")}
            </Link>
          </div>

          {/* Column 3: Institutional */}
          <div className="lg:col-span-2 flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-white uppercase mb-6">
              {t("institutional")}
            </h3>
            <Link href="/purpose" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("ourPurpose")}
            </Link>
            <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("contact")}
            </Link>
          </div>

          {/* Column 4: Trust Center & Compliance */}
          <div className="lg:col-span-2 flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-white uppercase mb-6">
              {t("trustCenter")}
            </h3>
            <Link href="/trust-center/terms-of-use" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("terms")}
            </Link>
            <Link href="/trust-center/privacy-policy" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("privacy")}
            </Link>
            <Link href="/trust-center/accessibility" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("accessibility")}
            </Link>
            <Link href="/trust-center/security-sla" className="text-sm text-slate-400 hover:text-white transition-colors duration-200 block mb-3 focus-visible:ring-2 focus-visible:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("security")}
            </Link>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col items-center sm:items-start space-y-4">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            © {new Date().getFullYear()} TUGGI Technologies. All rights reserved.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs text-slate-600 font-medium text-center sm:text-left">
            <p>CNPJ: 64.539.859/0001-56</p>
            <p className="hidden sm:block text-slate-700">•</p>
            <p>Rua PAIS LEME, 215 - CONJ 1713 - Pinheiros - São Paulo, BR</p>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
