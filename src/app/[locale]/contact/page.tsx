import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("contactTitle");
  const description = t("contactDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "contact"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath: "contact" }),
    twitter: buildTwitterCard({ title, description }),
  };
}

import { ContactRouter } from "@/components/blocks/ContactRouter";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="min-h-screen">
      <ContactRouter />
    </article>
  );
}
