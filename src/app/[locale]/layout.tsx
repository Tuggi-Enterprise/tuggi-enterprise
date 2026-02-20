import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Viewport } from "next";
import { GlobalHeader } from "@/components/global/GlobalHeader";
import { FatFooter } from "@/components/global/FatFooter";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  themeColor: "#0B1220",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("rootTitle"),
    description: t("rootDescription"),
    icons: {
      icon: [
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/site.webmanifest",
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

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.className}>
      <body className="bg-white text-[#0B1220] antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <GlobalHeader currentLocale={locale} />
          <main className="min-h-screen bg-tuggi-bg">
            {children}
          </main>
          <FatFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
