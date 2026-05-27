"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PartnerHero } from "./PartnerHero";

import { useTranslations } from "next-intl";

function PartnerHeroContent({ partnerData, partnerId }: { partnerData: any; partnerId?: string }) {
  const searchParams = useSearchParams();
  // Prefer the explicitly resolved id (e.g. from /d/<slug>); fall back to the query string.
  const resolvedId =
    partnerId ||
    searchParams.get("ID") ||
    searchParams.get("p") ||
    searchParams.get("partner_id") ||
    undefined;

  return <PartnerHero partnerId={resolvedId} partnerData={partnerData} />;
}

export function PartnerHeroWrapper({ partnerData, partnerId }: { partnerData: any; partnerId?: string }) {
  const t = useTranslations("Download");
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">{t("loading")}</div>}>
      <PartnerHeroContent partnerData={partnerData} partnerId={partnerId} />
    </Suspense>
  );
}
