import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { SegmentHero } from "@/components/blocks/SegmentHero";
import { SegmentGrid } from "@/components/blocks/SegmentGrid";
import { PartnershipSteps } from "@/components/blocks/PartnershipSteps";
import { SegmentCta } from "@/components/blocks/SegmentCta";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

/**
 * The partner hub — spec §6 of
 * `docs/design/spec-template-segmento-2026-08.md`, copy in
 * `docs/design/copy-parcerias-2026-08.md` (card #195).
 *
 * Four blocks, and three of them are the template's own: the program's hero,
 * the segment grid, the mechanism and the invitation. **The hub does not
 * repeat coverage, proof or the commercial model** — whoever lands here is
 * choosing which segment he is, and each segment page carries those. Repeating
 * six blocks between a hub and its children makes the visitor think he never
 * left.
 *
 * Every block is a server component: what a crawler and a visitor with no
 * JavaScript get is the whole page (#191). Nothing enters with an animation,
 * so nothing is born at `opacity: 0` in the served HTML (#204).
 *
 * **The hero has no call to action, and that is the copy document's decision**
 * (§1.1): the question this screen asks is *"which of these am I?"*, and the
 * answer is the grid directly below it. A button to /contact above the grid
 * collects the lead of somebody who has not qualified himself yet.
 *
 * Metadata reads `Partners.seo.*` exclusively — no `|| t('Metadata...')`
 * fallback anywhere (spec §7.1). A missing key does not break a next-intl
 * build, so a fallback would not surface as an error; it would surface as five
 * partner pages sharing one generic description, which is how a site
 * cannibalizes itself without noticing.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Partners" });

  const title = t("seo.title");
  const description = t("seo.description");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "/partners"),
    robots: defaultRobots,
    // No own OG image: the default is the brand lockup, whose accessible name
    // is already "TUGGI". A share card for this page is its own card, and the
    // alt key is born with the artwork rather than before it (copy doc §1.6).
    openGraph: buildOpenGraph({ title, description, locale, pagePath: "/partners" }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Partners" });

  return (
    <article className="min-h-screen">
      <SegmentHero title={t("hero.title")} subtitle={t("hero.subtitle")} />
      <SegmentGrid />
      <PartnershipSteps place={t("mechanism.place")} />
      <SegmentCta />
    </article>
  );
}
