import { getTranslations } from "next-intl/server";
import { DataDeletionForm } from "@/components/forms/DataDeletionForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("deletionTitle"),
    description: t("deletionDescription"),
  };
}

export default async function DataDeletionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.DataDeletion" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600">
      <h1>{t("title")}</h1>
      
      <p>{t("intro")}</p>

      <div className="not-prose bg-slate-50 p-8 rounded-xl border border-slate-200 my-10">
        <h3 className="text-lg font-bold text-tuggi-dark mb-2">{t("formTitle")}</h3>
        <p className="text-slate-600 mb-6 text-sm">
          {t("formDesc")}
        </p>
        
        <DataDeletionForm />
      </div>

      <section>
        <h2>{t("s1Title")}</h2>
        <p>{t("s1Desc")}</p>
        <ul>
          <li>{t("s1Item1")}</li>
          <li>{t("s1Item2")}</li>
          <li>{t("s1Item3")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s2Title")}</h2>
        <p>{t("s2Desc")}</p>
      </section>
    </article>
  );
}
