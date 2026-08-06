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
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">
        {t("subtitle")}
      </p>

      <p>{t("intro")}</p>

      <section>
        <h2>{t("s1Title")}</h2>
        <p>{t("s1Intro")}</p>
        <ul>
          <li>{t.rich("s1Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s2Title")}</h2>
        <ul>
          <li>{t.rich("s2Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s3Title")}</h2>
        <p>{t("s3Intro")}</p>
        <ul>
          <li>{t.rich("s3Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s3Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s4Title")}</h2>
        <p>{t("s4Desc")}</p>
      </section>
    </article>
  );
}
