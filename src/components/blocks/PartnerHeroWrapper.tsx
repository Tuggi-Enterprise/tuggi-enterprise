"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PartnerHero } from "./PartnerHero";

function PartnerHeroContent() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("p") || searchParams.get("partner_id") || undefined;

  return <PartnerHero partnerId={partnerId} />;
}

export function PartnerHeroWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>}>
      <PartnerHeroContent />
    </Suspense>
  );
}
