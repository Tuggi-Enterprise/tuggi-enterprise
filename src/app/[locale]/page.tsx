import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
  };
}

import { HeroSection } from "@/components/blocks/HeroSection";
import { TriggerSimulator } from "@/components/blocks/TriggerSimulator";
import { EnterpriseFork } from "@/components/blocks/EnterpriseFork";

export default async function HomePage() {

  return (
    <>
      <HeroSection />
      <TriggerSimulator />
      <EnterpriseFork />
    </>
  );
}
