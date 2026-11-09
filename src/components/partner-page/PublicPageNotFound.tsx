import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AppDownloadButton } from "@/components/blocks/AppDownloadButton";

/**
 * The one answer for every name without a page — BR-B2B-067 item 5: an @ that
 * does not exist, a regular user's, a deleted account's, one removed by
 * moderation, a creator whose flag is off. Same body, same 404, a way to the
 * app, and no capture: it does not say whether the name ever existed nor whose
 * it was, so it cannot be used to find out who has a Tuggi account.
 *
 * It names only what the visitor typed, which they already know.
 */
export async function PublicPageNotFound({ handle }: { handle: string | null }) {
  const t = await getTranslations("PartnerPage");
  return (
    <main data-partner-page="not-found" className="min-h-[70vh] flex items-center justify-center bg-white px-6 py-16">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-tuggi-bg">
          <Compass aria-hidden="true" className="h-10 w-10 text-tuggi-slate" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-tuggi-dark break-words">
          {t("notFoundTitle", { handle: handle ?? "" })}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-tuggi-slate">{t("notFoundBody")}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <AppDownloadButton
            eventLabel="partner_page_not_found"
            className="px-8 py-3 rounded-xl bg-tuggi-secondary text-tuggi-dark font-bold hover:bg-tuggi-secondary-hover transition-colors"
          >
            {t("notFoundCta")}
          </AppDownloadButton>
          <Link
            href="/"
            className="px-8 py-3 rounded-xl border border-tuggi-border/40 text-tuggi-dark font-semibold hover:bg-tuggi-bg transition-colors"
          >
            {t("notFoundHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
