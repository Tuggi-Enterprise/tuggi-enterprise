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

/** The photo band's top edge, matching the printed piece's undulating cut. */
function WaveDivider() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 390 28"
      preserveAspectRatio="none"
      className="absolute inset-x-0 top-0 z-10 h-6 w-full text-tuggi-bg"
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
 * (see PartnerHero). It follows the printed table-top piece the festival hands
 * out: seal-anchored masthead, heavy serif headline with a coloured stress, the
 * three numbered steps, an ambient photo band, and a dark download band where
 * the seal comes back.
 *
 * Two deliberate constraints:
 * - The headline uses the system serif stack, not a web font. It is the LCP
 *   element on a page reached from a printed QR (often on roaming data), so a
 *   font round-trip would be paid by every scan for a purely typographic gain.
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
      <div className="flex items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <Image
          src="/images/logo_tuggi_full.png"
          alt="Tuggi"
          width={180}
          height={54}
          className="h-9 w-auto sm:h-11"
          priority
        />
        <Image
          src={sealUrl}
          alt={partnerName}
          width={200}
          height={200}
          sizes="(min-width: 640px) 112px, 88px"
          className="h-[72px] w-auto max-w-[88px] object-contain sm:h-24 sm:max-w-[112px]"
          priority
        />
      </div>

      <div className="mx-auto max-w-2xl px-5 pt-7 sm:px-8 sm:pt-10">
        <h1 className="font-serif text-[2rem] font-bold leading-[1.1] tracking-[-0.01em] text-tuggi-dark sm:text-5xl">
          {t.rich("headline", {
            accent: (chunks) => <span className="text-tuggi-primary">{chunks}</span>,
          })}
        </h1>

        <p className="mt-5 text-[0.95rem] leading-relaxed text-tuggi-slate sm:text-lg">
          {t("subtext")}
        </p>

        {audioSlot && <div className="mt-7">{audioSlot}</div>}
        {/* The partner's own welcome text is a different voice from the campaign
            copy above (and the transcript of the audio, when there is one), so
            it gets a rule in the campaign accent rather than blending in. */}
        {descriptionSlot && (
          <div className="mt-6 border-l-2 border-tuggi-secondary/50 pl-4">{descriptionSlot}</div>
        )}
      </div>

      {/* The three steps — the core of the printed piece. Stacked with hairline
          rules on the phone, three columns split by vertical rules from sm up,
          which is how the piece is laid out at table size. */}
      <section className="mx-auto mt-9 max-w-2xl px-5 sm:mt-12 sm:px-8">
        <h2 className="sr-only">{t("stepsHeading")}</h2>
        <ol className="divide-y divide-slate-200 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex items-start gap-4 py-5 first:pt-0 last:pb-0 sm:flex-col sm:gap-3 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:pr-0"
            >
              <span
                aria-hidden="true"
                className="font-serif text-[2.25rem] font-bold leading-none text-tuggi-secondary tabular-nums sm:text-5xl"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-[0.8rem] font-extrabold uppercase leading-snug tracking-[0.12em] text-tuggi-dark">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-tuggi-slate">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Ambient band. Our own asset (no third-party image rights involved),
          below the fold, so it loads lazily. */}
      <div className="relative mt-10 h-44 w-full sm:mt-14 sm:h-64">
        <WaveDivider />
        <Image
          src="/images/partner-hero.png"
          alt={t("photoAlt")}
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Download band. The floating CTA above it goes to the visitor's own
          store; these badges are the explicit both-stores fallback (desktop,
          or a phone the sniff got wrong), and the seal signs off the piece. */}
      <div className="bg-tuggi-dark px-5 pb-9 pt-8 text-white sm:px-8 sm:pb-12">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-2xl font-black leading-tight sm:text-3xl">{t("bandTitle")}</p>
            <p className="mt-0.5 text-lg font-medium text-tuggi-secondary sm:text-xl">
              {t("bandSubtitle")}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
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
                  className="h-10 w-auto"
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
                  className="h-10 w-auto"
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
            sizes="(min-width: 640px) 112px, 80px"
            className="h-20 w-auto max-w-[80px] shrink-0 object-contain sm:h-28 sm:max-w-[112px]"
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
        aria-hidden="true"
        className="w-full"
        style={{ height: `calc(10rem + var(${COOKIE_BANNER_HEIGHT_VAR}, 0px))` }}
      />
    </div>
  );
}
