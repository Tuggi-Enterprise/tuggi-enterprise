import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("securityTitle");
  const description = t("securityDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "trust-center/security-sla"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath: "trust-center/security-sla" }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function SecuritySLAPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Legal.Security" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-tuggi-dark">
      <h1>{t("title")}</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-tuggi-slate !mb-8 border-b border-gray-100 pb-4">
        {t("subtitle")}
      </p>

      {/* The intro guaranteed that the architecture delivers the cultural
          narrative accurately. Legal.Terms.s3Item2 says the opposite in the
          contract — the narration is AI-assisted and carries no warranty of
          accuracy — and no rule backs a delivery guarantee. Two published texts
          cannot disagree about the same fact; the one with no rule is the one
          that goes. */}

      <section>
        <h2>{t("s1Title")}</h2>
        <p>{t("s1Desc")}</p>
      </section>

      {/* Both of these used to be a <ul> holding a single <li>. The other
          items were removed with the claims behind them; what survived is one
          statement, and a list marker next to one item announces that
          something used to be there. A single item is a paragraph — the
          <strong> lead survives inline. (SC 1.3.1: the markup now says what
          the content is.) */}
      <section>
        <h2>{t("s2Title")}</h2>
        <p>{t.rich("s2Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</p>
      </section>

      <section>
        <h2>{t("s3Title")}</h2>
        <p>{t("s3Intro")}</p>
        <p>{t.rich("s3Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</p>
      </section>

      <section>
        <h2>{t("s4Title")}</h2>
        <p>{t("s4Desc")}</p>
      </section>
    </article>
  );
}
