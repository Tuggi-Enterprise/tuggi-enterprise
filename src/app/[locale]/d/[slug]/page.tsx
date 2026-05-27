import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { getPartnerBySlug } from "@/lib/partner";
import { buildTwitterCard, defaultRobots } from "@/lib/seo";

const OG_IMAGE = "/images/og-image-tuggi.jpg";

function clamp(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "Download" });
  const partner = await getPartnerBySlug(slug, locale);

  // Unknown slug → the page will 404; keep it out of the index.
  if (!partner) {
    return { robots: { index: false, follow: false } };
  }

  const title = partner.name && !partner.isTuggi ? `${partner.name} · TUGGI` : t("metaTitle");
  const description = partner.description ? clamp(partner.description) : t("metaDesc");

  // The partner page lives at one clean, locale-agnostic URL (no /en, /pt-br …) —
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
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const partner = await getPartnerBySlug(slug, locale);
  if (!partner) notFound();

  return (
    <main>
      <PartnerHeroWrapper partnerData={partner} partnerId={partner.id} />
    </main>
  );
}
