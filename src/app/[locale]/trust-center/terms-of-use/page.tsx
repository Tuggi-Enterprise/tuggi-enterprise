import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("termsTitle"),
    description: t("termsDescription"),
  };
}

export default async function TermsOfUsePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.Terms" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark prose-a:text-tuggi-primary">
      <h1>{t("title")}</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">
        {t("lastUpdated")}
      </p>

      <p>{t("intro")}</p>
      
      <section>
        <h2>{t("s1Title")}</h2>
        <ul>
          <li>{t.rich("s1Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-red-600">{t("s2Title")}</h2>
        <ul>
          <li>{t.rich("s2Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s2Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t("s2Item3")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s3Title")}</h2>
        <ul>
          <li>{t.rich("s3Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s3Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s4Title")}</h2>
        <p>{t("s4Text")}</p>
      </section>

      <section>
        <h2>{t("s5Title")}</h2>
        <p>{t("s5Text")}</p>
      </section>

      <section>
        <h2>{t("s6Title")}</h2>
        <ul>
          <li>{t("s6Item1")}</li>
          <li>{t.rich("s6Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s6Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s7Title")}</h2>
        <p>{t("s7Text")}</p>
      </section>
    </article>
  );
}
