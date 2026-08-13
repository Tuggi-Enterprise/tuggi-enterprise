import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { SegmentHero } from "@/components/blocks/SegmentHero";
import { SegmentGrid } from "@/components/blocks/SegmentGrid";
import { ProofBlock } from "@/components/blocks/ProofBlock";
import { PartnershipSteps } from "@/components/blocks/PartnershipSteps";
import { CoverageDensityMap } from "@/components/blocks/CoverageDensityMap";
import { LanguagesStrip } from "@/components/blocks/LanguagesStrip";
import { FaqSection } from "@/components/blocks/FaqSection";
import { PartnerLeadForm } from "@/components/blocks/PartnerLeadForm";
import { PartnerVideo } from "@/components/blocks/PartnerVideo";
import { LEAD_FORM_ANCHOR } from "@/lib/lead-form";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";
import { getCoverageData } from "@/lib/coverage";
import { PRODUCT_FACTS } from "@/lib/product-facts";
import { getStateHubPaths } from "@/lib/routes";
import {
  PARTNER_VIDEOS,
  initialPartnerVideo,
  narrationLanguageLabel,
} from "@/lib/partner-videos";

/**
 * The partner hub, as a conversion landing page —
 * `docs/design/spec-lp-parcerias-conversao-2026-08.md` (card #306), which
 * supersedes `docs/design/spec-lp-parcerias-2026-08.md` (#294) only in what its
 * §0.2 lists: the form, the privacy copy and criteria 13 to 29 of the older
 * document are untouched. Both are the second round of §6 of
 * `docs/design/spec-template-segmento-2026-08.md` and of
 * `docs/design/copy-parcerias-2026-08.md` (#195), which stay in force for the
 * **segment template**; for the hub, what governs is the newer document.
 *
 * **The axis of the page is the merchant's gain, not the mechanism.** The H1 is
 * an imperative invitation — *appear to the traveller who is already on your
 * street* — and appearing is `BR-MONETIZACAO-056`, free to every traveller in
 * every state, which is why the headline needs no caveat to be conforming. The
 * subtitle is the ladder `BR-B2B-015` items 1 and 2 draw: **every** Tuggi
 * traveller finds and reads the partner's place; the one with the guide on
 * hears it, because automatic triggering is a paid-tier right
 * (`BR-MONETIZACAO-055`). Collapsing those two steps into one is the way this
 * page publishes a claim the product does not keep.
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
 * (spec §2): what he gains, the proof of the sentence that says it, who it is
 * for, the mechanism that carries all of BR-B2B-010, the two objections that
 * disqualify by geography and by language, the six that disqualify by money,
 * effort and risk, and then the ask. `ProofBlock` came up from third to second
 * for one reason: the H1 states a fact and the mapped points are its evidence,
 * and at 390 px the third position put that evidence outside the two screens
 * where the attention is.
 *
 * **Block 7 answers by rule, and one answer is load-bearing.** `Partners.FAQ.a4`
 * — the QR Code, the attributed traveller and the revenue share do not depend
 * on the venue getting into the catalogue — is `BR-B2B-010` item 7: no surface
 * may state half 2 without half 1 being legible on the same page. If that
 * answer disappears the page stops conforming even with everything else green.
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

/**
 * The six objections of block 7, in funnel order, ending in money — spec §5.5.
 * One declaration feeds the accordion and the JSON-LD, so the structured data
 * cannot claim a question the page does not render.
 */
const PARTNER_FAQ_COUNT = 6;
const PARTNER_FAQ_ITEMS = Array.from({ length: PARTNER_FAQ_COUNT }, (_, index) => index + 1);

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

  // The clip lives inside the hero now, so an empty registry has exactly one
  // effect and no rhythm depends on it: no `media`, single column, the hero of
  // today. The registry is empty on purpose — see src/lib/partner-videos.
  const initial = initialPartnerVideo(PARTNER_VIDEOS, locale);
  const media = initial ? (
    <PartnerVideo
      initialId={initial.id}
      videos={PARTNER_VIDEOS.map((video) => ({
        ...video,
        // Resolved here, on the server, with the page's locale — the browser's
        // ICU data never gets a chance to disagree with the build's.
        languageLabel: narrationLanguageLabel(locale, video.audioLocale),
      }))}
    />
  ) : undefined;

  // Built from the very keys block 7 renders, so a question that changes in
  // i18n cannot leave a stale copy of itself in the structured data.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": PARTNER_FAQ_ITEMS.map((i) => ({
      "@type": "Question",
      "name": t(`FAQ.q${i}`),
      "acceptedAnswer": { "@type": "Answer", "text": t(`FAQ.a${i}`, PRODUCT_FACTS) },
    })),
  };

  return (
    <article className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SegmentHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        cta={{ label: t("cta.action"), href: LEAD_FORM_ANCHOR }}
        media={media}
      />
      {/* Adjacent to the sentence it proves, and inside the two screens where
          74% of the viewing time is spent (spec §1.3). */}
      <ProofBlock surface="dark" />
      <SegmentGrid lead={t("grid.lead")} />
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
      {/* Where the conditions of BR-B2B-010 moved to, and why `s4Body` went
          from a hundred-odd words to fifty: an objection belongs where it is
          asked, not inside the step that describes the mechanism (spec §1.5). */}
      <FaqSection namespace="Partners.FAQ" count={PARTNER_FAQ_COUNT} analyticsId="partners" />
      <PartnerLeadForm title={t("form.title")} body={t("form.body")} />
    </article>
  );
}
