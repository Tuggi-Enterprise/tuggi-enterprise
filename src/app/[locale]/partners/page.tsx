import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { SegmentHero } from "@/components/blocks/SegmentHero";
import { SegmentGrid } from "@/components/blocks/SegmentGrid";
import { ProofBlock } from "@/components/blocks/ProofBlock";
import { PartnershipSteps } from "@/components/blocks/PartnershipSteps";
import { CoverageDensityMap } from "@/components/blocks/CoverageDensityMap";
import { LanguagesStrip } from "@/components/blocks/LanguagesStrip";
import { PartnerLeadForm } from "@/components/blocks/PartnerLeadForm";
import { LEAD_FORM_ANCHOR } from "@/lib/lead-form";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";
import { getCoverageData } from "@/lib/coverage";
import { getStateHubPaths } from "@/lib/routes";
import { PARTNER_VIDEOS } from "@/lib/partner-videos";

/**
 * The partner hub, as a conversion landing page —
 * `docs/design/spec-lp-parcerias-2026-08.md` (card #294). It is the second
 * round of §6 of `docs/design/spec-template-segmento-2026-08.md` and of
 * `docs/design/copy-parcerias-2026-08.md` (#195), which stay in force for the
 * **segment template**; for the hub, what governs is the newer document.
 *
 * **The page has one destination.** The hero, the six cards and the band under
 * the mechanism all point at the form at the bottom — spec §0.1. The grid
 * stopped being navigation: with every segment unpublished its cards used to
 * open `/contact`, whose three triage cards are *City / Government*,
 * *Fleets / Rentals* and *Traveller*, so a restaurant owner who clicked
 * "Restaurants" landed where none of the three is him. `SegmentCta` is
 * therefore **not** mounted here: a second target divides the funnel.
 *
 * **The order of the blocks answers questions in the order they are asked**
 * (spec §2): what this is, who it is for, proof before argument, the mechanism
 * that carries all of BR-B2B-010, then the two objections that actually
 * disqualify — *"is there anything in my city?"* and *"my guest is French, does
 * it work for him?"* — and then the ask.
 *
 * **No figure is written here** — not even in this comment, which the sweep of
 * `tests/e2e/product-facts.spec.ts` reads too. `ProofBlock` publishes the
 * mapped points, the countries, the guides and the languages straight out of
 * `src/lib/product-facts.ts`, and that is what keeps the country count next to
 * **mapped points** and never next to a content noun (BR-COMUNICACAO-002 items
 * 8 and 9).
 *
 * Every block is a server component except the form; what a crawler and a
 * visitor with no JavaScript get is the whole page, form included (#191), and
 * nothing is born at `opacity: 0` in the served HTML (#204).
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
  const tSegments = await getTranslations({ locale, namespace: "Segments" });
  const coverage = await getCoverageData();

  // One condition, two effects, one place (spec §4.1): with no video there is
  // no video block and no secondary call to action — and no space held for
  // either. Today the registry is empty on purpose; see src/lib/partner-videos.
  const hasVideo = PARTNER_VIDEOS.length > 0;

  return (
    <article className="min-h-screen">
      <SegmentHero
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        cta={{ label: t("cta.action"), href: LEAD_FORM_ANCHOR }}
        secondary={hasVideo ? { label: t("cta.video"), href: "#video" } : undefined}
      />
      <SegmentGrid />
      <ProofBlock surface="dark" />
      <PartnershipSteps
        place={t("mechanism.place")}
        lead={tSegments("steps.lead")}
        cta={{ label: t("cta.action"), href: LEAD_FORM_ANCHOR }}
      />
      {/* `detail="countries"`, never `"regions"`: the full list is what
          /coverage is for, and thousands of words between the visitor and the
          form is the page working against itself (spec §2.7). */}
      <CoverageDensityMap
        states={coverage.states}
        tourHubs={getStateHubPaths(locale)}
        detail="countries"
      />
      {/* Dark, because the block above ends in the white list that is its
          served alternative, and two white neighbours read as one (spec §2). */}
      <LanguagesStrip surface="dark" />
      <PartnerLeadForm title={tSegments("cta.title")} body={tSegments("cta.body")} />
    </article>
  );
}
