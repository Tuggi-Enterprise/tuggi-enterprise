"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PartnerHero } from "./PartnerHero";

import { useTranslations } from "next-intl";

function PartnerHeroContent() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("p") || searchParams.get("partner_id") || undefined;

  return <PartnerHero partnerId={partnerId} />;
}

export function PartnerHeroWrapper() {
  const t = useTranslations("Download");
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">{t("loading")}</div>}>
      <PartnerHeroContent />
    </Suspense>
  );
}
