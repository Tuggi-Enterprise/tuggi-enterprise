import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getReferralInvite, invitePath, invitePlayStoreUrl } from "@/lib/referral";
import { resolvePublicPage } from "@/lib/public-page";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import { buildTwitterCard } from "@/lib/seo";
import { SITE_URL } from "@/lib/app-meta";
import { storePlatformOf } from "@/lib/store-platform";
import { ReferralCopyCode, ReferralStoreBadges } from "@/components/blocks/ReferralInviteClient";
import { AppPreview, AppPreviewQr } from "@/components/blocks/AppPreview";

/**
 * The invite page — `tuggi.app/c/@nome` and `tuggi.app/c/<code>`, cards #840
 * and #1135, BR-MONETIZACAO-085 item 2.
 *
 * A friend shared a link; this page shows who invited (the @ only,
 * BR-USUARIO-042), the @ or the code with a Copy button, the stores and the
 * preview of what happens in the app (DS-COMPONENTE-117). The link itself is
 * not an attribution: the invite pasted in the app is (#836 item 1).
 *
 * The only thing it may say to the friend is "join @fulano's caravan"
 * (BR-MONETIZACAO-085, ceiling 1): no hours, no gain, of anybody.
 *
 * Rendered per request and never cached: whether an invite is valid is the
 * database's answer at the time of the visit, and the preview depends on the
 * user agent of the request. Two states only — valid, or the same page without
 * the invite and the preview; an unknown @, an @ without an owner and an
 * invalid code all get that one (item 2.b). There is no "exhausted" state for
 * the friend (#836, update of 2026-10-04). One exception, #1305: an explicit
 * `@` that is no invite but has a public page (a creator, a partner) goes to
 * that page instead.
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
  const description = invite.status === "valid" ? t("lead") : t("metaDescInactive");
  // Only an invite the database vouched for is echoed back, and in its
  // canonical form; a dead segment is whatever someone typed, and it does not
  // belong in the card's tags.
  const url = invite.status === "valid" ? `${SITE_URL}${invitePath(invite)}` : undefined;

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

/**
 * The name of a segment that carries an explicit `@`, decoded, or null. A
 * segment without one is a code and nothing else: the page never turns a code
 * into somebody's @ (BR-MONETIZACAO-085 item 2.b), so a code that happens to be
 * a slug is not looked up as a page.
 */
function explicitNameOf(segment: string): string | null {
  try {
    const decoded = decodeURIComponent(segment).trim();
    return decoded.startsWith("@") ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Where `/c/@nome` goes when the @ is no invite of this programme but has a
 * public page: a creator or a partner (#1305). The partner's @ only
 * attributes (BR-MONETIZACAO-085 item 15), so the page that welcomes the
 * friend is the partner's own. Temporary, because both answers are the
 * database's at the time of the visit. Null keeps the inactive page.
 */
async function partnerPageHrefOf(segment: string): Promise<string | null> {
  const name = explicitNameOf(segment);
  if (!name) return null;
  try {
    const page = await resolvePublicPage(name);
    if (page.state === "page") return `/@${encodeURIComponent(page.name)}`;
    if (page.state === "redirect") return `/@${encodeURIComponent(page.to)}`;
    return null;
  } catch (error) {
    // The resolver failing must not take the invite page down with it: the
    // friend still gets the inactive page and the stores. The name is not
    // logged, it is a per-user identifier.
    console.error("invite page: resolve_public_page failed", error instanceof Error ? error.message : error);
    return null;
  }
}

export default async function ReferralInvitePage({ params }: { params: Params }) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Referral");
  const [invite, requestHeaders] = await Promise.all([getReferralInvite(code), headers()]);
  const isValid = invite.status === "valid";
  if (!isValid) {
    const partnerHref = await partnerPageHrefOf(code);
    if (partnerHref) redirect(partnerHref);
  }
  const shared = isValid ? invite.shared : undefined;
  // Decides what the page shows, never what goes to the pasteboard.
  const platform = storePlatformOf(requestHeaders.get("user-agent"));
  const onComputer = platform === "other";

  const badges = (
    <ReferralStoreBadges
      shared={shared}
      playStoreUrl={invitePlayStoreUrl(shared)}
      compact={isValid && onComputer}
    />
  );

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
              className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight leading-tight break-words"
            >
              {t("invitedBy", { nickname: invite.nickname })}
            </h1>
            <p className="text-lg text-tuggi-slate leading-relaxed">{t("lead")}</p>
            <ReferralCopyCode shared={invite.shared} via={invite.via} />
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

        <section
          data-testid="referral-stores"
          aria-labelledby="referral-stores-title"
          className="w-full mt-10 flex flex-col items-center gap-4"
        >
          <h2 id="referral-stores-title" className="text-base font-bold text-tuggi-dark">
            {isValid ? t("getAppAfterCode") : t("getApp")}
          </h2>
          {/* On a computer the QR takes the badges' place and they go under it,
              smaller (DS-COMPONENTE-117): the phone is where the app goes. */}
          {isValid && onComputer && <AppPreviewQr url={`${SITE_URL}${invitePath(invite)}`} />}
          {badges}
        </section>

        {/* The preview replaces the old "how it works" steps, which promised
            the friend hours (ceiling 1). No invite, no preview. */}
        {isValid && (
          <div className="w-full mt-12">
            <AppPreview
              platform={platform}
              invite={{ kind: "friend", nickname: invite.nickname, shared: invite.shared }}
            />
          </div>
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
