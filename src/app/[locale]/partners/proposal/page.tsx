import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { PartnerProposalForm } from "@/components/partner-proposal/PartnerProposalForm";
import { PROPOSAL_LOCALE, proposalIsReachable } from "@/lib/partner-proposal/link";
import { localizedPathname } from "@/i18n/pathnames";
import ptMessages from "@/messages/pt.json";

/**
 * The partnership proposal — the public form an establishment fills in after talking to the
 * Tuggi, and, from #396, the one it can also reach from `/partners`.
 *
 * It used to be `tuggi-cms/app/[locale]/parceria/page.tsx`. The conference, the promotion and
 * the contract stay in the CMS, authenticated (BR-B2B-026, items 1 and 4); only the door the
 * merchant sees changed house, and the old address answers 301.
 *
 * ONE LANGUAGE, AND IT IS A PRODUCT FACT. The form asks for a CNPJ with a check digit, a
 * Brazilian UF and an eight-digit CEP, so an establishment reading the site in Italian cannot
 * finish it — the route is declared in all four locales because `pathnames` is typed
 * `Record<SiteLocale, string>` and does not take half a route, but the page answers in `pt` and
 * sends the other three there. `DS-COMPONENTE-026`.
 *
 * The redirect is TEMPORARY (307) and not permanent, deliberately. "Only `pt`" is a decision the
 * spec itself calls reversible — accepting an establishment outside Brazil changes the fields
 * before it changes the copy, and it is the operator's to make. A 308 is cached by the browser
 * for as long as it likes, so the day the other three are published the people who already
 * knocked would never see them.
 *
 * NOINDEX, AND NO `alternates`. The proposal is not a page we want a stranger to find in a
 * search result, and hreflang on a `noindex` page is a contradictory signal — three of the four
 * would point at a redirect anyway. It is not in `src/app/sitemap.ts` either.
 *
 * THE MESSAGES ARE PINNED TO `pt`, for the same reason the CMS pinned its own: the copy of this
 * surface exists in `pt` and only in `pt` (spec §1.1, option A — 339 strings for a form the
 * foreigner cannot send is work thrown away). An ABSENT key in next-intl renders THE KEY NAME on
 * screen, so the provider hands this subtree the Portuguese messages explicitly instead of
 * relying on the visitor's locale, and `tests/e2e/partner-proposal.spec.ts` asserts that the
 * namespace exists in `pt.json` and in no other locale.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params;
  // Always `pt`: the page serves one locale, so its title does too. Reading the visitor's locale
  // here would ask `en.json` for a namespace that is deliberately not in it.
  const t = await getTranslations({ locale: PROPOSAL_LOCALE, namespace: "PartnerProposal" });

  return {
    title: t("seo.title"),
    description: t("seo.description"),
    robots: { index: false, follow: false },
    // Declared EMPTY, and it has to be declared: Next merges `alternates` from the layout, whose
    // value is the home page's, so leaving it out does not mean "no alternates" — it means four
    // `hreflang` tags pointing at `/en`, `/es`, `/pt` and `/it`, plus a canonical claiming this
    // page is the home page. `/unsubscribe` hit the same trap and fixed it by declaring its own.
    alternates: { canonical: null, languages: {} },
  };
}

export default async function PartnerProposalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!proposalIsReachable(locale)) {
    redirect(`/${PROPOSAL_LOCALE}${localizedPathname(PROPOSAL_LOCALE, "/partners/proposal")}`);
  }

  setRequestLocale(locale);

  const tContact = await getTranslations({ locale, namespace: "Contact.Sidebar" });

  return (
    <NextIntlClientProvider
      locale={PROPOSAL_LOCALE}
      messages={{ PartnerProposal: ptMessages.PartnerProposal }}
    >
      {/* The address is not written inside a copy value — it comes from the one key that owns
          it, the same way `Partners.form.noscript` already takes it (DS-COPY-018). */}
      <PartnerProposalForm contactEmail={tContact("pressValue")} />
    </NextIntlClientProvider>
  );
}
