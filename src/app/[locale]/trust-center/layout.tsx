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
  return {
    title: t("trustCenterTitle"),
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col md:flex-row gap-10">
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="sticky top-24 flex flex-col gap-2 p-4 bg-[#F7F9FC] rounded-md border border-gray-200 shadow-sm" aria-label="Legal Navigation">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5B6472] mb-3">Legal & Compliance</h2>
          <Link href="/trust-center/terms-of-use" locale={locale} className="text-[#0B1220] hover:text-[#00A8E8] block py-2 font-semibold transition-colors focus:ring-2 focus:ring-[#00A8E8] focus:outline-none rounded-sm">Terms of Use</Link>
          <Link href="/trust-center/privacy-policy" locale={locale} className="text-[#0B1220] hover:text-[#00A8E8] block py-2 font-semibold transition-colors focus:ring-2 focus:ring-[#00A8E8] focus:outline-none rounded-sm">Privacy Policy</Link>
          <Link href="/trust-center/data-deletion" locale={locale} className="text-[#0B1220] hover:text-[#00A8E8] block py-2 font-semibold transition-colors focus:ring-2 focus:ring-[#00A8E8] focus:outline-none rounded-sm">Data Deletion</Link>
          <Link href="/trust-center/security-sla" locale={locale} className="text-[#0B1220] hover:text-[#00A8E8] block py-2 font-semibold transition-colors focus:ring-2 focus:ring-[#00A8E8] focus:outline-none rounded-sm">Security SLA</Link>
          <Link href="/trust-center/accessibility" locale={locale} className="text-[#0B1220] hover:text-[#00A8E8] block py-2 font-semibold transition-colors focus:ring-2 focus:ring-[#00A8E8] focus:outline-none rounded-sm">Accessibility</Link>
        </nav>
      </aside>
      <section className="flex-1 bg-white p-8 md:p-12 rounded-md shadow-sm border border-gray-200 text-[#0B1220]">
        {children}
      </section>
    </main>
  );
}
