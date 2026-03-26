"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PartnerHero } from "./PartnerHero";

import { useTranslations } from "next-intl";

function PartnerHeroContent({ partnerData }: { partnerData: any }) {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("ID") || searchParams.get("p") || searchParams.get("partner_id") || undefined;

  return <PartnerHero partnerId={partnerId} partnerData={partnerData} />;
}

export function PartnerHeroWrapper({ partnerData }: { partnerData: any }) {
  const t = useTranslations("Download");
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">{t("loading")}</div>}>
      <PartnerHeroContent partnerData={partnerData} />
    </Suspense>
  );
}
