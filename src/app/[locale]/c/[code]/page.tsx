import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getReferralInvite } from "@/lib/referral";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import { buildTwitterCard } from "@/lib/seo";
import { SITE_URL } from "@/lib/app-meta";
import { ReferralCopyCode, ReferralStoreBadges } from "@/components/blocks/ReferralInviteClient";

/**
 * The invite page — `tuggi.app/c/<code>`, card #840, handoff screen 3a.
 *
 * A friend shared a link; this page shows who invited (nickname only,
 * BR-USUARIO-042), the code with a Copy button, and the stores. The link
 * itself is not an attribution: the code pasted in the app is (#836 item 1).
 *
 * Rendered per request and never cached: whether a code is valid is the
 * database's answer at the time of the visit, and a statically cached page
 * would freeze it. Two states only — valid, or the same page without the code
 * block ("isn't active anymore"); there is no "exhausted" state for the friend
 * (#836, update of 2026-10-04).
 *
 * Like `/d/<slug>`, the URL carries no locale: `middleware.ts` rewrites
 * `/c/<code>` to `/<locale>/c/<code>` from the visitor's language, because
 * the link is typed once into a share sheet and read in any language.
 */
export const dynamic = "force-dynamic";

const OG_IMAGE = "/images/og-image-tuggi.jpg";

type Params = Promise<{ locale: string; code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "Referral" });
  const invite = await getReferralInvite(code);

  // The preview WhatsApp draws from these tags is the first thing the friend
  // sees. The inactive variant says nothing about the code or the inviter.
  const title =
    invite.status === "valid"
      ? t("metaTitle", { nickname: invite.nickname })
      : t("inactiveTitle");
  const description =
    invite.status === "valid" ? t("lead", PRODUCT_FACTS) : t("metaDescInactive");
  // Only a code the database vouched for is echoed back; a dead segment is
  // whatever someone typed, and it does not belong in the card's tags.
  const url = invite.status === "valid" ? `${SITE_URL}/c/${invite.code}` : undefined;

  return {
    // Bare: the root layout's title template appends the brand.
    title,
    description,
    // #840 item 7. A page per user code is an unbounded set of thin URLs.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      ...(url ? { url } : {}),
      siteName: "TUGGI",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "TUGGI" }],
    },
    twitter: buildTwitterCard({ title, description, image: OG_IMAGE }),
  };
}

export default async function ReferralInvitePage({ params }: { params: Params }) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Referral");
  const invite = await getReferralInvite(code);
  const isValid = invite.status === "valid";

  return (
    <div className="px-5 pt-10 pb-16">
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        {isValid ? (
          <section
            data-testid="referral-valid"
            aria-labelledby="referral-title"
            className="w-full flex flex-col items-center gap-4"
          >
            <h1
              id="referral-title"
              className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight leading-tight"
            >
              {t("invitedBy", { nickname: invite.nickname })}
            </h1>
            <p className="text-lg text-tuggi-slate leading-relaxed">
              {t("lead", PRODUCT_FACTS)}
            </p>
            <ReferralCopyCode code={invite.code} />
            <p className="text-sm text-tuggi-slate leading-relaxed">
              {t("pasteWithin", PRODUCT_FACTS)}
            </p>
          </section>
        ) : (
          <section
            data-testid="referral-inactive"
            aria-labelledby="referral-title"
            className="w-full"
          >
            <h1
              id="referral-title"
              className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight leading-tight"
            >
              {t("inactiveTitle")}
            </h1>
          </section>
        )}

        <section aria-labelledby="referral-stores" className="w-full mt-10 flex flex-col items-center gap-4">
          <h2 id="referral-stores" className="text-base font-bold text-tuggi-dark">
            {isValid ? t("getAppAfterCode") : t("getApp")}
          </h2>
          <ReferralStoreBadges />
        </section>

        {/* The steps promise the hours of a code, so they only render with one. */}
        {isValid && (
          <section aria-labelledby="referral-how" className="w-full mt-12 text-left">
            <h2 id="referral-how" className="text-xl font-extrabold text-tuggi-dark mb-4">
              {t("howTitle")}
            </h2>
            <ol className="flex flex-col gap-3">
              {(["step1", "step2", "step3"] as const).map((key, index) => (
                <li key={key} className="flex gap-3 items-start">
                  <span
                    aria-hidden
                    className="shrink-0 w-7 h-7 rounded-full bg-tuggi-secondary text-tuggi-dark font-extrabold text-sm flex items-center justify-center"
                  >
                    {index + 1}
                  </span>
                  <span className="text-tuggi-slate leading-relaxed pt-0.5">
                    {t(key, PRODUCT_FACTS)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="w-full mt-10 rounded-3xl overflow-hidden border border-tuggi-border aspect-[4/3] relative">
          <Image
            src="/images/app/home-map.jpg"
            alt={t("mapAlt")}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover object-[center_40%]"
          />
        </div>
      </div>
    </div>
  );
}
