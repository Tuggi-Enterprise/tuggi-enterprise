import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("accessibilityTitle"),
    description: t("accessibilityDescription"),
  };
}

export default async function AccessibilityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.Accessibility" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600">
      <h1>{t("title")}</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">
        {t("subtitle")}
      </p>

      <p>{t("intro")}</p>

      <section>
        <h2>{t("s1Title")}</h2>
        <p>{t("s1Intro")}</p>
        <ul>
          <li>{t.rich("s1Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s2Title")}</h2>
        <p>{t("s2Intro")}</p>
        <ul>
          <li>{t.rich("s2Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s2Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s2Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s3Title")}</h2>
        <p>{t("s3Intro")}</p>
        <ul>
          <li>{t.rich("s3Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s3Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p>
          <a href={`mailto:${t("contactEmail")}`} className="text-tuggi-primary font-bold hover:underline">
            {t("contactEmail")}
          </a>
        </p>
      </section>
    </article>
  );
}
