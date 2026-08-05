"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-meta";
import { COOKIE_BANNER_HEIGHT_VAR } from "@/components/global/CookieBanner";

interface PartnerCampaignHeroProps {
  /** Partner seal (already narrowed to our own Storage by lib/partner.ts). */
  sealUrl: string;
  partnerName: string;
  /** The shared audio player card, owned by PartnerHero — behaviour is not duplicated here. */
  audioSlot?: ReactNode;
  /** The partner's own welcome text, rendered by PartnerHero with its collapse control. */
  descriptionSlot?: ReactNode;
  onStoreClick: (store: "app_store" | "play_store") => void;
}

/** The printed piece's undulating cut, kept as the download band's top edge. */
function WaveDivider() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 390 28"
      preserveAspectRatio="none"
      className="absolute inset-x-0 top-0 h-6 w-full text-tuggi-bg"
    >
      <path
        d="M0 0h390v10c-32 0-49 12-81 12S241 6 195 6 130 22 98 22 32 10 0 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Campaign variant of the /d/<slug> hero, rendered when the partner has a seal
 * (see PartnerHero). The visitor is standing at a restaurant table with the
 * printed QR in front of them, so the page is budgeted by fold, not by section,
 * and it reads as three acts:
 *
 *   1. the page title — masthead, headline, one bridging line;
 *   2. the place and its host — who referred you, the host's own words, and
 *      the player right under them: the text frames, the audio delivers;
 *   3. how Tuggi works — the three numbered steps, read as an explanation of
 *      the product only after the visitor has heard the proof.
 *
 * Then the download band closes the page. Acts 2 and 3 were the other way
 * around until the ordering was corrected: the steps explained a product whose
 * proof the visitor had not heard yet, and the host's text was stranded below
 * them.
 *
 * The player is the product, not decoration: it proves the promise in twelve
 * seconds and it is why the QR was scanned, so it sits inside the first fold and
 * above the floating CTA's top edge — even on a first visit, when the consent
 * banner lifts that CTA to roughly 450px down the viewport. That ~450px is the
 * whole budget for act 1 + act 2, which is why the host's text is capped short
 * here (PartnerHero's maxDescLength) and opens with MORE. The e2e suite asserts
 * the budget; the [data-block] hooks below exist for it.
 *
 * Two deliberate constraints:
 * - Typography is the site's own (Inter, set on <html>). The headline carries
 *   its weight through size and weight, not through a second family: a serif
 *   stack read as foreign to the rest of the site.
 * - No scroll/entrance animation. Everything below the fold is content the
 *   visitor came for; animating it only delays it on a low-end phone.
 */
export function PartnerCampaignHero({
  sealUrl,
  partnerName,
  audioSlot,
  descriptionSlot,
  onStoreClick,
}: PartnerCampaignHeroProps) {
  const t = useTranslations("Download.Campaign");

  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <div className="w-full">
      {/* Masthead: Tuggi stays the product, the seal says "you scanned the
          right table". Both are above the fold, so both are eager.
          Deliberately a <div>: globals.css hides `.no-layout header`, the rule
          that strips the site chrome from this page, and a <header> here would
          be swallowed by it the moment the page hydrates. */}
      <div
        data-block="masthead"
        className="flex items-center justify-between gap-4 px-5 pt-4 sm:px-8 sm:pt-6"
      >
        <Image
          src="/images/logo_tuggi_full.png"
          alt="Tuggi"
          width={180}
          height={54}
          className="h-8 w-auto sm:h-11"
          priority
        />
        <Image
          src={sealUrl}
          alt={partnerName}
          width={200}
          height={200}
          sizes="(min-width: 640px) 112px, 72px"
          className="h-16 w-auto max-w-[72px] object-contain sm:h-24 sm:max-w-[112px]"
          priority
        />
      </div>

      {/* Act 1 — the page title. */}
      <div className="mx-auto max-w-2xl px-5 pt-4 sm:px-8 sm:pt-8">
        <h1 className="text-[1.875rem] font-black leading-[1.05] tracking-[-0.03em] text-tuggi-dark sm:text-5xl">
          {t.rich("headline", {
            accent: (chunks) => <span className="text-tuggi-primary">{chunks}</span>,
          })}
        </h1>

        {/* One line, on purpose: every extra line here pushes the player past
            the floating CTA's top edge, and the steps in act 3 say the same
            thing in full. */}
        <p data-block="subtext" className="mt-2.5 text-[0.95rem] leading-snug text-tuggi-slate sm:text-lg">
          {t("subtext")}
        </p>
      </div>

      {/* Act 2 — the place and its host, in one block. The referral line is what
          the visitor scanned: the seal in the masthead is a mark, this names it.
          The host's own text is a different voice from the campaign copy above,
          so it keeps the rule in the campaign accent; the player sits directly
          under it, close enough to read as the same block rather than as a
          separate feature. */}
      <section data-block="poi" className="mx-auto mt-3.5 max-w-2xl px-5 sm:mt-6 sm:px-8">
        {partnerName && (
          <p
            data-block="referral"
            className="text-[0.6875rem] font-bold uppercase leading-none tracking-[0.14em] text-tuggi-slate/80 sm:text-xs"
          >
            {t("referredBy", { name: partnerName })}
          </p>
        )}

        {descriptionSlot && (
          <div data-block="description" className="mt-2 border-l-2 border-tuggi-secondary/50 pl-4">
            {descriptionSlot}
          </div>
        )}

        {audioSlot && (
          <div data-block="player" className="mt-3">
            {audioSlot}
          </div>
        )}
      </section>

      {/* Act 3 — how Tuggi works, the core of the printed piece, now read as an
          explanation of what the visitor has just heard. The number sits on the
          title's own baseline rather than in a column of its own: it reads as
          one line on a phone and saves the vertical run that pushed the download
          band past the second fold. Three columns from sm up, as the piece is
          laid out at table size. The heading is visible here (it was sr-only
          while the block sat mid-page): as the closing act it has to announce
          itself, otherwise the steps read as three loose captions. */}
      <section data-block="steps" className="mx-auto mt-6 max-w-2xl px-5 sm:mt-10 sm:px-8">
        <h2 className="mb-2 text-[0.6875rem] font-bold uppercase leading-none tracking-[0.14em] text-tuggi-slate/80 sm:mb-4 sm:text-xs">
          {t("stepsHeading")}
        </h2>
        <ol className="divide-y divide-slate-200 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="py-2.5 first:pt-0 last:pb-0 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:pr-0"
            >
              <div className="flex items-baseline gap-2.5">
                <span
                  aria-hidden="true"
                  className="text-[1.375rem] font-black leading-none tracking-[-0.02em] text-tuggi-secondary tabular-nums sm:text-4xl"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-[0.8rem] font-extrabold uppercase leading-snug tracking-[0.1em] text-tuggi-dark">
                  {step.title}
                </h3>
              </div>
              <p className="mt-1 text-[0.8125rem] leading-snug text-tuggi-slate sm:mt-2">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Download band, carrying the printed piece's wave on its top edge (the
          photo band that used to carry it was an app screenshot of Lisbon —
          wrong region, and 500px of it). The floating CTA above goes to the
          visitor's own store; these badges are the explicit both-stores
          fallback (desktop, or a phone the sniff got wrong), and the seal signs
          off the piece. */}
      <div
        data-block="band"
        className="relative mt-6 bg-tuggi-dark px-5 pb-6 pt-9 text-white sm:mt-10 sm:px-8 sm:pb-8"
      >
        <WaveDivider />
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xl font-black leading-tight sm:text-3xl">{t("bandTitle")}</p>
            <p className="text-base font-medium text-tuggi-secondary sm:text-xl">
              {t("bandSubtitle")}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onStoreClick("app_store")}
                className="rounded-lg transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Image
                  src="/images/badges/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={120}
                  height={35}
                  className="h-9 w-auto"
                  // The optimizer answers 400 for SVG unless dangerouslyAllowSVG
                  // is on (it is not, and turning it on for a badge is not worth
                  // the script-in-SVG surface). Nothing to optimize here anyway.
                  unoptimized
                />
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onStoreClick("play_store")}
                className="rounded-lg transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Image
                  src="/images/badges/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={120}
                  height={35}
                  className="h-9 w-auto"
                  unoptimized
                />
              </a>
            </div>
          </div>

          <Image
            src={sealUrl}
            alt=""
            aria-hidden="true"
            width={200}
            height={200}
            sizes="(min-width: 640px) 112px, 72px"
            className="h-[72px] w-auto max-w-[72px] shrink-0 object-contain sm:h-28 sm:max-w-[112px]"
          />
        </div>
      </div>

      {/* Landing strip for the floating CTA. It is fixed and unconditionally
          light (that is the validated version, shared with the default hero),
          so the page has to end on the light background instead of under the
          dark band — otherwise the fade would wash out the band's bottom edge.
          Sized to clear the button plus its trust line, and it grows by the
          cookie banner's own published height (same variable the CTA reads, no
          second copy of the consent state) so that scrolling to the end always
          reveals the download band, banner up or not. */}
      <div
        data-block="spacer"
        aria-hidden="true"
        className="w-full"
        style={{ height: `calc(9rem + var(${COOKIE_BANNER_HEIGHT_VAR}, 0px))` }}
      />
    </div>
  );
}
