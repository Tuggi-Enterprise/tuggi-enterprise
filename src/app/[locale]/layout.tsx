import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import { GlobalHeader } from "@/components/global/GlobalHeader";
import { FatFooter } from "@/components/global/FatFooter";
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
          <GlobalHeader currentLocale={locale} />
          <main className="min-h-screen pt-16 bg-tuggi-bg">
            {children}
          </main>
          <FatFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
