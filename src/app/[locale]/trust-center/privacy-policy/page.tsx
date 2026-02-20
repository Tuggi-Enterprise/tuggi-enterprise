import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  };
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.Privacy" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark prose-a:text-tuggi-primary">
      <h1>{t("title")}</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">
        {t("lastUpdated")}
      </p>

      <p>{t("intro")}</p>

      <section>
        <h2>{t("s1Title")}</h2>
        <p>{t("s1Intro")}</p>
        <ul>
          <li>{t.rich("s1Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s1Item3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s2Title")}</h2>
        <ul>
          <li>{t.rich("s2Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich("s2Item2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s3Title")}</h2>
        <ul>
          <li>{t.rich("s3Item1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t("s3Item2")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s4Title")}</h2>
        <ul>
          <li>{t("s4Item1")}</li>
          <li>{t("s4Item2")}</li>
        </ul>
      </section>

      <section>
        <h2>{t("s5Title")}</h2>
        <p>{t("s5Intro")}</p>
        <ul>
          <li>{t("s5Item1")}</li>
          <li>{t("s5Item2")}</li>
          <li>
            {t.rich("s5ItemO1", { strong: (chunks) => <strong>{chunks}</strong> })}
            <Link href="/trust-center/data-deletion">{t("s5ItemO2")}</Link>
            {t("s5ItemO3")}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t("s6Title")}</h2>
        <p>
          {t("s6P1")}
          <Link href="/contact">{t("s6P2")}</Link>
          {t("s6P3")}
        </p>
      </section>
    </article>
  );
}
