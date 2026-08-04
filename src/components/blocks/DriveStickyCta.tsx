"use client";

import { useTranslations } from "next-intl";
import { StickyCta } from "@/components/blocks/StickyCta";

/** The Drive page's mobile sticky CTA. Behaviour lives in `StickyCta`. */
export function DriveStickyCta() {
  const t = useTranslations("Drive.Sticky");

  return (
    <StickyCta
      text={t("text")}
      cta={t("cta")}
      afterId="drive-hero"
      untilId="drive-final-cta"
      placement="sticky"
    />
  );
}
