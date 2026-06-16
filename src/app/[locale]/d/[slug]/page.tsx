import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import {
  getCouponBySlug,
  getPartnerBySlug,
  type CouponContext,
  type PartnerData,
} from "@/lib/partner";
import { resolveWelcomeLang } from "@/lib/ptDialect";
import { buildTwitterCard, defaultRobots } from "@/lib/seo";

const OG_IMAGE = "/images/og-image-tuggi.jpg";

function clamp(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/**
 * Resolves the welcome AUDIO/TEXT dialect from the request (geo, ?lang, cookie),
 * decoupled from the unified "pt" UI locale — so a visitor in Portugal hears
 * pt-pt and in Brazil pt-br even though the UI is a single "pt".
 */
async function resolveDbLang(locale: string, langParam?: string | null): Promise<string> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return resolveWelcomeLang(locale, {
    langParam,
    country: h.get("x-vercel-ip-country"),
    acceptLanguage: h.get("accept-language"),
    cookie: c.get("NEXT_LOCALE")?.value,
  });
}

/**
 * Resolves a /d/<slug> URL in two passes:
 *   1. Coupon code (UPPERCASE convention: WEBSUMMIT26). Returns the owner +
 *      coupon metadata so the page renders the redeem block.
 *   2. Partner slug (lowercase-with-hyphens convention: neymar-jr). Returns
 *      just the owner — existing behaviour.
 * `null` means neither matched and the caller should 404.
 */
async function resolvePartnerOrCoupon(
  slug: string,
  dbLang: string
): Promise<
  | { partner: PartnerData; coupon: CouponContext["coupon"] | null }
  | null
> {
  const coupon = await getCouponBySlug(slug, dbLang);
  if (coupon) return { partner: coupon.partner, coupon: coupon.coupon };

  const partner = await getPartnerBySlug(slug, dbLang);
  if (partner) return { partner, coupon: null };

  return null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { lang } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Download" });
  const dbLang = await resolveDbLang(locale, lang);
  const resolved = await resolvePartnerOrCoupon(slug, dbLang);

  // Unknown slug → the page will 404; keep it out of the index.
  if (!resolved) {
    return { robots: { index: false, follow: false } };
  }

  const { partner } = resolved;

  // The root layout title template already appends " | TUGGI", so use the bare name.
  const title = partner.name && !partner.isTuggi ? partner.name : t("metaTitle");
  const description = partner.description ? clamp(partner.description) : t("metaDesc");

  // The partner page lives at one clean, locale-agnostic URL (no /en, /pt …) —
  // the middleware resolves the language per request, so the canonical is self-referential.
  const canonical = `/d/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: defaultRobots,
    openGraph: {
      title,
      description,
      url: `https://www.tuggi.app/d/${slug}`,
      siteName: "TUGGI",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: partner.name ?? "TUGGI" }],
    },
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function PartnerSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { locale, slug } = await params;
  const { lang } = await searchParams;
  setRequestLocale(locale);

  const dbLang = await resolveDbLang(locale, lang);
  const resolved = await resolvePartnerOrCoupon(slug, dbLang);
  if (!resolved) notFound();

  const { partner, coupon } = resolved;

  return (
    <main>
      <PartnerHeroWrapper
        partnerData={partner}
        partnerId={partner.id}
        coupon={coupon}
      />
    </main>
  );
}
