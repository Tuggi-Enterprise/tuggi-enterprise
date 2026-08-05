"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PartnerHero } from "./PartnerHero";

import { useTranslations } from "next-intl";

interface CouponPreview {
  code: string;
  days: number;
}

interface WrapperProps {
  partnerData: any;
  partnerId?: string;
  /** When present, the page is rendering a coupon redemption variant. */
  coupon?: CouponPreview | null;
}

function PartnerHeroContent({ partnerData, partnerId, coupon }: WrapperProps) {
  const searchParams = useSearchParams();
  // Prefer the explicitly resolved id (e.g. from /d/<slug>); fall back to the query string.
  const resolvedId =
    partnerId ||
    searchParams.get("ID") ||
    searchParams.get("p") ||
    searchParams.get("partner_id") ||
    undefined;

  return (
    <PartnerHero
      partnerId={resolvedId}
      partnerData={partnerData}
      coupon={coupon ?? undefined}
    />
  );
}

export function PartnerHeroWrapper({ partnerData, partnerId, coupon }: WrapperProps) {
  const t = useTranslations("Download");
  return (
    // data-lp-chrome="off" is the server-rendered half of the rule in
    // globals.css that strips the site header/footer from a landing page. It
    // has to be in the markup, not in a hydration effect: this page is opened
    // from a printed QR on roaming data, and until the JS lands the visitor
    // would otherwise scroll through the entire corporate footer.
    <div data-lp-chrome="off">
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">{t("loading")}</div>}>
        <PartnerHeroContent partnerData={partnerData} partnerId={partnerId} coupon={coupon} />
      </Suspense>
    </div>
  );
}
