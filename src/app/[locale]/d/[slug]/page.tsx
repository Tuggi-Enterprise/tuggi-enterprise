import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { resolvePartnerOrCoupon } from "@/lib/partner";
import { resolveWelcomeLang } from "@/lib/ptDialect";
import { buildTwitterCard, defaultRobots } from "@/lib/seo";
import { PRODUCT_FACTS } from "@/lib/product-facts";

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

  // Unknown slug → the page still serves the plain download LP (see below),
  // and that LP is the same on every dead slug: keep it out of the index.
  if (!resolved) {
    return { robots: { index: false, follow: false } };
  }

  const { partner } = resolved;

  // The root layout title template already appends " | TUGGI", so use the bare name.
  const title = partner.name && !partner.isTuggi ? partner.name : t("metaTitle");
  const description = partner.description
    ? clamp(partner.description)
    : t("metaDesc", PRODUCT_FACTS);

  // The partner page lives at one clean, locale-agnostic URL (no /en, /pt …) —
  // the middleware resolves the language per request, so the canonical is self-referential.
  const canonical = `/d/${slug}`;

  // A partner with a seal gets the generated card (./opengraph-image.tsx), which
  // draws the seal next to the name — the link travels on WhatsApp and Instagram
  // to promote the event, and the generic photo says nothing about who invites.
  // The URL is written out because config-based metadata wins over the
  // opengraph-image file convention: setting `images` here suppresses the
  // generated one, so pointing at it is the only way it ships.
  const ogImage = partner.logoUrl
    ? `/d/${encodeURIComponent(slug)}/opengraph-image`
    : OG_IMAGE;

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
      images: [{ url: ogImage, width: 1200, height: 630, alt: partner.name ?? "TUGGI" }],
    },
    twitter: buildTwitterCard({ title, description, image: ogImage }),
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

  /**
   * A SLUG THAT NO LONGER RESOLVES STILL GETS THE APP — BR-B2B-001.
   *
   * This used to `notFound()`, and the 404 offers the home page and support:
   * no store link anywhere on it. But the person reading it is holding a
   * printed QR in a restaurant — a partner who left, a slug that was renamed,
   * a card printed with a typo — and they wanted the app, not the company.
   * Sending them to a 404 loses the install; the QR only ever attributed, so
   * losing the attribution is not a reason to lose the download too.
   *
   * It renders the plain download page, the same one `/download` serves with
   * no partner: no partner name, no capture, no referrer — nothing is credited
   * to a partner we could not resolve. `generateMetadata` keeps it out of the
   * index, which is what stops `/d/<anything>` from becoming an unbounded
   * surface of thin pages.
   */
  if (!resolved) {
    return (
      <main>
        <PartnerHeroWrapper partnerData={null} />
      </main>
    );
  }

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
