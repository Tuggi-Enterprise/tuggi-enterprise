import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("contactTitle"),
    description: t("contactDescription"),
  };
}

import { ContactRouter } from "@/components/blocks/ContactRouter";

export default async function ContactPage() {
  return (
    <article className="min-h-screen">
      <ContactRouter />
    </article>
  );
}
