import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  // Re-declare the brand template here: a plain-string `title` in this nested
  // layout would suppress the root "%s | TUGGI" template for the legal pages
  // below it, leaving them brandless. This keeps their titles brand-free in the
  // messages while the template still appends "| TUGGI".
  return {
    title: {
      template: "%s | TUGGI",
      default: t("trustCenterTitle"),
    },
  };
}

// FORCE STATIC GENERATION for massive text pages
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export const dynamic = 'force-static';

export default async function TrustCenterLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.Sidebar" });

  // A <div>, not a <main>: the root layout already opens `<main
  // id="main-content">` around every page, so this one nested a second
  // landmark of the same role inside it — on the very page where the site
  // declares WCAG conformance (SC 1.3.1).
  //
  // The sidebar label is a <p>, not an <h2>: as a heading it came before the
  // page's own <h1> in document order, which put the heading tree out of
  // sequence on all five legal pages (SC 1.3.1 / 2.4.6). `aria-labelledby`
  // gives the nav its accessible name from the same, already translated
  // string — the old aria-label was hardcoded English inside pt/es/it
  // documents (SC 3.1.2).
  const navLabelId = "trust-center-nav-label";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col md:flex-row gap-10">
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="sticky top-24 flex flex-col gap-2 p-4 bg-tuggi-bg rounded-md border border-gray-200 shadow-sm" aria-labelledby={navLabelId}>
          <p id={navLabelId} className="text-xs font-bold uppercase tracking-wider text-tuggi-slate mb-3">{t("title")}</p>
          <Link href="/trust-center/terms-of-use" className="text-tuggi-dark hover:text-tuggi-primary-text block py-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm">{t("terms")}</Link>
          <Link href="/trust-center/privacy-policy" className="text-tuggi-dark hover:text-tuggi-primary-text block py-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm">{t("privacy")}</Link>
          <Link href="/trust-center/data-deletion" className="text-tuggi-dark hover:text-tuggi-primary-text block py-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm">{t("deletion")}</Link>
          <Link href="/trust-center/security-sla" className="text-tuggi-dark hover:text-tuggi-primary-text block py-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm">{t("security")}</Link>
          <Link href="/trust-center/accessibility" className="text-tuggi-dark hover:text-tuggi-primary-text block py-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-sm">{t("accessibility")}</Link>
        </nav>
      </aside>
      <section className="flex-1 bg-white p-8 md:p-12 rounded-md shadow-sm border border-gray-200 text-tuggi-dark">
        {children}
      </section>
    </div>
  );
}
