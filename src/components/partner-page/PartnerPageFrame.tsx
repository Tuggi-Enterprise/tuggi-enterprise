import type { CSSProperties, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { StickyCta } from "@/components/blocks/StickyCta";
import { TuggiLockup } from "@/components/brand/TuggiLockup";
import { PARTNER_CTA_ID } from "@/components/partner-page/PartnerStoreCta";

/**
 * Id of the QR card a computer reads with the phone: the full action of a
 * computer aims at it (`desktopHref`). Kept as `download`, the anchor printed
 * links and the old band already used.
 */
export const PARTNER_DOWNLOAD_ID = "download";

/** Id of the footer: the phone's sticky bar leaves once it reaches it (spec #1254 §1). */
export const PARTNER_FOOTER_ID = "partner-page-footer";

/** One fact of "what Tuggi is" below the fold: no number, an icon, a title and one line. */
export interface PartnerFact {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface PartnerPageFrameProps {
  locale: string;
  /** `data-partner-page`: which partner the page is about. */
  kind: "creator" | "client";
  /** The address the page answers at (`/@nome`, or `/d/{slug}`): the footer prints it. */
  path: string;
  /** The identity band, full width under the header: photo, logo or photo, name, "by Tuggi". */
  identity: ReactNode;
  /** Left column of the first fold: the promise, the action, the steps. */
  hero: ReactNode;
  /** Right column at 1440, below the hero at 390: the QR card, or the featured itinerary. */
  aside?: ReactNode;
  /** The blocks between the first fold and "what Tuggi is". */
  children?: ReactNode;
  /** "What Tuggi is", three facts without numbers; the title is optional. */
  facts: { title?: string; items: PartnerFact[] };
  /** First link of the footer, before Terms and Privacy: "report this profile" on a creator's page. */
  footerAction?: ReactNode;
}

/**
 * The frame of the one partner page (DS-COMPONENTE-110, redesign #1254): a
 * header with the Tuggi lockup and nothing else, the partner's identity band,
 * the first fold, the partner's blocks, "what Tuggi is", the footer and the
 * phone's sticky bar. What goes inside is what the partner has.
 *
 * The steps live in the first fold only: the dark numbered band that repeated
 * them is gone (spec #1254 §4). Server-rendered: everything that decides is in
 * the HTML.
 */
export async function PartnerPageFrame({
  locale,
  kind,
  path,
  identity,
  hero,
  aside,
  children,
  facts,
  footerAction,
}: PartnerPageFrameProps) {
  const t = await getTranslations({ locale, namespace: "PartnerPage" });
  const tFooter = await getTranslations({ locale, namespace: "Footer" });

  return (
    <main data-lp-chrome="off" data-partner-page={kind} className="bg-white text-tuggi-dark">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-12 max-w-6xl items-center px-5 lg:h-16">
          <Link href="/" className="inline-flex" aria-label="Tuggi">
            <TuggiLockup className="h-[26px] w-auto lg:h-8" />
          </Link>
        </div>
      </div>

      {identity}

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-10 pt-4 lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-24 lg:pb-14 lg:pt-10">
          <div className="min-w-0">{hero}</div>
          {aside}
        </div>
      </section>

      {children}

      <section data-testid="partner-facts" className="bg-tuggi-bg">
        <div className="mx-auto max-w-6xl px-5 py-12">
          {facts.title && <h2 className="text-xl font-extrabold leading-[26px]">{facts.title}</h2>}
          <ul className={`grid gap-6 lg:grid-cols-3 lg:gap-10 ${facts.title ? "mt-6" : ""}`}>
            {facts.items.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
                  <Icon aria-hidden="true" className="h-5 w-5 text-tuggi-primary-text" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold leading-[22px]">{title}</span>
                  <span className="mt-1 block text-sm leading-5 text-tuggi-slate">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Not a <footer>: the global stylesheet hides every footer on a page with data-lp-chrome="off". */}
      <div id={PARTNER_FOOTER_ID} className="mx-auto max-w-6xl px-5 py-6 pb-28 md:pb-6 text-xs text-tuggi-slate">
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
        untilId={PARTNER_FOOTER_ID}
        placement="partner_page_sticky"
        hideWithCookieNotice
      />
    </main>
  );
}

interface PartnerIdentityProps {
  /** The logo plate (place) or the round photo (creator); absent, the name alone, larger. */
  media?: ReactNode;
  name: string;
  /** Shows the seal (DS-COMPONENTE-108), with this as its spoken name; absent, no seal. */
  verifiedLabel?: string;
  /** The line under the name: the @ of a creator. */
  subline?: string;
  /** The partner's colour pair, from the server (DS-MARCA-002); absent, the neutral band. */
  color?: { background: string; ink: string } | null;
  /** The photo of the place, above the band on a phone and at the right of it on a computer. */
  photo?: ReactNode;
}

/**
 * The identity band of the first fold (spec #1254 §1): media, the name with the
 * seal on its last word, and "by" + the Tuggi lockup, which replaces the chips
 * "Parceiro do Tuggi" and "Criadores Tuggi". The partner's colour paints this
 * band only, with the ink the server computed and the lockup in that one ink;
 * without it the band is `--color-tuggi-bg` and the lockup keeps its colours.
 */
export function PartnerIdentity({ media, name, verifiedLabel, subline, color, photo }: PartnerIdentityProps) {
  const style: CSSProperties | undefined = color ? { backgroundColor: color.background, color: color.ink } : undefined;
  return (
    <section
      data-testid="partner-identity"
      style={style}
      className={`relative lg:grid lg:min-h-[176px] ${photo ? "lg:h-[240px] lg:grid-cols-[minmax(0,1fr)_600px]" : ""} ${
        color ? "" : "bg-tuggi-bg text-tuggi-dark"
      }`}
    >
      {photo}
      <div
        className={`flex items-center gap-4 px-5 pb-3.5 lg:gap-6 lg:py-8 lg:pl-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))] ${
          photo ? "" : "pt-4 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-5"
        } ${photo ? "lg:order-1" : ""}`}
      >
        {media && <div className={`shrink-0 ${photo ? "relative z-10 -mt-[26px] lg:mt-0" : ""}`}>{media}</div>}
        <div className={`min-w-0 ${photo && media ? "pt-2.5 lg:pt-0" : photo ? "pt-3.5 lg:pt-0" : ""}`}>
          {/* The seal follows the last word of the name, even when the name wraps. */}
          <h1
            data-testid="partner-name"
            className={`font-extrabold tracking-tight break-words lg:text-[46px] lg:leading-[52px] ${
              media ? "text-2xl leading-7" : "text-[28px] leading-8"
            }`}
          >
            {name}
            {verifiedLabel && (
              <BadgeCheck
                role="img"
                aria-label={verifiedLabel}
                data-testid="partner-page-verified"
                className="ml-1.5 inline-block h-5 w-5 lg:h-8 lg:w-8 align-[-0.1em] fill-tuggi-primary text-white"
              />
            )}
          </h1>
          {subline && <p className="mt-0.5 text-sm lg:text-base opacity-80">{subline}</p>}
          <div data-testid="partner-by-tuggi" className="mt-1 flex items-center gap-1 text-[13px] font-semibold leading-4 lg:mt-2 lg:text-lg">
            <span>by</span>
            <TuggiLockup mono={Boolean(color)} label="Tuggi" className="h-[15px] w-auto lg:h-[22px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
