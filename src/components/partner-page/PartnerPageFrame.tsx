import Image from "next/image";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AppPreviewQr } from "@/components/blocks/AppPreview";
import { StickyCta } from "@/components/blocks/StickyCta";
import { PARTNER_CTA_ID } from "@/components/partner-page/PartnerStoreCta";
import { SITE_URL } from "@/lib/app-meta";

/** Id of the "how it works" band: the header link and the computer's full action aim at its QR. */
export const PARTNER_DOWNLOAD_ID = "download";

interface PartnerPageFrameProps {
  locale: string;
  /** `data-partner-page`: which partner the page is about. */
  kind: "creator" | "client";
  /** The address the page answers at (`/@nome`, or `/d/{slug}`): the footer prints it and the QR opens it. */
  path: string;
  /** Left column of the first fold: identity, text, the full action. */
  hero: ReactNode;
  /** Right column at 1440, below the hero at 390: the featured itinerary, or the welcome audio. */
  aside?: ReactNode;
  /** The blocks between the first fold and "how it works". */
  children?: ReactNode;
  /** First link of the footer, before Terms and Privacy: "report this profile" on a creator's page. */
  footerAction?: ReactNode;
}

/**
 * The frame of the one partner page, DS-COMPONENTE-110: the same header,
 * first fold, "how it works" band, footer and phone sticky bar for a creator
 * (mockup w01) and for a hotel or a restaurant (w02). What goes inside is
 * what the partner has; the frame itself has no data of its own.
 *
 * Server-rendered: everything that decides is in the HTML (spec §7.2).
 */
export async function PartnerPageFrame({ locale, kind, path, hero, aside, children, footerAction }: PartnerPageFrameProps) {
  const t = await getTranslations({ locale, namespace: "PartnerPage" });
  const tFooter = await getTranslations({ locale, namespace: "Footer" });

  return (
    <main data-lp-chrome="off" data-partner-page={kind} className="bg-white text-tuggi-dark">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="inline-flex">
            <Image src="/images/logo_tuggi_full.png" alt="Tuggi" width={96} height={28} className="h-7 w-auto" priority />
          </Link>
          <a
            href={`#${PARTNER_DOWNLOAD_ID}`}
            className="hidden sm:inline-flex rounded-xl bg-tuggi-secondary px-4 py-2 text-sm font-bold text-tuggi-dark hover:bg-tuggi-secondary-hover transition-colors"
          >
            {t("download")}
          </a>
        </div>
      </div>

      <section className="bg-tuggi-bg">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_448px] lg:gap-16 lg:py-14">
          <div className="min-w-0">{hero}</div>
          {aside}
        </div>
      </section>

      {children}

      <section id={PARTNER_DOWNLOAD_ID} className="bg-tuggi-dark text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
          {([1, 2, 3] as const).map((step) => (
            <div key={step}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tuggi-primary font-bold text-tuggi-dark">
                {step}
              </span>
              <h2 className="mt-4 text-lg font-bold">{t(`step${step}Title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{t(step === 1 && kind === "creator" ? "step1TextCreator" : `step${step}Text`)}</p>
            </div>
          ))}
          {/* No QR on a phone: nobody points the camera at their own screen. */}
          <div className="hidden lg:block rounded-2xl bg-white p-4">
            <AppPreviewQr url={`${SITE_URL}${path}`} />
          </div>
        </div>
      </section>

      {/* Not a <footer>: the global stylesheet hides every footer on a page with data-lp-chrome="off". */}
      <div className="mx-auto max-w-6xl px-5 py-6 pb-28 md:pb-6 text-xs text-tuggi-slate">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p data-testid="partner-page-address">{`tuggi.app${path}`}</p>
          <div data-testid="partner-page-footer-links" className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {footerAction && (
              <>
                {footerAction}
                <span aria-hidden="true">·</span>
              </>
            )}
            <Link href="/trust-center/terms-of-use" className="underline-offset-4 hover:underline hover:text-tuggi-dark">
              {tFooter("terms")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/trust-center/privacy-policy" className="underline-offset-4 hover:underline hover:text-tuggi-dark">
              {tFooter("privacy")}
            </Link>
          </div>
        </div>
        <p className="mt-2">{t("storeLegal")}</p>
      </div>

      <StickyCta
        text={t("stickySub")}
        cta={t("download")}
        afterId={PARTNER_CTA_ID}
        untilId={PARTNER_DOWNLOAD_ID}
        placement="partner_page_sticky"
      />
    </main>
  );
}

interface PartnerIdentityProps {
  /** The photo in a circle (creator) or the logo in a rounded square (place). */
  media: ReactNode;
  chip: string;
  name: string;
  /** Shows the seal (DS-COMPONENTE-108), with this as its spoken name; absent, no seal. */
  verifiedLabel?: string;
  /** The line under the name: the @ of a creator. */
  subline?: string;
}

/** Identity block of the first fold: media, chip, name with the seal, one line under it. */
export function PartnerIdentity({ media, chip, name, verifiedLabel, subline }: PartnerIdentityProps) {
  return (
    <div className="flex items-center gap-4 sm:gap-5">
      {media}
      <div className="min-w-0">
        <span
          data-testid="partner-page-chip"
          className="inline-block rounded-full border border-tuggi-primary/40 bg-white px-2.5 py-0.5 text-xs font-bold text-tuggi-primary-text"
        >
          {chip}
        </span>
        {/* The seal follows the last word of the name, even when the name wraps. */}
        <h1 className="mt-1 text-3xl sm:text-5xl font-extrabold tracking-tight break-words">
          {name}
          {verifiedLabel && (
            <BadgeCheck
              role="img"
              aria-label={verifiedLabel}
              data-testid="partner-page-verified"
              className="ml-2 inline-block h-7 w-7 sm:h-8 sm:w-8 align-[-0.1em] fill-tuggi-primary text-white"
            />
          )}
        </h1>
        {subline && <p className="mt-1 text-base text-tuggi-slate">{subline}</p>}
      </div>
    </div>
  );
}
