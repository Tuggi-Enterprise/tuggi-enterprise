import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function FatFooter() {
  const t = useTranslations("Footer");

  return (
    <footer className="bg-tuggi-dark text-tuggi-slate py-16 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Column 1: TUGGI Drive (B2C) */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-white text-lg font-semibold tracking-tight uppercase">
              {t("driveB2c")}
            </h3>
            <Link href="/drive" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("appDownload")}
            </Link>
            <Link href="/drive" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("plans")}
            </Link>
          </div>

          {/* Column 2: Enterprise (B2B/B2G) */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-white text-lg font-semibold tracking-tight uppercase">
              {t("enterprise")}
            </h3>
            <Link href="/enterprise/city-os" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("cityOs")}
            </Link>
            <Link href="/enterprise/fleets" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("fleets")}
            </Link>
            <Link href="/technology" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("technology")}
            </Link>
          </div>

          {/* Column 3: Institutional */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-white text-lg font-semibold tracking-tight uppercase">
              {t("institutional")}
            </h3>
            <Link href="/purpose" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("ourPurpose")}
            </Link>
            <Link href="/contact" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("contact")}
            </Link>
          </div>

          {/* Column 4: Trust Center & Compliance */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-white text-lg font-semibold tracking-tight uppercase">
              {t("trustCenter")}
            </h3>
            <Link href="/trust-center/terms-of-use" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("terms")}
            </Link>
            <Link href="/trust-center/privacy-policy" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("privacy")}
            </Link>
            <Link href="/trust-center/accessibility" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("accessibility")}
            </Link>
            <Link href="/trust-center/security-sla" className="text-sm hover:text-tuggi-primary transition-colors focus:ring-2 focus:ring-tuggi-primary focus:outline-none rounded-sm w-max">
              {t("security")}
            </Link>
          </div>
          
        </div>

        <div className="mt-16 pt-8 border-t border-gray-800 text-sm">
          <p>© {new Date().getFullYear()} TUGGI Technologies. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
