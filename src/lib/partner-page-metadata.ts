import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildTwitterCard, defaultRobots } from "@/lib/seo";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import { SITE_URL } from "@/lib/app-meta";
import type { PartnerData } from "@/lib/partner";
import { creatorTitleOf, type CreatorPage } from "@/lib/public-page";

const OG_IMAGE = "/images/og-image-tuggi.jpg";

function clamp(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/**
 * The metadata of a place or client page. `canonical` is `/@nome` when the
 * resolver knows the page (BR-B2B-037 item 1: the canonical address), and the
 * `/d/` address otherwise (a coupon, a slug the resolver does not answer).
 * The share card stays at `/d/{slug}/opengraph-image`, the one that is
 * pre-rendered.
 */
export async function clientPageMetadata(
  locale: string,
  partner: PartnerData,
  slug: string,
  canonical: string
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Download" });
  // The root layout title template already appends " | TUGGI", so use the bare name.
  const title = partner.name && !partner.isTuggi ? partner.name : t("metaTitle");
  const description = partner.description ? clamp(partner.description) : t("metaDesc", PRODUCT_FACTS);

  // A partner with a seal gets the generated card (d/[slug]/opengraph-image.tsx),
  // which draws the seal next to the name. The URL is written out because
  // config-based metadata wins over the opengraph-image file convention.
  const ogImage = partner.logoUrl ? `/d/${encodeURIComponent(slug)}/opengraph-image` : OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    robots: defaultRobots,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      siteName: "TUGGI",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: partner.name ?? "TUGGI" }],
    },
    twitter: buildTwitterCard({ title, description, image: ogImage }),
  };
}

/** The metadata of a creator page: indexable, canonical at `/@nome` (DS-COMPONENTE-110). */
export async function creatorPageMetadata(locale: string, page: CreatorPage): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "PartnerPage" });
  // The share card follows the page: the authorized name, or the @ (BR-B2B-067 item 2.b).
  const name = creatorTitleOf(page);
  const title = t("metaTitleCreator", { name });
  const description = page.bio ? clamp(page.bio) : t("metaDescCreator", { name });
  const canonical = `/@${page.name}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: defaultRobots,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      siteName: "TUGGI",
      type: "profile",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: name }],
    },
    twitter: buildTwitterCard({ title, description, image: OG_IMAGE }),
  };
}

/**
 * Every name without a page gets this, identical in all five cases
 * (BR-B2B-067 item 5): out of the index, and nothing about the name.
 */
export async function notFoundPageMetadata(locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Download" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}
