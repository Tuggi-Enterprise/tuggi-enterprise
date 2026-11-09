import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

const PAGE_PATH = "trust-center/third-party-licenses";

/** Where the work and its license live: the attribution CC BY 4.0 asks for (section 3(a)). */
const LDNOOBW_REPOSITORY = "https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words";
const CC_BY_4_0 = "https://creativecommons.org/licenses/by/4.0/";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("licensesTitle");
  const description = t("licensesDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, PAGE_PATH),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath: PAGE_PATH }),
    twitter: buildTwitterCard({ title, description }),
  };
}

/**
 * Third-party licenses of the site, BR-USUARIO-051 item 8: the credit of the
 * LDNOOBW list, which the name and @ filter of the app reads (item 2). The
 * work's name, its authorship as the repository declares it, the link to the
 * repository and to CC BY 4.0, and the note that the list was modified.
 */
export default async function ThirdPartyLicensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Legal.Licenses" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark">
      <h1>{t("title")}</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-tuggi-slate !mb-8 border-b border-gray-100 pb-4">
        {t("subtitle")}
      </p>
      <p>{t("intro")}</p>

      <section data-testid="license-ldnoobw">
        <h2>{t("ldnoobwTitle")}</h2>
        <p>{t("ldnoobwAuthor")}</p>
        <p>{t("ldnoobwUse")}</p>
        <p>{t("ldnoobwChanges")}</p>
        <p>
          <a href={LDNOOBW_REPOSITORY} target="_blank" rel="noopener noreferrer">
            {t("repositoryLink")}
          </a>
          {" · "}
          <a href={CC_BY_4_0} target="_blank" rel="noopener noreferrer license">
            {t("licenseLink")}
          </a>
        </p>
      </section>
    </article>
  );
}
