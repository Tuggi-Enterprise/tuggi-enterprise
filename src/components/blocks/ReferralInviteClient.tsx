"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { Check, Copy } from "lucide-react";
import { useStoreCampaign } from "@/lib/conversionHooks";

/**
 * The two interactive pieces of the invite page (`/c/<code>` and `/c/@nome`,
 * cards #840 and #1135).
 *
 * NEITHER TOUCHES THE PARTNER ATTRIBUTION PIPELINE. No `/api/attribution`, no
 * `useAttributionClipboardWrite`, no `buildPlayStoreUrl(clickId)`: the App
 * Store leg of that pipeline writes `tuggi_click_<uuid>` to the pasteboard,
 * and on this page the pasteboard holds the invite (#840 item 5). The two
 * programmes are independent (#836 item 11).
 *
 * What reaches the pasteboard is the invite as the page shows it, the code or
 * the @, and only inside a tap: Copy, or the App Store badge
 * (BR-MONETIZACAO-085 item 2.e.ii). The app reads it back with the system
 * paste button of the step "Alguém te indicou o Tuggi?", which is a tap too.
 */

/** How long the "Copied" confirmation stays up. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Writes the invite to the pasteboard. CALL IT FROM INSIDE THE CLICK HANDLER:
 * WebKit rejects a clipboard write that is not inside a user gesture, so the
 * write is started synchronously, with no `await` before it.
 */
function writeInvite(shared: string): Promise<void> {
  const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (!clipboard?.writeText) return Promise.reject(new Error("no clipboard"));
  return clipboard.writeText(shared);
}

/**
 * Copy button — #836 item 1: no automatic write, no fingerprint; the copy
 * happens on a tap and nowhere else.
 *
 * When the API is missing or refuses (old WebView, insecure context), the
 * invite is selected instead, so the system "Copy" callout is one long-press
 * away and the visitor never sees a dead button.
 */
export function ReferralCopyCode({ shared, via }: { shared: string; via: "code" | "name" }) {
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
    writeInvite(shared).then(
      () => {
        setCopied(true);
        sendGAEvent({ event: "referral_code_copied", campaign: "stamps", via });
        window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      },
      () => selectCode()
    );
  };

  // A code is six spaced capitals; an @ runs up to 30 characters and has to
  // fit a 350 px column at 390 px, so it gets a smaller face and may wrap.
  const textClass =
    via === "code"
      ? "text-3xl tracking-[0.18em]"
      : "text-xl sm:text-2xl tracking-normal break-all text-left";

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="w-full flex items-center justify-between gap-3 bg-white border border-dashed border-tuggi-secondary/50 rounded-2xl pl-5 pr-2 py-2">
        <span
          ref={codeRef}
          data-testid="referral-code"
          className={`select-all font-extrabold text-tuggi-dark ${textClass}`}
        >
          {shared}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-2 py-3 px-4 bg-tuggi-secondary text-white font-extrabold text-sm rounded-xl hover:brightness-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark"
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

const BADGE_LINK =
  "hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg";

/**
 * Store badges of the invite page, tagged `stamps` for measurement (#840).
 *
 * Play: the link is built on the server (`invitePlayStoreUrl`) and carries the
 * invite in `referrer` (BR-MONETIZACAO-085 item 2.e.i). App Store: the tap
 * copies the invite, inside the gesture (item 2.e.ii); it follows the
 * destination of the badge, never the user agent. The App Store link carries
 * the visit's own campaign, when it has one (`useStoreCampaign`), and the tap
 * is counted by `click_store`.
 *
 * `compact` is the desktop layout, where the QR is the main way to the phone
 * and the badges are the secondary one (DS-COMPONENTE-117).
 */
export function ReferralStoreBadges({
  shared,
  playStoreUrl,
  compact = false,
}: {
  shared?: string;
  playStoreUrl: string;
  compact?: boolean;
}) {
  const t = useTranslations("Home.Hero");
  const { appStoreUrl, trackStoreClick } = useStoreCampaign();
  const track = (store: "app_store" | "play_store") =>
    trackStoreClick(store, "referral_invite", { campaign: "stamps" });
  const badgeClass = compact ? "h-9 w-auto" : "h-11 w-auto";

  return (
    <div className="flex flex-row flex-wrap gap-3 items-center justify-center">
      <a
        href={appStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          track("app_store");
          // A refusal here is not the visitor's problem: the store opens
          // either way, and the field in the app still takes a typed @.
          if (shared) writeInvite(shared).catch(() => {});
        }}
        className={BADGE_LINK}
      >
        <Image
          src="/images/badges/app-store-badge.svg"
          alt={t("appStoreAlt")}
          width={140}
          height={42}
          className={badgeClass}
        />
      </a>
      <a
        href={playStoreUrl}
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
          className={badgeClass}
        />
      </a>
    </div>
  );
}
