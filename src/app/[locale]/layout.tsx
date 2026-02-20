import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("rootTitle"),
    description: t("rootDescription"),
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.className}>
      <body className="bg-white text-[#0B1220] antialiased">
        <NextIntlClientProvider messages={messages}>
          <header className="fixed top-0 w-full z-50 bg-[#F7F9FC] border-b border-gray-200 shadow-sm">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" aria-label="Main Navigation">
              <div className="text-2xl font-bold tracking-tight text-[#00A8E8]">
                TUGGI
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-[#5B6472]" aria-label="Language Selector">EN | ES | PT-BR | PT-PT</span>
              </div>
            </nav>
          </header>
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <footer className="bg-[#F7F9FC] border-t border-gray-200 py-12 text-[#5B6472]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-[#0B1220] text-lg font-semibold tracking-tight mb-4">TUGGI</h3>
                <p className="text-base leading-relaxed">Advanced territorial governance & audio tech.</p>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
