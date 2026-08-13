import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { buildAlternates, buildOpenGraph, buildTwitterCard, defaultRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const title = t("privacyTitle");
  const description = t("privacyDescription");

  return {
    title,
    description,
    alternates: buildAlternates(locale, "trust-center/privacy-policy"),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath: "trust-center/privacy-policy" }),
    twitter: buildTwitterCard({ title, description }),
  };
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Legal.Privacy" });

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark prose-a:text-tuggi-primary-text">
      <h1>{t("title")}</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-tuggi-slate !mb-8 border-b border-gray-100 pb-4">
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
          {/* The fourth category, and it ships in the same release as the field
              that collects it — BR-USUARIO-028 item 1: a surface does not
              collect a category the published policy does not declare. What it
              has to say is fixed by BR-USUARIO-029 block (A): the purpose, the
              two channels (the phone call included), the limit of the cycle and
              the way out. Card #294. */}
          <li>{t.rich("s1Item4", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
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
          {/* BR-USUARIO-029 item 6: whoever left a contact in a form on this
              site never had an account, so there is nothing for
              /trust-center/data-deletion to delete — and until this item the
              page pointed there and nowhere else. One key for the address, used
              as both the label and the href, so the two cannot drift apart. */}
          <li>
            {t.rich("s5ItemLead1", { strong: (chunks) => <strong>{chunks}</strong> })}
            <a href={`mailto:${t("s5ItemLeadEmail")}`}>{t("s5ItemLeadEmail")}</a>
            {t("s5ItemLead2")}
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

      <section>
        <h2>{t("s7Title")}</h2>
        <p>{t("s7Text")}</p>
      </section>
    </article>
  );
}
