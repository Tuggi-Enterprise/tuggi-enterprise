"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { Check, Copy } from "lucide-react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";

/**
 * The two interactive pieces of the invite page (`/c/<code>`, card #840).
 *
 * NEITHER TOUCHES THE PARTNER ATTRIBUTION PIPELINE. No `/api/attribution`, no
 * `useAttributionClipboardWrite`, no `buildPlayStoreUrl(clickId)`: the App
 * Store leg of that pipeline writes `tuggi_click_<uuid>` to the pasteboard,
 * and on this page the pasteboard holds the invite code the friend just
 * copied (#840 item 5). The two programmes are independent (#836 item 11).
 */

/** How long the "Copied" confirmation stays up. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Copy button — the only way the code reaches the clipboard. #836 item 1: no
 * automatic write, no fingerprint; the copy happens on the tap and nowhere else.
 *
 * `writeText` is called synchronously inside the click handler: WebKit rejects
 * a clipboard write that is not inside a user gesture. When the API is missing
 * or refuses (old WebView, insecure context), the code is selected instead, so
 * the system "Copy" callout is one long-press away and the visitor never sees
 * a dead button.
 */
export function ReferralCopyCode({ code }: { code: string }) {
  const t = useTranslations("Referral");
  const codeRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);

  const selectCode = () => {
    const el = codeRef.current;
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    if (!el || !selection) return;
    selection.removeAllRanges();
    selection.selectAllChildren(el);
  };

  const handleCopy = () => {
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) {
      selectCode();
      return;
    }
    clipboard.writeText(code).then(
      () => {
        setCopied(true);
        sendGAEvent({ event: "referral_code_copied", campaign: "stamps" });
        window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      },
      () => selectCode()
    );
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="w-full flex items-center justify-between gap-3 bg-white border border-dashed border-tuggi-secondary/50 rounded-2xl pl-5 pr-2 py-2">
        <span
          ref={codeRef}
          data-testid="referral-code"
          className="select-all font-extrabold text-3xl tracking-[0.18em] text-tuggi-dark"
        >
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 py-3 px-4 bg-tuggi-secondary text-tuggi-dark font-extrabold text-sm rounded-xl hover:brightness-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark"
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </p>
    </div>
  );
}

/**
 * Store badges of the invite page, tagged `stamps` for measurement (#840).
 *
 * Play reads campaign parameters from the `referrer` it hands to the install
 * (Play Console acquisition), so the tag rides there. The app's
 * InstallReferrerService only acts on `tuggi_click_<uuid>`, which this value
 * never carries, so no partner is credited from here. The App Store has no
 * free-form channel — a campaign token needs a provider token we do not hold
 * — so its link stays bare and the tap is counted by `click_store`.
 */
const PLAY_STORE_URL_STAMPS = `${PLAY_STORE_URL}&referrer=${encodeURIComponent(
  "utm_source=tuggi_site&utm_medium=referral&utm_campaign=stamps"
)}`;

const BADGE_LINK =
  "hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg";

export function ReferralStoreBadges() {
  const t = useTranslations("Home.Hero");
  const track = (store: "app_store" | "play_store") =>
    sendGAEvent({ event: "click_store", placement: "referral_invite", store, campaign: "stamps" });

  return (
    <div className="flex flex-row flex-wrap gap-3 items-center justify-center">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("app_store")}
        className={BADGE_LINK}
      >
        <Image
          src="/images/badges/app-store-badge.svg"
          alt={t("appStoreAlt")}
          width={140}
          height={42}
          className="h-11 w-auto"
        />
      </a>
      <a
        href={PLAY_STORE_URL_STAMPS}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("play_store")}
        className={BADGE_LINK}
      >
        <Image
          src="/images/badges/google-play-badge.svg"
          alt={t("playStoreAlt")}
          width={140}
          height={42}
          className="h-11 w-auto"
        />
      </a>
    </div>
  );
}
