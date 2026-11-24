import Image from "next/image";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { AppPreview, AppPreviewQr } from "@/components/blocks/AppPreview";
import { PartnerSocialLinks } from "@/components/partner-page/PartnerSocialLinks";
import { PartnerStoreCta } from "@/components/partner-page/PartnerStoreCta";
import { PARTNER_DOWNLOAD_ID, PartnerIdentity, PartnerPageFrame } from "@/components/partner-page/PartnerPageFrame";
import { PartnerAbout, WelcomeAudioCard } from "@/components/partner-page/ClientPartnerParts";
import { PartnerHandleReserve } from "@/components/partner-page/PartnerHandleReserve";
import { PartnerTutorial } from "@/components/partner-page/PartnerTutorial";
import { SITE_URL } from "@/lib/app-meta";
import { storePlatformOf } from "@/lib/store-platform";
import type { CouponPreview, PartnerData } from "@/lib/partner";
import type { PartnerSocial } from "@/lib/partner-links";

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
 * A hotel or a restaurant is drawn in the frame of the one partner page
 * (DS-COMPONENTE-110, mockup w02): logo, name, description, contacts, the
 * welcome audio and the store action, nothing it did not have before. Two
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
  const initial = (Array.from(name.trim())[0] ?? "T").toLocaleUpperCase(locale);
  const mediaClass =
    "flex h-[72px] w-[72px] sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-md";

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

  // The first fold has one job, at 390 x 664 with the cookie notice open: the
  // partner, the store of this phone and the three steps (spec onda 1 §1). On a
  // computer the steps come first, then the badges, with the QR beside them.
  const hero = (
    <>
      <PartnerIdentity
        media={
          partner.logoUrl ? (
            <span className={mediaClass}>
              <Image
                src={partner.logoUrl}
                alt={name}
                width={96}
                height={96}
                data-testid="partner-logo"
                className="h-full w-full object-contain p-2"
                priority
              />
            </span>
          ) : (
            <span aria-hidden="true" data-testid="partner-initial" className={`${mediaClass} text-3xl sm:text-5xl font-bold text-tuggi-primary-text`}>
              {initial}
            </span>
          )
        }
        chip={t("badgePartner")}
        name={name}
        verifiedLabel={verified ? t("verifiedA11y") : undefined}
      />
      {platform !== "other" && <div className="mt-5">{storeCta}</div>}
      <PartnerTutorial locale={locale} platform={platform} partner={name} />
      {handle && <PartnerHandleReserve handle={handle} />}
      {platform === "other" && <div className="mt-6">{storeCta}</div>}
    </>
  );

  return (
    <PartnerPageFrame
      locale={locale}
      kind="client"
      path={path}
      hero={hero}
      qrInBand={false}
      aside={
        platform === "other" ? (
          <div data-testid="partner-hero-qr" className="self-start rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <AppPreviewQr url={`${SITE_URL}${path}`} />
          </div>
        ) : null
      }
    >
      {/* Below the fold, what the page already had: the text, the welcome audio, the app preview. */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_448px] lg:gap-16">
          {partner.audioUrl ? (
            <div className="lg:order-2">
              <WelcomeAudioCard
                partnerId={partnerId}
                audioUrl={partner.audioUrl}
                audioLang={partner.audioLang}
                name={name}
                label={t("storyTitle")}
              />
            </div>
          ) : null}
          <div className="min-w-0 lg:order-1">
            <PartnerAbout
              partnerId={partnerId}
              description={partner.description || t("partnerLead")}
              website={partner.website}
              social={partner.social}
              socialLinks={
                Object.keys(social).length > 0 ? <PartnerSocialLinks locale={locale} social={social} /> : undefined
              }
            />
          </div>
        </div>
      </section>
      <section data-testid="partner-app-preview" className="mx-auto max-w-sm px-5 py-12">
        {preview}
      </section>
    </PartnerPageFrame>
  );
}
