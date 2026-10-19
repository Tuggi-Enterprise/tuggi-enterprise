"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { sendGAEvent } from "@next/third-parties/google";
import { Check, Copy } from "lucide-react";
import { APP_STORE_URL } from "@/lib/app-meta";

/**
 * The two interactive pieces of the route page (`/r/<slug>`, card #946,
 * spec `spec-link-da-rota-2026-10.md` §1). Derived from `ReferralInviteClient`
 * and kept apart from it: the invite page does not touch the install, this one
 * does — the store tap leaves the route's link in the pasteboard so the app
 * can open the route on its first launch.
 */

/** How long the "Copied" confirmation stays up. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Copy button of the route code — copies what is written, the code.
 *
 * `writeText` is called synchronously inside the click handler: WebKit rejects
 * a clipboard write outside a user gesture. Refused or missing, the code is
 * selected instead, so the system "Copy" is one long-press away.
 */
export function RouteCopyCode({ code }: { code: string }) {
  const t = useTranslations("RouteLink");
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
        sendGAEvent({ event: "route_code_copied" });
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
          data-testid="route-code"
          className="select-all min-w-0 break-all text-left font-extrabold text-lg sm:text-xl text-tuggi-dark"
        >
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          data-testid="route-code-copy"
          className="shrink-0 min-h-11 flex items-center gap-2 py-3 px-4 bg-tuggi-secondary text-tuggi-dark font-extrabold text-sm rounded-xl hover:brightness-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark"
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

export type StorePlatform = "ios" | "android" | "other";

const BADGE_LINK =
  "inline-flex min-h-12 items-center hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text rounded-lg";

/**
 * The store badge of the route page: one per platform (spec §0.2), the pair
 * when the platform is unknown.
 *
 * The tap writes the WHOLE link `https://tuggi.app/r/<slug>` to the pasteboard,
 * inside the same click (WebKit refuses it outside the gesture), and only then
 * lets the browser follow the store link. Pasted anywhere, it still opens the
 * route; read by the app on its first launch, it is how an iPhone install can
 * land on the route without a paid tool (#946 item 3). Refused, the tap goes
 * to the store without the note, and the code box is still there.
 *
 * `/api/attribution` is NOT called: that route only captures a partner click
 * (`partner_id` required), and `drive.click_fingerprints` has no route column
 * yet — contract `link-da-rota.md` §4. The click is counted by `click_store`
 * with `placement: "route_link"`.
 */
export function RouteStoreBadge({
  platform,
  link,
  playStoreUrl,
  slug,
}: {
  platform: StorePlatform;
  /** `https://tuggi.app/r/<slug>`; absent on the unavailable states (no code to carry). */
  link?: string;
  playStoreUrl: string;
  slug?: string;
}) {
  const t = useTranslations("RouteLink");
  const tHero = useTranslations("Home.Hero");
  const [copiedLink, setCopiedLink] = useState(false);

  const onTap = (store: "app_store" | "play_store") => {
    sendGAEvent({
      event: "click_store",
      placement: "route_link",
      store,
      ...(slug ? { route_slug: slug } : {}),
    });
    if (!link) return;
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) return;
    clipboard.writeText(link).then(
      () => setCopiedLink(true),
      () => {
        // Refused: the store still opens, and the code box stays on the page.
      }
    );
  };

  const appStore = (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onTap("app_store")}
      className={BADGE_LINK}
      data-testid="route-store-app"
    >
      <Image
        src="/images/badges/app-store-badge.svg"
        alt={tHero("appStoreAlt")}
        width={160}
        height={48}
        className="h-12 w-auto"
      />
    </a>
  );
  const playStore = (
    <a
      href={playStoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onTap("play_store")}
      className={BADGE_LINK}
      data-testid="route-store-play"
    >
      <Image
        src="/images/badges/google-play-badge.svg"
        alt={tHero("playStoreAlt")}
        width={160}
        height={48}
        className="h-12 w-auto"
      />
    </a>
  );
  const otherLink = (href: string, label: string, store: "app_store" | "play_store") => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onTap(store)}
      className="text-sm text-tuggi-slate underline underline-offset-2 py-3"
      data-testid="route-store-other"
    >
      {label}
    </a>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {platform === "ios" ? (
        <>
          {appStore}
          {otherLink(playStoreUrl, t("otherAndroid"), "play_store")}
        </>
      ) : platform === "android" ? (
        <>
          {playStore}
          {otherLink(APP_STORE_URL, t("otherIphone"), "app_store")}
        </>
      ) : (
        <div className="flex flex-row flex-wrap gap-3 items-center justify-center">
          {appStore}
          {playStore}
        </div>
      )}
      <p role="status" aria-live="polite" data-testid="route-copied-note" className="text-sm text-tuggi-slate">
        {copiedLink ? t("copiedNote") : ""}
      </p>
    </div>
  );
}

/**
 * "Open in the app" (#946): with the app installed, a link pasted in Safari's
 * address bar never fires the Universal Link, and this page shows instead. The
 * button opens the app through its own scheme (`routeAppSchemeUrl`). A plain
 * link on purpose: if the app does not open, the page stays as it is, with the
 * store right below; nothing sends the visitor to the store on its own.
 */
export function RouteOpenAppButton({ href, slug }: { href: string; slug: string }) {
  const t = useTranslations("RouteLink");
  return (
    <a
      href={href}
      onClick={() => sendGAEvent({ event: "route_open_app", placement: "route_link", route_slug: slug })}
      data-testid="route-open-app"
      className="w-full flex items-center justify-center gap-2 min-h-12 py-3 px-6 bg-tuggi-dark text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text"
    >
      {t("openInApp")}
    </a>
  );
}
