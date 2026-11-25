import Image from "next/image";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { AppPreview, AppPreviewQr } from "@/components/blocks/AppPreview";
import { PartnerSocialLinks } from "@/components/partner-page/PartnerSocialLinks";
import { PartnerStoreCta } from "@/components/partner-page/PartnerStoreCta";
import { Headphones, Map as MapIcon, MapPin } from "lucide-react";
import { PARTNER_DOWNLOAD_ID, PartnerIdentity, PartnerPageFrame } from "@/components/partner-page/PartnerPageFrame";
import { PartnerAbout, PartnerPageView, WelcomeAudioCard } from "@/components/partner-page/ClientPartnerParts";
import { PartnerHandleReserve } from "@/components/partner-page/PartnerHandleReserve";
import { PartnerTutorial } from "@/components/partner-page/PartnerTutorial";
import { SITE_URL } from "@/lib/app-meta";
import { storePlatformOf } from "@/lib/store-platform";
import { descriptionAddsToName } from "@/lib/partner-description";
import type { CouponPreview, PartnerData } from "@/lib/partner";
import type { PartnerSocial } from "@/lib/partner-links";

/** Past this many characters the name takes two lines at 390 px, and the photo gets lower (spec #1254 §1). */
const LONG_NAME_CHARS = 18;

interface ClientPartnerPageProps {
  locale: string;
  partner: PartnerData;
  coupon: CouponPreview | null;
  /** The partner's slug, for the app preview's invite. */
  slug: string;
  /** The address of the page (`/@nome`, or `/d/{slug}` when the resolver does not know it): footer and QR. */
  path: string;
  /** False when the page must not credit the partner (BR-B2B-067 items 3 and 6). */
  attributes: boolean;
  /** The resolver vouches for this partner: the seal by the name (DS-COMPONENTE-108). */
  verified: boolean;
  /** The networks the resolver sent (BR-B2B-061 item 6); `{}` when it sent none or was not asked. */
  social: PartnerSocial;
}

/**
 * The page of a place or a client (hotel, restaurant…), BR-B2B-067 item 2.a.
 * `/d/{slug}` and `/@nome` render this same component from the same read
 * (`lookupPartnerSlug`), which is what makes them one page (BR-B2B-037 item 2).
 *
 * A hotel or a restaurant is drawn in the frame of the one partner page, as
 * redesigned in #1254 (spec `docs/design/spec-pagina-arroba-redesenho-2026-11.md`):
 * the photo of the place, the identity band with the approved logo and "by
 * Tuggi", the promise, one store button, the three steps once and the @; below
 * the fold the story, what the partner wrote and "what Tuggi is". Two
 * doors keep the download layout of before, as DS-COMPONENTE-110 leaves them:
 * a coupon, whose page has one job, redeem (BR-MONETIZACAO-047), and Tuggi's
 * own slug, which is the download page of the site.
 */
export async function ClientPartnerPage({
  locale,
  partner,
  coupon,
  slug,
  path,
  attributes,
  verified,
  social,
}: ClientPartnerPageProps) {
  const partnerId = attributes ? partner.id : undefined;
  // What the visitor will see in the app (DS-COMPONENTE-117, #1135), from the
  // user agent of this request. Never for Tuggi's own slug. It names the
  // partner and nothing else (BR-B2B-067 item 3).
  const platform = storePlatformOf((await headers()).get("user-agent"));
  const preview = <AppPreview platform={platform} invite={{ kind: "partner", partner: slug }} />;

  if (partner.isTuggi || coupon) {
    // On a computer the QR of this page comes first.
    const previewSlot = partner.isTuggi ? null : (
      <>
        {platform === "other" && (
          <div className="mb-6">
            <AppPreviewQr url={`${SITE_URL}${path}`} />
          </div>
        )}
        {preview}
      </>
    );
    return (
      <main data-partner-page="client">
        <PartnerHeroWrapper partnerData={partner} partnerId={partnerId} coupon={coupon} previewSlot={previewSlot} />
      </main>
    );
  }

  const t = await getTranslations({ locale, namespace: "PartnerPage" });
  const name = partner.name ?? "";
  const brand = partner.brand ?? null;

  // The @ the app answers to (BR-B2B-058): only a page the resolver knows has one.
  const handle = path.startsWith("/@") ? path.slice(2) : null;
  const storeCta = (
    <PartnerStoreCta
      partnerId={partnerId}
      label={t("download")}
      desktopHref={`#${PARTNER_DOWNLOAD_ID}`}
      placement="partner_page"
      only={platform}
    />
  );

  // BR-B2B-070 item 2: the plate exists only with the approved logo; without
  // it, the name alone, larger, and no initial.
  const plate = brand ? (
    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md lg:h-28 lg:w-28 lg:rounded-[26px]">
      <Image
        src={brand.logoUrl}
        alt={t("brandLockup", { partner: name })}
        width={112}
        height={112}
        sizes="(min-width: 1024px) 112px, 64px"
        data-testid="partner-logo"
        className="h-full w-full object-contain p-1.5 lg:p-2.5"
      />
    </span>
  ) : undefined;

  // The photo of the place is the LCP of the page. A long name takes two
  // lines, so its photo is lower, decided here so the first fold fits at
  // 390 x 664 with the cookie notice open (spec #1254 §1).
  const longName = Array.from(name).length > LONG_NAME_CHARS;
  const photo = partner.photoUrl ? (
    <div
      data-testid="partner-photo"
      className={`relative w-full overflow-hidden ${longName ? "h-16" : "h-[88px]"} lg:order-2 lg:h-full`}
    >
      <Image
        src={partner.photoUrl}
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 600px, 100vw"
        className="object-cover"
      />
    </div>
  ) : undefined;

  const identity = (
    <PartnerIdentity
      media={plate}
      name={name}
      verifiedLabel={verified ? t("verifiedA11y") : undefined}
      color={brand?.color}
      photo={photo}
    />
  );

  // The first fold has one job, at 390 x 664 with the cookie notice open:
  // recognise the place, understand Tuggi in one line, download and know what
  // comes next (spec #1254 §0). On a computer, no blue button: the steps, the
  // two badges, and the QR beside them.
  const hero = (
    <>
      <PartnerPageView partnerId={partnerId} />
      <p data-testid="partner-promise" className="text-[17px] font-semibold leading-[23px] lg:text-2xl lg:leading-8">
        {t("heroTitle")}
      </p>
      {/* On a phone, one short line: the fold has room for no more (spec #1254 §1). From 640 px, the long one.
          Its tighter leading and gap keep the @ of a two-line name with logo and photo above the notice at 390 x 664. */}
      <p data-testid="partner-promise-sub-short" className="mt-0.5 text-base leading-5 text-tuggi-slate sm:hidden">
        {t("heroSubShort")}
      </p>
      <p data-testid="partner-promise-sub" className="mt-1 hidden text-base leading-6 text-tuggi-slate sm:block">
        {t("heroSub")}
      </p>
      {platform !== "other" && <div className="mt-3">{storeCta}</div>}
      <PartnerTutorial locale={locale} platform={platform} partner={name} />
      {handle && <PartnerHandleReserve handle={handle} />}
      {platform === "other" && <div className="mt-6">{storeCta}</div>}
    </>
  );

  // DS-COMPONENTE-110: a block without content does not appear. A description
  // that only repeats the name, or a piece of it, says nothing, and the generic
  // line no longer stands in for a missing one (spec #1254 §1).
  const description = partner.description?.trim() ?? "";
  const hasDescription = descriptionAddsToName(description, name);
  const hasSocial = Object.keys(social).length > 0;
  const hasAbout = hasDescription || Boolean(partner.website) || hasSocial;

  return (
    <PartnerPageFrame
      locale={locale}
      kind="client"
      path={path}
      identity={identity}
      hero={hero}
      aside={
        platform === "other" ? (
          <div
            id={PARTNER_DOWNLOAD_ID}
            data-testid="partner-hero-qr"
            className="self-start rounded-3xl bg-white p-6 ring-1 ring-slate-200"
          >
            <AppPreviewQr url={`${SITE_URL}${path}`} />
          </div>
        ) : null
      }
      facts={{
        title: t("howTitle"),
        items: [
          { icon: MapPin, title: t("howStep1Title"), text: t("howStep1Text") },
          { icon: MapIcon, title: t("step2Title"), text: t("step2Text") },
          { icon: Headphones, title: t("step3Title"), text: t("step3Text") },
        ],
      }}
    >
      {/* Below the fold: the story, played here, and what the partner wrote. */}
      {(partner.audioUrl || hasAbout) && (
        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-12 lg:grid-cols-[minmax(0,1fr)_448px] lg:gap-16">
            {partner.audioUrl ? (
              <div className="lg:order-2">
                <WelcomeAudioCard
                  partnerId={partnerId}
                  audioUrl={partner.audioUrl}
                  audioLang={partner.audioLang}
                  name={name}
                  label={t("storyTitle")}
                  sub={t("storySub")}
                />
              </div>
            ) : null}
            {hasAbout && (
              <div className="min-w-0 lg:order-1">
                <PartnerAbout
                  partnerId={partnerId}
                  title={t("aboutTitle")}
                  description={hasDescription ? description : ""}
                  website={partner.website}
                  social={partner.social}
                  socialLinks={hasSocial ? <PartnerSocialLinks locale={locale} social={social} /> : undefined}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </PartnerPageFrame>
  );
}
