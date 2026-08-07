import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

/**
 * The closing invitation — block 8 of the partner template and block 4 of the
 * `/partners` hub (spec §2.1 and §6, `docs/design/copy-parcerias-2026-08.md`
 * §3, card #195).
 *
 * **An invitation, not a claim** — `BR-B2B-008` item 1, whose edge case is the
 * whole design of this block: *"talk to us about X"* is an invitation, *"we
 * provide X"* is a claim. So the copy enumerates nothing. No co-branding, no
 * package, no "other conditions", no "models on request": an invitation that
 * describes what is behind the door becomes the claim `BR-B2B-007` closes the
 * list against, and "other commercial models" on a partnership page describes
 * exactly the wholesale `BR-B2B-009` keeps off the site.
 *
 * **One target, and no embedded form.** The form and its triage already live
 * in `ContactRouter.tsx`; a second one here would be the second implementation
 * of the same decision (CLAUDE.md §6).
 *
 * The button is dark ink on the brand orange — 6.71:1, `DS-COR-004`. On this
 * dark surface the body text is `slate-300` and not `--color-tuggi-slate`,
 * which measures 3.13:1 against `--color-tuggi-dark` and fails SC 1.4.3.
 */
export function SegmentCta() {
  const t = useTranslations("Segments.cta");

  return (
    <section data-block="segment-cta" className="bg-tuggi-dark py-20 lg:py-24">
      <div className="page-shell">
        <div className="max-w-2xl flex flex-col items-start gap-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed">{t("body")}</p>
          <Link
            href="/contact"
            className="mt-4 px-8 py-4 bg-tuggi-secondary text-tuggi-dark font-semibold rounded-md shadow-sm hover:bg-tuggi-secondary-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tuggi-dark w-full sm:w-auto text-center"
          >
            {t("action")}
          </Link>
        </div>
      </div>
    </section>
  );
}
