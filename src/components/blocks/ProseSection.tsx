import { getTranslations } from "next-intl/server";

/**
 * SEO/context prose block: an <h2> + N paragraphs from an i18n namespace.
 * Server component with plain, un-animated text so it is unambiguously in the
 * crawled HTML (indexable and easy for AI engines to read/cite). Reused for the
 * home "What is TUGGI" and the /drive "How the plans work" blocks.
 */
export async function ProseSection({
  namespace,
  paragraphs = 3,
}: {
  namespace: string;
  paragraphs?: number;
}) {
  const t = await getTranslations(namespace);

  return (
    <section className="bg-white py-16 lg:py-20 border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-tuggi-dark tracking-tight mb-6">
          {t("title")}
        </h2>
        <div className="space-y-4 text-tuggi-slate leading-relaxed">
          {Array.from({ length: paragraphs }, (_, i) => (
            <p key={i}>{t(`p${i + 1}`)}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
