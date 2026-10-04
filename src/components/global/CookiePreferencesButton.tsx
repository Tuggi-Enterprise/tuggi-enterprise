"use client";

import { useTranslations } from "next-intl";
import { forgetConsent } from "@/lib/consent";

/**
 * "Cookie preferences" in the footer — the revocation BR-USUARIO-028 item 1
 * requires before the trackers run (card #818), and the door `s5ItemCookies`
 * of the privacy policy points at. Forgets the answer and reloads: on the way
 * back up the banner asks again and no tracker mounts until a new yes.
 */
export const CookiePreferencesButton = ({ className }: { className: string }) => {
  const t = useTranslations("Footer");
  const reopen = () => {
    forgetConsent();
    window.location.reload();
  };
  return (
    <button type="button" onClick={reopen} className={className}>
      {t("cookiePreferences")}
    </button>
  );
};
