import { getTranslations } from "next-intl/server";
import { TechHero } from "@/components/blocks/TechHero";
import { TechEngine } from "@/components/blocks/TechEngine";
import { TechOffline } from "@/components/blocks/TechOffline";
import { TechAPI } from "@/components/blocks/TechAPI";
import { TechData } from "@/components/blocks/TechData";
import { TechGovernance } from "@/components/blocks/TechGovernance";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("techTitle"),
    description: t("techDescription"),
  };
}

export default async function TechnologyPage() {
  return (
    <article className="min-h-screen">
      <TechHero />
      <TechEngine />
      <TechOffline />
      <TechAPI />
      <TechData />
      <TechGovernance />
    </article>
  );
}
